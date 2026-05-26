package main

import (
	"bufio"
	"database/sql"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"sync"
	"time"

	"context"
	"os/signal"
	"os/user"
	"syscall"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/ssh"
)

// ─────────────────────────────────────────────
// Models
// ─────────────────────────────────────────────

type ThemeColors struct {
	Accent       string `json:"accent"`
	TextMain     string `json:"text_main"`
	TextDim      string `json:"text_dim"`
	TerminalText string `json:"terminal_text"`
}

type Settings struct {
	UserName     string      `json:"user_name"`
	GitBashPath  string      `json:"git_bash_path"`
	WorkspaceURL string      `json:"workspace_url"`
	PreDeployCmd string      `json:"pre_deploy_cmd"`
	GoPrivate    string      `json:"go_private"`
	DevAgentURL   string            `json:"dev_agent_url"`
	StgAgentURL   string            `json:"stg_agent_url"`
	FolderAliases map[string]string `json:"folder_aliases"`
	DarkTheme     ThemeColors       `json:"dark_theme"`
	LightTheme    ThemeColors       `json:"light_theme"`
}

type Service struct {
	Name       string                    `json:"name"`
	Dir        string                    `json:"dir"`
	Branch     string                    `json:"branch"`
	LastCommit string                    `json:"last_commit"`
	HasDev     bool                      `json:"has_dev"`
	HasStg     bool                      `json:"has_stg"`
	DevScript  string                    `json:"dev_script"`
	StgScript  string                    `json:"stg_script"`
	HasStash   bool                      `json:"has_stash"`
	Ahead      int                       `json:"ahead"`
	Behind     int                       `json:"behind"`
	Metrics    map[string]ServiceMetrics `json:"metrics,omitempty"` // env -> metrics
}

type ServiceMetrics struct {
	Status      string   `json:"status"`
	PID         string   `json:"pid"`
	Service     string   `json:"service"`
	CPU         string   `json:"cpu"`
	Memory      string   `json:"memory"`
	Uptime      string   `json:"uptime"`
	Threads     int      `json:"threads"`
	Ports       []string `json:"ports"`
	StatsPort   string   `json:"stats_port"`
	BinaryMtime int64    `json:"binary_mtime"`
}

type DeployLog struct {
	UserName    string `json:"user_name"`
	Environment string `json:"environment"`
	Branch      string `json:"branch"`
	CreatedAt   string `json:"created_at"`
	Message     string `json:"message"`
	Status      string `json:"status"`
}

// ─────────────────────────────────────────────
// Configuration & Globals
// ─────────────────────────────────────────────

var (
	basePath string
	settings Settings

	// Database Persistence
	globalDB      *sql.DB
	globalCleanup func()
	dbMu          sync.Mutex
)

func init() {
	err := godotenv.Load()
	if err != nil {
		log.Printf("[Init] Warning: .env file not found, using system environment variables")
	} else {
		log.Printf("[Init] Loaded .env file successfully")
	}

	exePath, err := os.Executable()
	if err != nil {
		basePath = "."
	} else {
		basePath = filepath.Dir(exePath)
	}

	// If running with 'go run', use current directory
	if strings.Contains(strings.ToLower(exePath), "go-build") || strings.Contains(strings.ToLower(exePath), "debug") {
		basePath, _ = os.Getwd()
	}
}

func getSettingsPath() string {
	return filepath.Join(basePath, "settings.json")
}

func loadSettings() Settings {
	s := Settings{
		UserName:     "",
		GitBashPath:  `C:\Program Files\Git\bin\bash.exe`,
		WorkspaceURL: filepath.Dir(basePath),
		PreDeployCmd: "",
		GoPrivate:    "gitlab.com/bship1/*",
		DevAgentURL:  os.Getenv("DEV_AGENT_URL"),
		StgAgentURL:  os.Getenv("STG_AGENT_URL"),
		FolderAliases: make(map[string]string),
		DarkTheme: ThemeColors{
			Accent:       "#f85149",
			TextMain:     "#e6edf3",
			TextDim:      "#7d8590",
			TerminalText: "#3fb950",
		},
		LightTheme: ThemeColors{
			Accent:       "#d73a49",
			TextMain:     "#24292e",
			TextDim:      "#6a737d",
			TerminalText: "#22863a",
		},
	}

	f, err := os.Open(getSettingsPath())
	if err == nil {
		defer f.Close()
		_ = json.NewDecoder(f).Decode(&s)
	}

	// Always fallback to ENV if JSON has empty strings
	if s.DevAgentURL == "" {
		s.DevAgentURL = os.Getenv("DEV_AGENT_URL")
	}
	if s.StgAgentURL == "" {
		s.StgAgentURL = os.Getenv("STG_AGENT_URL")
	}

	return s
}

func saveSettings(s Settings) error {
	f, err := os.Create(getSettingsPath())
	if err != nil {
		return err
	}
	defer f.Close()
	encoder := json.NewEncoder(f)
	encoder.SetIndent("", "    ")
	return encoder.Encode(s)
}

// ─────────────────────────────────────────────
// Database & SSH Logic
// ─────────────────────────────────────────────

// getDB provides a persistent database connection
func getDB() (*sql.DB, error) {
	dbMu.Lock()
	defer dbMu.Unlock()

	if globalDB != nil {
		if err := globalDB.Ping(); err == nil {
			return globalDB, nil
		}
		log.Printf("[DB] Connection lost, reconnecting...")
		if globalCleanup != nil {
			globalCleanup()
		}
		globalDB.Close()
		globalDB = nil
	}

	db, cleanup, err := createDBConnection()
	if err != nil {
		return nil, err
	}
	globalDB = db
	globalCleanup = cleanup
	return globalDB, nil
}

func createDBConnection() (*sql.DB, func(), error) {
	dbHost := strings.TrimSpace(os.Getenv("MYSQL_HOST"))
	if dbHost == "" {
		dbHost = "localhost"
	}
	dbUser := strings.TrimSpace(os.Getenv("MYSQL_USER"))
	if dbUser == "" {
		dbUser = "root"
	}
	dbPwd := strings.TrimSpace(os.Getenv("MYSQL_PASSWORD"))
	dbName := strings.TrimSpace(os.Getenv("MYSQL_DB"))
	if dbName == "" {
		dbName = "deploy_logs"
	}
	dbPort := strings.TrimSpace(os.Getenv("MYSQL_PORT"))
	if dbPort == "" {
		dbPort = "3306"
	}

	appEnv := strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV")))
	if appEnv == "" {
		appEnv = "local"
	}
	useSSH := strings.ToLower(strings.TrimSpace(os.Getenv("USE_SSH"))) == "true" || appEnv == "local"

	log.Printf("[DB] Config: APP_ENV=%s, USE_SSH=%s (effective useSSH=%v)", os.Getenv("APP_ENV"), os.Getenv("USE_SSH"), useSSH)

	var cleanup func() = func() {}

	if useSSH && appEnv == "local" {
		sshHost := strings.TrimSpace(os.Getenv("SSH_HOST"))
		sshPort := strings.TrimSpace(os.Getenv("SSH_PORT"))
		if sshPort == "" {
			sshPort = "22"
		}
		sshUser := strings.TrimSpace(os.Getenv("SSH_USER"))
		sshKey := strings.TrimSpace(os.Getenv("SSH_KEY_PATH"))
		sshPwd := strings.TrimSpace(os.Getenv("SSH_PASSWORD"))

		if sshHost != "" && sshUser != "" {
			log.Printf("[SSH] Connecting to %s:%s as %s...", sshHost, sshPort, sshUser)
			var auth []ssh.AuthMethod
			if sshKey != "" {
				key, err := os.ReadFile(sshKey)
				if err != nil {
					log.Printf("[SSH] Error reading key %s: %v", sshKey, err)
					return nil, cleanup, fmt.Errorf("failed to read SSH key: %v", err)
				}
				signer, err := ssh.ParsePrivateKey(key)
				if err != nil {
					log.Printf("[SSH] Error parsing key %s: %v", sshKey, err)
					return nil, cleanup, fmt.Errorf("failed to parse SSH key: %v", err)
				}
				auth = append(auth, ssh.PublicKeys(signer))
			} else {
				auth = append(auth, ssh.Password(sshPwd))
			}

			sshConfig := &ssh.ClientConfig{
				User:            sshUser,
				Auth:            auth,
				HostKeyCallback: ssh.InsecureIgnoreHostKey(),
				Timeout:         10 * time.Second,
			}

			sshClient, err := ssh.Dial("tcp", net.JoinHostPort(sshHost, sshPort), sshConfig)
			if err != nil {
				log.Printf("[SSH] Dial error: %v", err)
				return nil, cleanup, fmt.Errorf("failed to connect to SSH: %v", err)
			}
			log.Printf("[SSH] Connected successfully")

			localListener, err := net.Listen("tcp", "127.0.0.1:0")
			if err != nil {
				sshClient.Close()
				return nil, cleanup, fmt.Errorf("failed to start local listener for SSH: %v", err)
			}

			localPort := localListener.Addr().(*net.TCPAddr).Port
			log.Printf("[SSH] Local tunnel listener on 127.0.0.1:%d", localPort)

			go func() {
				for {
					localConn, err := localListener.Accept()
					if err != nil {
						return
					}

					log.Printf("[SSH] Tunnel: Accepted local connection, dialing remote %s:%s...", dbHost, dbPort)
					remoteConn, err := sshClient.Dial("tcp", net.JoinHostPort(dbHost, dbPort))
					if err != nil {
						log.Printf("[SSH] Tunnel: Dial remote error: %v", err)
						localConn.Close()
						continue
					}
					log.Printf("[SSH] Tunnel: Connected to remote DB host")

					go func() {
						defer localConn.Close()
						defer remoteConn.Close()
						io.Copy(localConn, remoteConn)
					}()
					go func() {
						defer localConn.Close()
						defer remoteConn.Close()
						io.Copy(remoteConn, localConn)
					}()
				}
			}()

			cleanup = func() {
				log.Printf("[SSH] Closing tunnel and client")
				localListener.Close()
				sshClient.Close()
			}

			dsn := fmt.Sprintf("%s:%s@tcp(127.0.0.1:%d)/%s?parseTime=true", dbUser, dbPwd, localPort, dbName)
			db, err := sql.Open("mysql", dsn)
			return db, cleanup, err
		}
	}

	log.Printf("[DB] Connecting directly to %s:%s...", dbHost, dbPort)
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", dbUser, dbPwd, dbHost, dbPort, dbName)
	db, err := sql.Open("mysql", dsn)
	return db, cleanup, err
}

func logToDB(userName, serviceName, env, branch, message, status string) error {
	db, err := getDB()
	if err != nil {
		return err
	}

	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS deployments (
			id INT AUTO_INCREMENT PRIMARY KEY,
			user_name VARCHAR(100), service VARCHAR(100),
			environment VARCHAR(50), branch VARCHAR(100),
			message TEXT,
			status VARCHAR(50),
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		return err
	}

	// Add status column if not exists (for existing tables)
	var colName string
	err = db.QueryRow("SELECT column_name FROM information_schema.columns WHERE table_name = 'deployments' AND column_name = 'status'").Scan(&colName)
	if err == sql.ErrNoRows {
		log.Printf("[DB] Adding status column to deployments table")
		db.Exec("ALTER TABLE deployments ADD COLUMN status VARCHAR(50) DEFAULT 'Success'")
	}

	_, err = db.Exec(`
		INSERT INTO deployments (user_name, service, environment, branch, message, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, userName, serviceName, env, branch, message, status, time.Now())

	return err
}

// ─────────────────────────────────────────────
// Service Logic
// ─────────────────────────────────────────────

func getBashPath(s Settings) string {
	if runtime.GOOS == "windows" {
		if s.GitBashPath != "" {
			if _, err := os.Stat(s.GitBashPath); err == nil {
				return s.GitBashPath
			}
		}
		standard := `C:\Program Files\Git\bin\bash.exe`
		if _, err := os.Stat(standard); err == nil {
			return standard
		}
		return "bash"
	}
	if path, err := exec.LookPath("bash"); err == nil {
		return path
	}
	return "bash"
}

func getGitPath(s Settings) string {
	if runtime.GOOS == "windows" {
		if s.GitBashPath != "" {
			// e.g. D:\Apps\Git\bin\bash.exe -> D:\Apps\Git\cmd\git.exe
			gitPath := filepath.Join(filepath.Dir(filepath.Dir(s.GitBashPath)), "cmd", "git.exe")
			if _, err := os.Stat(gitPath); err == nil {
				return gitPath
			}
			// Fallback bin\git.exe
			if _, err := os.Stat(gitPath); err == nil {
				return gitPath
			}
		}
		standards := []string{
			`C:\Program Files\Git\cmd\git.exe`,
			`C:\Program Files\Git\bin\git.exe`,
		}
		for _, c := range standards {
			if _, err := os.Stat(c); err == nil {
				return c
			}
		}
	}
	return "git"
}

func ensureGitInPath(s Settings) {
	if runtime.GOOS != "windows" {
		return
	}

	var pathsToCheck []string
	if s.GitBashPath != "" {
		binDir := filepath.Dir(s.GitBashPath)
		cmdDir := filepath.Join(filepath.Dir(binDir), "cmd")
		pathsToCheck = append(pathsToCheck, binDir, cmdDir)
	}
	// Standard paths
	pathsToCheck = append(pathsToCheck, `C:\Program Files\Git\bin`, `C:\Program Files\Git\cmd`)

	currentPath := os.Getenv("PATH")
	pathParts := filepath.SplitList(currentPath)
	pathMap := make(map[string]bool)
	for _, p := range pathParts {
		pathMap[strings.ToLower(filepath.Clean(p))] = true
	}

	updated := false
	for _, p := range pathsToCheck {
		cleanP := filepath.Clean(p)
		if _, err := os.Stat(cleanP); err == nil {
			if !pathMap[strings.ToLower(cleanP)] {
				currentPath = cleanP + string(os.PathListSeparator) + currentPath
				pathMap[strings.ToLower(cleanP)] = true
				updated = true
			}
		}
	}

	if updated {
		os.Setenv("PATH", currentPath)
		log.Printf("[Env] Updated PATH to ensure Git is available")
	}

	if s.GoPrivate != "" {
		os.Setenv("GOPRIVATE", s.GoPrivate)
		log.Printf("[Env] GOPRIVATE set to: %s", s.GoPrivate)
	}
}

func scanServices(s Settings) []Service {
	workspaceURL := s.WorkspaceURL
	gitPath := getGitPath(s)

	var services []Service
	entries, err := os.ReadDir(workspaceURL)
	if err != nil {
		log.Printf("[Scan] Error reading workspace %s: %v", workspaceURL, err)
		return services
	}

	for _, entry := range entries {
		if svc := getServiceInfo(workspaceURL, entry.Name(), gitPath); svc != nil {
			services = append(services, *svc)
		}
		if svcFE := getFrontendServiceInfo(workspaceURL, entry.Name(), gitPath); svcFE != nil {
			services = append(services, *svcFE)
		}
	}

	sort.Slice(services, func(i, j int) bool {
		return services[i].Name < services[j].Name
	})

	return services
}

func getServiceInfo(workspaceURL, name, gitPath string) *Service {
	path := filepath.Join(workspaceURL, name)
	info, err := os.Stat(path)
	if err != nil || !info.IsDir() || strings.HasPrefix(name, ".") {
		return nil
	}

	devScript := ""
	stgScript := ""

	candidates := []string{
		filepath.Join(path, "deploy-dev.sh"),
		filepath.Join(path, "scripts", "deploy-dev.sh"),
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			devScript = c
			break
		}
	}

	candidates = []string{
		filepath.Join(path, "deploy-stg.sh"),
		filepath.Join(path, "scripts", "deploy-stg.sh"),
			}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			stgScript = c
			break
		}
	}

	if devScript == "" && stgScript == "" {
		return nil
	}

	branch := "unknown"
	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = path
	if out, err := cmd.CombinedOutput(); err == nil {
		branch = strings.TrimSpace(string(out))
	}

	lastCommit := ""
	cmd = exec.Command(gitPath, "-c", "safe.directory=*", "log", "-1", "--pretty=%s")
	cmd.Dir = path
	if out, err := cmd.CombinedOutput(); err == nil {
		lastCommit = strings.TrimSpace(string(out))
	}

	hasStash := false
	cmd = exec.Command(gitPath, "-c", "safe.directory=*", "stash", "list")
	cmd.Dir = path
	if out, err := cmd.CombinedOutput(); err == nil {
		if len(strings.TrimSpace(string(out))) > 0 {
			hasStash = true
		}
	}

	ahead := 0
	behind := 0
	// Get ahead/behind count: git rev-list --left-right --count HEAD...@{u}
	cmd = exec.Command(gitPath, "-c", "safe.directory=*", "rev-list", "--left-right", "--count", "HEAD...@{u}")
	cmd.Dir = path
	if out, err := cmd.CombinedOutput(); err == nil {
		parts := strings.Fields(strings.TrimSpace(string(out)))
		if len(parts) == 2 {
			fmt.Sscanf(parts[0], "%d", &ahead)
			fmt.Sscanf(parts[1], "%d", &behind)
		}
	}

	return &Service{
		Name:       name,
		Dir:        path,
		Branch:     branch,
		LastCommit: lastCommit,
		HasDev:     devScript != "",
		HasStg:     stgScript != "",
		DevScript:  devScript,
		StgScript:  stgScript,
		HasStash:   hasStash,
		Ahead:      ahead,
		Behind:     behind,
	}
}

func getFrontendServiceInfo(workspaceURL, name, gitPath string) *Service {
	path := filepath.Join(workspaceURL, name)
	info, err := os.Stat(path)
	if err != nil || !info.IsDir() || strings.HasPrefix(name, ".") {
		return nil
	}

	devScript := ""
	stgScript := ""

	candidates := []string{
		filepath.Join(path, "deploy-front-end-dev.sh"),
		filepath.Join(path, "scripts", "deploy-front-end-dev.sh"),
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			devScript = c
			break
		}
	}

	candidates = []string{
		filepath.Join(path, "deploy-front-end.sh"),
		filepath.Join(path, "scripts", "deploy-front-end.sh"),
		filepath.Join(path, "deploy-front-end-prd.sh"),
		filepath.Join(path, "scripts", "deploy-front-end-prd.sh"),
		filepath.Join(path, "deploy-front-end-stg.sh"),
		filepath.Join(path, "scripts", "deploy-front-end-stg.sh"),
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			stgScript = c
			break
		}
	}

	if devScript == "" && stgScript == "" {
		return nil
	}

	serviceName := name + "-front-end"
	if name == "crm-service" {
		serviceName = "crm-front-end"
	}

	branch := "unknown"
	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = path
	if out, err := cmd.CombinedOutput(); err == nil {
		branch = strings.TrimSpace(string(out))
	}

	lastCommit := ""
	cmd = exec.Command(gitPath, "-c", "safe.directory=*", "log", "-1", "--pretty=%s")
	cmd.Dir = path
	if out, err := cmd.CombinedOutput(); err == nil {
		lastCommit = strings.TrimSpace(string(out))
	}

	hasStash := false
	cmd = exec.Command(gitPath, "-c", "safe.directory=*", "stash", "list")
	cmd.Dir = path
	if out, err := cmd.CombinedOutput(); err == nil {
		if len(strings.TrimSpace(string(out))) > 0 {
			hasStash = true
		}
	}

	ahead := 0
	behind := 0
	cmd = exec.Command(gitPath, "-c", "safe.directory=*", "rev-list", "--left-right", "--count", "HEAD...@{u}")
	cmd.Dir = path
	if out, err := cmd.CombinedOutput(); err == nil {
		parts := strings.Fields(strings.TrimSpace(string(out)))
		if len(parts) == 2 {
			fmt.Sscanf(parts[0], "%d", &ahead)
			fmt.Sscanf(parts[1], "%d", &behind)
		}
	}

	return &Service{
		Name:       serviceName,
		Dir:        path,
		Branch:     branch,
		LastCommit: lastCommit,
		HasDev:     devScript != "",
		HasStg:     stgScript != "",
		DevScript:  devScript,
		StgScript:  stgScript,
		HasStash:   hasStash,
		Ahead:      ahead,
		Behind:     behind,
	}
}

// ─────────────────────────────────────────────
// HTTP Handlers
// ─────────────────────────────────────────────

func indexHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, filepath.Join(basePath, "templates", "index.html"))
}

func settingsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		var s Settings
		if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if err := saveSettings(s); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		ensureGitInPath(s)
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		return
	}

	s := loadSettings()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

var globalMetrics = make(map[string]map[string]ServiceMetrics) // env -> service -> metrics
var metricsMu sync.RWMutex

func startMetricsCollector() {
	ticker := time.NewTicker(5 * time.Second)
	go func() {
		for range ticker.C {
			envs := []string{"Development", "Staging"}
			for _, env := range envs {
				url := ""
				if env == "Development" && os.Getenv("DEV_AGENT_URL") != "" {
					url = os.Getenv("DEV_AGENT_URL") + "/health"
				} else if env == "Staging" && os.Getenv("STG_AGENT_URL") != "" {
					url = os.Getenv("STG_AGENT_URL") + "/health"
				}

				if url == "" {
					continue
				}

				log.Printf("[Metrics] Connecting to %s agent at: %s", env, url)

				go func(e, u string) {
					client := http.Client{Timeout: 3 * time.Second}
					resp, err := client.Get(u)
					if err != nil {
						return
					}
					defer resp.Body.Close()

					var metrics []ServiceMetrics
					if err := json.NewDecoder(resp.Body).Decode(&metrics); err == nil {
						metricsMu.Lock()
						if globalMetrics[e] == nil {
							globalMetrics[e] = make(map[string]ServiceMetrics)
						}
						// Clear old and set new
						newMap := make(map[string]ServiceMetrics)
						for _, m := range metrics {
							newMap[m.Service] = m
						}
						globalMetrics[e] = newMap
						metricsMu.Unlock()
					}
				}(env, url)
			}
		}
	}()
}

func servicesHandler(w http.ResponseWriter, r *http.Request) {
	s := loadSettings()
	services := scanServices(s)

	results := make([]Service, 0)
	for _, svc := range services {
		metricsMu.RLock()
		svc.Metrics = make(map[string]ServiceMetrics)
		
		lookupName := svc.Name
		if alias, ok := s.FolderAliases[lookupName]; ok && alias != "" {
			lookupName = alias
		}

		if m, ok := globalMetrics["Development"][lookupName]; ok {
			svc.Metrics["Development"] = m
		}
		if m, ok := globalMetrics["Staging"][lookupName]; ok {
			svc.Metrics["Staging"] = m
		}
		metricsMu.RUnlock()
		results = append(results, svc)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func serviceHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	if serviceName == "" {
		http.Error(w, "Service name required", http.StatusBadRequest)
		return
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	// Attach metrics
	lookupName := svc.Name
	if alias, ok := s.FolderAliases[lookupName]; ok && alias != "" {
		lookupName = alias
	}

	metricsMu.RLock()
	svc.Metrics = make(map[string]ServiceMetrics)
	if m, ok := globalMetrics["Development"][lookupName]; ok {
		svc.Metrics["Development"] = m
	}
	if m, ok := globalMetrics["Staging"][lookupName]; ok {
		svc.Metrics["Staging"] = m
	}
	metricsMu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(svc)
}

func healthMonitorHandler(w http.ResponseWriter, r *http.Request) {
	tmpl, err := template.ParseFiles(filepath.Join(basePath, "templates", "health_monitor.html"))
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	data := map[string]string{
		"DevURL": os.Getenv("DEV_AGENT_URL"),
		"StgURL": os.Getenv("STG_AGENT_URL"),
	}
	tmpl.Execute(w, data)
}

func agentMetricsHandler(w http.ResponseWriter, r *http.Request) {
	env := r.URL.Query().Get("env")
	if env == "" {
		env = "Development"
	}

	metricsMu.RLock()
	data := globalMetrics[env]
	if data == nil {
		data = make(map[string]ServiceMetrics)
	}
	metricsMu.RUnlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(data)
}

func statsHandler(w http.ResponseWriter, r *http.Request) {
	db, err := getDB()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Stats by Service
	rowsS, _ := db.Query("SELECT service, COUNT(*) FROM deployments GROUP BY service")
	defer rowsS.Close()
	byService := make(map[string]int)
	for rowsS.Next() {
		var s string
		var c int
		rowsS.Scan(&s, &c)
		byService[s] = c
	}

	// Stats by Environment
	rowsE, _ := db.Query("SELECT environment, COUNT(*) FROM deployments GROUP BY environment")
	defer rowsE.Close()
	byEnv := make(map[string]int)
	for rowsE.Next() {
		var e string
		var c int
		rowsE.Scan(&e, &c)
		byEnv[e] = c
	}

	// Stats by Day (Last 30 days)
	rowsD, _ := db.Query(`
		SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as day, COUNT(*) 
		FROM deployments 
		WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
		GROUP BY day 
		ORDER BY day ASC
	`)
	defer rowsD.Close()
	byDay := make(map[string]int)
	for rowsD.Next() {
		var d string
		var c int
		rowsD.Scan(&d, &c)
		byDay[d] = c
	}

	// Stats by User
	rowsU, _ := db.Query("SELECT user_name, COUNT(*) FROM deployments GROUP BY user_name")
	defer rowsU.Close()
	byUser := make(map[string]int)
	for rowsU.Next() {
		var u string
		var c int
		rowsU.Scan(&u, &c)
		if u == "" {
			u = "Unknown"
		}
		byUser[u] = c
	}

	// Stats by Service per Day (Last 30 days)
	rowsSD, _ := db.Query(`
		SELECT service, DATE_FORMAT(created_at, '%Y-%m-%d') as day, COUNT(*) 
		FROM deployments 
		WHERE created_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
		GROUP BY service, day 
		ORDER BY day ASC
	`)
	defer rowsSD.Close()
	type SvcDay struct {
		Service string `json:"service"`
		Day     string `json:"day"`
		Count   int    `json:"count"`
	}
	var byServiceDay []SvcDay
	for rowsSD.Next() {
		var sd SvcDay
		rowsSD.Scan(&sd.Service, &sd.Day, &sd.Count)
		byServiceDay = append(byServiceDay, sd)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"by_service":     byService,
		"by_environment": byEnv,
		"by_day":         byDay,
		"by_user":        byUser,
		"by_service_day": byServiceDay,
	})
}

func historyHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	if serviceName == "" {
		http.Error(w, "Service name required", http.StatusBadRequest)
		return
	}

	db, err := getDB()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	rows, err := db.Query(`
		SELECT user_name, environment, branch, created_at, message, status 
		FROM deployments 
		WHERE service = ? 
		ORDER BY created_at DESC 
		LIMIT 100
	`, serviceName)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}
	defer rows.Close()

	var logs []DeployLog
	for rows.Next() {
		var l DeployLog
		var createdAt time.Time
		if err := rows.Scan(&l.UserName, &l.Environment, &l.Branch, &createdAt, &l.Message, &l.Status); err != nil {
			log.Printf("[History] Scan error: %v", err)
			continue
		}
		l.CreatedAt = createdAt.Add(7 * time.Hour).Format("2006-01-02 15:04:05")
		logs = append(logs, l)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}

func gitStashHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "stash", "list")
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		http.Error(w, string(out), http.StatusInternalServerError)
		return
	}

	stashes := strings.Split(strings.TrimSpace(string(out)), "\n")
	if len(stashes) == 1 && stashes[0] == "" {
		stashes = []string{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stashes)
}

func gitCommitsHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "log", "-n", "15", "--pretty=format:%h|%an|%ar|%s")
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		http.Error(w, string(out), http.StatusInternalServerError)
		return
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	type Commit struct {
		Hash       string `json:"hash"`
		Author     string `json:"author"`
		Date       string `json:"date"`
		Subject    string `json:"subject"`
		IsUnpushed bool   `json:"is_unpushed"`
	}
	var commits []Commit

	// Get unpushed commit hashes
	unpushedMap := make(map[string]bool)
	cmdUnpushed := exec.Command(gitPath, "-c", "safe.directory=*", "rev-list", "@{u}..HEAD")
	cmdUnpushed.Dir = svc.Dir
	if outUnpushed, err := cmdUnpushed.CombinedOutput(); err == nil {
		hashes := strings.Fields(string(outUnpushed))
		for _, h := range hashes {
			// rev-list gives full hashes, we use short hashes in the list usually
			// but we can check if it starts with the short hash
			unpushedMap[h] = true
		}
	}

	for _, line := range lines {
		parts := strings.SplitN(line, "|", 4)
		if len(parts) == 4 {
			hash := parts[0]
			// Check if this commit hash is in unpushedMap (might need to compare short hash)
			isUnpushed := false
			for fullHash := range unpushedMap {
				if strings.HasPrefix(fullHash, hash) {
					isUnpushed = true
					break
				}
			}
			commits = append(commits, Commit{Hash: hash, Author: parts[1], Date: parts[2], Subject: parts[3], IsUnpushed: isUnpushed})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(commits)
}

func gitBranchesHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "for-each-ref", "--format=%(refname:short)|%(upstream:track)", "refs/heads")
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		http.Error(w, string(out), http.StatusInternalServerError)
		return
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	type BranchInfo struct {
		Name   string `json:"name"`
		Ahead  int    `json:"ahead"`
		Behind int    `json:"behind"`
	}
	var branches []BranchInfo
	for _, line := range lines {
		parts := strings.SplitN(line, "|", 2)
		if len(parts) < 1 || parts[0] == "" {
			continue
		}
		name := parts[0]
		ahead := 0
		behind := 0
		if len(parts) > 1 {
			track := parts[1] // e.g. [ahead 1, behind 2]
			if strings.Contains(track, "ahead") {
				fmt.Sscanf(track[strings.Index(track, "ahead")+6:], "%d", &ahead)
			}
			if strings.Contains(track, "behind") {
				fmt.Sscanf(track[strings.Index(track, "behind")+7:], "%d", &behind)
			}
		}
		branches = append(branches, BranchInfo{Name: name, Ahead: ahead, Behind: behind})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(branches)
}

func gitCheckoutHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	var data struct {
		Branch string `json:"branch"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "checkout", data.Branch)
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": string(out)})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": string(out)})
}

func gitStashPushHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	var data struct {
		Message string   `json:"message"`
		Files   []string `json:"files"`
	}
	// Try to decode, but don't error if it's empty (for backward compatibility)
	json.NewDecoder(r.Body).Decode(&data)

	msg := data.Message
	if msg == "" {
		msg = "Auto stash before checkout"
	}

	args := []string{"-c", "safe.directory=*", "stash", "push", "-u", "-m", msg}
	if len(data.Files) > 0 {
		args = append(args, "--")
		args = append(args, data.Files...)
	}

	cmd := exec.Command(gitPath, args...)
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": string(out)})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": string(out)})
}

func gitStashPopHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	var data struct {
		Index int `json:"index"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	stashRef := fmt.Sprintf("stash@{%d}", data.Index)
	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "stash", "pop", stashRef)
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": string(out)})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": string(out)})
}

func gitCreateBranchHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	var data struct {
		Name string `json:"name"`
		Base string `json:"base"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "checkout", "-b", data.Name, data.Base)
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": string(out)})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": string(out)})
}

func gitMergeHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	var data struct {
		Branch string `json:"branch"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "merge", data.Branch)
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": string(out)})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": string(out)})
}

func gitStatusHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	if serviceName == "" {
		// Fallback for older Go or unexpected mux behavior
		serviceName = strings.TrimPrefix(r.URL.Path, "/api/git/status/")
	}
	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found: "+serviceName, http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "status", "--porcelain")
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		http.Error(w, string(out), http.StatusInternalServerError)
		return
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	files := []string{}
	for _, line := range lines {
		if len(line) > 3 {
			files = append(files, strings.TrimSpace(line[3:]))
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

func gitRollbackHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	var data struct {
		Files []string `json:"files"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	if len(data.Files) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": "No files selected"})
		return
	}

	// Try checkout -- first (for tracked files)
	args := append([]string{"-c", "safe.directory=*", "checkout", "--"}, data.Files...)
	cmd := exec.Command(gitPath, args...)
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()

	// If it fails, some files might be untracked. Try to delete them if they exist.
	if err != nil {
		for _, f := range data.Files {
			fullPath := filepath.Join(svc.Dir, f)
			if _, statErr := os.Stat(fullPath); statErr == nil {
				// File exists. Try to see if it's untracked.
				// For simplicity, we just try to remove it if checkout failed.
				os.RemoveAll(fullPath)
			}
		}
		// Try checkout again to be sure
		cmd = exec.Command(gitPath, args...)
		cmd.Dir = svc.Dir
		out, _ = cmd.CombinedOutput()
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": string(out)})
}


func gitFetchHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "fetch", "--all")
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": string(out)})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": string(out)})
}

func gitPushHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "push")
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": string(out)})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": string(out)})
}

func gitPullHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "pull")
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": string(out)})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": string(out)})
}


func getLatestMetricsForService(env, serviceName string) *ServiceMetrics {
	metricsMu.RLock()
	defer metricsMu.RUnlock()

	if m, ok := globalMetrics[env][serviceName]; ok {
		return &m
	}
	return nil
}

func deployHandler(w http.ResponseWriter, r *http.Request) {
	var data struct {
		Service string `json:"service"`
		Env     string `json:"env"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s := loadSettings()
	services := scanServices(s)

	var svc *Service
	for _, sv := range services {
		if sv.Name == data.Service {
			svc = &sv
			break
		}
	}

	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	startTime := time.Now()

	scriptPath := svc.DevScript
	if data.Env == "Staging" {
		scriptPath = svc.StgScript
	}

	if scriptPath == "" {
		http.Error(w, "Script not found for environment", http.StatusBadRequest)
		return
	}

	// Pre-deploy Snapshot
	preMetrics := getLatestMetricsForService(data.Env, svc.Name)
	var preMtime int64 = 0
	var prePID string = ""
	if preMetrics != nil {
		preMtime = preMetrics.BinaryMtime
		prePID = preMetrics.PID
	}

	// SSE Setup
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	send := func(msg string) {
		fmt.Fprintf(w, "data: %s\n\n", msg)
		flusher.Flush()
	}

	bash := getBashPath(s)
	userName := s.UserName
	if userName == "" {
		userName = "WebUser"
	}
	nowStr := time.Now().Format("2006-01-02 15:04:05")
	finalMsg := fmt.Sprintf("[%s] [%s] [%s] %s", userName, svc.Branch, nowStr, data.Message)

	// Step 1: Pre-deploy
	if s.PreDeployCmd != "" {
		send(fmt.Sprintf("[Pre-deploy] $ %s", s.PreDeployCmd))
		var cmd *exec.Cmd
		if runtime.GOOS == "windows" {
			cmd = exec.Command("cmd.exe", "/c", s.PreDeployCmd)
		} else {
			cmd = exec.Command("sh", "-c", s.PreDeployCmd)
		}
		cmd.Dir = svc.Dir
		h, _ := os.UserHomeDir()
		cmd.Env = append(os.Environ(),
			"GIT_TERMINAL_PROMPT=0",
			"GIT_SSH_COMMAND=ssh -o StrictHostKeyChecking=no",
			"GIT_CONFIG_COUNT=1",
			"GIT_CONFIG_KEY_0=url.git@gitlab.com:.insteadOf",
			"GIT_CONFIG_VALUE_0=https://gitlab.com/",
		)
		if h != "" {
			cmd.Env = append(cmd.Env, "HOME="+h, "USERPROFILE="+h)
		}

		stdout, _ := cmd.StdoutPipe()
		cmd.Stderr = cmd.Stdout

		if err := cmd.Start(); err != nil {
			send(fmt.Sprintf("Failed to start pre-deploy: %v", err))
		} else {
			scanner := bufio.NewScanner(stdout)
			for scanner.Scan() {
				send(scanner.Text())
			}
			if err := cmd.Wait(); err != nil {
				send(fmt.Sprintf("\n[Pre-deploy failed — exit %v. Aborting.]", err))
				duration := time.Since(startTime)
				send(fmt.Sprintf("\n[Time] Total deployment time: %.2f seconds", duration.Seconds()))
				send("[EOF]")
				return
			}
		}
	}

	// Step 2: Deploy script
	relScriptPath, _ := filepath.Rel(svc.Dir, scriptPath)
	send(fmt.Sprintf("$ bash %s \"%s\"", relScriptPath, finalMsg))

	cmd := exec.Command(bash, scriptPath, finalMsg)
	cmd.Dir = svc.Dir
	h, _ := os.UserHomeDir()
	cmd.Env = append(os.Environ(),
		"GIT_TERMINAL_PROMPT=0",
		"GIT_SSH_COMMAND=ssh -o StrictHostKeyChecking=no",
		"GIT_CONFIG_COUNT=1",
		"GIT_CONFIG_KEY_0=url.git@gitlab.com:.insteadOf",
		"GIT_CONFIG_VALUE_0=https://gitlab.com/",
	)
	if h != "" {
		cmd.Env = append(cmd.Env, "HOME="+h, "USERPROFILE="+h)
	}
	stdout, _ := cmd.StdoutPipe()
	cmd.Stderr = cmd.Stdout

	if err := cmd.Start(); err != nil {
		send(fmt.Sprintf("Failed to start deploy: %v", err))
	} else {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			send(scanner.Text())
		}
		if err := cmd.Wait(); err == nil {
			send("\n[Deploy script finished ✓]")
			send("[Verification] Waiting 5 seconds for service restart...")
			time.Sleep(5 * time.Second)

			// Post-deploy check
			status := "Success"
			postMetrics := getLatestMetricsForService(data.Env, svc.Name)
			if postMetrics == nil {
				send("[Verification] ⚠️ Could not contact health agent for verification.")
			} else {
				if postMetrics.Status != "RUNNING" {
					send("[Verification] ❌ Service is NOT RUNNING after deploy!")
					status = "Failed"
				} else if postMetrics.BinaryMtime <= preMtime && preMtime > 0 {
					send(fmt.Sprintf("[Verification] ❌ Binary NOT updated! (Old: %d, New: %d)", preMtime, postMetrics.BinaryMtime))
					status = "Failed"
				} else if postMetrics.PID == prePID && prePID != "" {
					send("[Verification] ⚠️ Service PID did not change. Restart might have failed.")
					// Not necessarily a failure if it's hot-reload, but usually a failure in this setup
				} else {
					send("[Verification] ✅ Binary updated and service is RUNNING.")
				}
			}

			if status == "Success" {
				send("\n[Deploy finished successfully ✓]")
			} else {
				send("\n[Deploy FAILED Verification ❌]")
			}

			err = logToDB(userName, svc.Name, data.Env, svc.Branch, data.Message, status)
			if err != nil {
				send(fmt.Sprintf("[MySQL] Error: %v", err))
			} else {
				send("[MySQL] Saved deployment log ✓")
			}

			if status != "Success" {
				send(fmt.Sprintf("[STATUS] %s", status))
			}
		} else {
			send(fmt.Sprintf("\n[Deploy error — exit %v]", err))
			logToDB(userName, svc.Name, data.Env, svc.Branch, data.Message, "Failed")
			send("[STATUS] Failed")
		}
	}

	duration := time.Since(startTime)
	send(fmt.Sprintf("\n[Time] Total deployment time: %.2f seconds", duration.Seconds()))

	send("[EOF]")
}

// ─────────────────────────────────────────────
// VPN Integration (OpenVPN Web Controller)
// ─────────────────────────────────────────────

type VPNConfigItem struct {
	Name          string `json:"name"`
	Path          string `json:"path"`
	SavedUsername string `json:"saved_username,omitempty"`
	SavedPassword string `json:"saved_password,omitempty"`
}

type VPNSavedCredential struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type VPNSavedAccount struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Username string `json:"username"`
	Password string `json:"password"`
}

type VPNState struct {
	sync.Mutex
	Status       string    `json:"status"` // "disconnected", "connecting", "connected", "disconnecting", "error"
	ActiveConfig string    `json:"active_config"`
	StartTime    time.Time `json:"start_time,omitempty"`
	IPAddress    string    `json:"ip_address,omitempty"`
	Interface    string    `json:"interface,omitempty"`
	ErrorMsg     string    `json:"error_msg,omitempty"`

	cmd          *exec.Cmd
	tempAuthFile string
}

type VPNLogBroadcaster struct {
	sync.Mutex
	clients map[chan string]bool
	buffer  []string
}

var (
	vpnState       = &VPNState{Status: "disconnected"}
	vpnBroadcaster = &VPNLogBroadcaster{
		clients: make(map[chan string]bool),
		buffer:  make([]string, 0, 200),
	}
	vpnCredsMutex    sync.Mutex
	vpnAccountsMutex sync.Mutex
)

func getCredentialsPath() string {
	return filepath.Join(basePath, "credentials.json")
}

func getAccountsPath() string {
	return filepath.Join(basePath, "accounts.json")
}

func writeJSONError(w http.ResponseWriter, code int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func handleConfigs(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	customDir := r.URL.Query().Get("custom_dir")

	configs, err := scanOVPNConfigs(customDir)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(configs)
}

func handleStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	vpnState.Lock()
	defer vpnState.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(vpnState)
}

type VPNConnectRequest struct {
	ConfigPath      string `json:"config_path"`
	Username        string `json:"username"`
	Password        string `json:"password"`
	SaveCredentials bool   `json:"save_credentials"`
}

func handleConnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req VPNConnectRequest
	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	if req.ConfigPath == "" || req.Username == "" || req.Password == "" {
		writeJSONError(w, http.StatusBadRequest, "config_path, username, and password are required")
		return
	}

	err = startVPN(req.ConfigPath, req.Username, req.Password, req.SaveCredentials)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "VPN connection process started"})
}

func handleDisconnect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	err := stopVPN()
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "VPN disconnect process started"})
}

func handleLogs(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	ch := vpnBroadcaster.Register()
	defer vpnBroadcaster.Unregister(ch)

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	notify := r.Context().Done()

	for {
		select {
		case <-notify:
			return
		case line := <-ch:
			_, err := fmt.Fprintf(w, "data: %s\n\n", line)
			if err != nil {
				return
			}
			flusher.Flush()
		}
	}
}

func scanOVPNConfigs(customDir string) ([]VPNConfigItem, error) {
	var configs []VPNConfigItem

	if customDir != "" {
		dir := customDir
		if strings.HasPrefix(dir, "~") {
			var homeDir string
			if sudoUser := os.Getenv("SUDO_USER"); sudoUser != "" {
				homeDir = filepath.Join("/home", sudoUser)
			} else {
				var err error
				homeDir, err = os.UserHomeDir()
				if err == nil {
					dir = filepath.Join(homeDir, dir[1:])
				}
			}
		}

		info, err := os.Stat(dir)
		if err != nil {
			if os.IsNotExist(err) {
				return nil, fmt.Errorf("Directory does not exist: %s", customDir)
			}
			return nil, fmt.Errorf("Error accessing directory: %v", err)
		}
		if !info.IsDir() {
			return nil, fmt.Errorf("Path is not a directory: %s", customDir)
		}

		files, err := filepath.Glob(filepath.Join(dir, "*.ovpn"))
		if err != nil {
			return nil, fmt.Errorf("Error scanning directory: %v", err)
		}
		for _, f := range files {
			abs, err := filepath.Abs(f)
			if err == nil {
				configs = append(configs, VPNConfigItem{Name: filepath.Base(f), Path: abs})
			}
		}
	} else {
		// 1. Scan current working directory
		files, _ := filepath.Glob("*.ovpn")
		for _, f := range files {
			abs, err := filepath.Abs(f)
			if err == nil {
				configs = append(configs, VPNConfigItem{Name: filepath.Base(f), Path: abs})
			}
		}

		// Get actual home directory (resolving SUDO_USER if run under sudo)
		var homeDir string
		if sudoUser := os.Getenv("SUDO_USER"); sudoUser != "" {
			homeDir = filepath.Join("/home", sudoUser)
		} else {
			var err error
			homeDir, err = os.UserHomeDir()
			if err != nil {
				homeDir = ""
			}
		}

		if homeDir != "" {
			// 2. Scan user's home directory
			homeFiles, _ := filepath.Glob(filepath.Join(homeDir, "*.ovpn"))
			for _, f := range homeFiles {
				configs = append(configs, VPNConfigItem{Name: filepath.Base(f), Path: f})
			}

			// 3. Scan user's Downloads directory
			downloadFiles, _ := filepath.Glob(filepath.Join(homeDir, "Downloads", "*.ovpn"))
			for _, f := range downloadFiles {
				configs = append(configs, VPNConfigItem{Name: filepath.Base(f), Path: f})
			}
		}
	}

	// Filter duplicate paths
	seen := make(map[string]bool)
	var uniqueConfigs []VPNConfigItem
	for _, c := range configs {
		if !seen[c.Path] {
			seen[c.Path] = true
			uniqueConfigs = append(uniqueConfigs, c)
		}
	}

	// Load credentials to pre-fill
	creds, _ := loadCredentials()
	for i, cfg := range uniqueConfigs {
		if cred, ok := creds[cfg.Path]; ok {
			uniqueConfigs[i].SavedUsername = cred.Username
			uniqueConfigs[i].SavedPassword = cred.Password
		}
	}

	return uniqueConfigs, nil
}

func loadCredentials() (map[string]VPNSavedCredential, error) {
	vpnCredsMutex.Lock()
	defer vpnCredsMutex.Unlock()

	file, err := os.Open(getCredentialsPath())
	if err != nil {
		if os.IsNotExist(err) {
			return make(map[string]VPNSavedCredential), nil
		}
		return nil, err
	}
	defer file.Close()

	var creds map[string]VPNSavedCredential
	if err := json.NewDecoder(file).Decode(&creds); err != nil {
		return nil, err
	}
	return creds, nil
}

func saveCredential(configPath, username, password string) error {
	creds, err := loadCredentials()
	if err != nil {
		return err
	}

	vpnCredsMutex.Lock()
	defer vpnCredsMutex.Unlock()

	creds[configPath] = VPNSavedCredential{
		Username: username,
		Password: password,
	}

	data, err := json.MarshalIndent(creds, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(getCredentialsPath(), data, 0600)
}

func deleteCredential(configPath string) error {
	creds, err := loadCredentials()
	if err != nil {
		return err
	}

	vpnCredsMutex.Lock()
	defer vpnCredsMutex.Unlock()

	if _, ok := creds[configPath]; !ok {
		return nil
	}

	delete(creds, configPath)

	data, err := json.MarshalIndent(creds, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(getCredentialsPath(), data, 0600)
}

func startVPN(configPath, username, password string, saveCreds bool) error {
	vpnState.Lock()
	if vpnState.Status == "connecting" || vpnState.Status == "connected" {
		vpnState.Unlock()
		return fmt.Errorf("VPN is already active or connecting")
	}

	vpnState.Status = "connecting"
	vpnState.ActiveConfig = configPath
	vpnState.ErrorMsg = ""
	vpnState.IPAddress = ""
	vpnState.Interface = ""
	vpnState.StartTime = time.Time{}
	vpnState.Unlock()

	if saveCreds {
		_ = saveCredential(configPath, username, password)
	} else {
		_ = deleteCredential(configPath)
	}

	// Create a temporary file with credentials
	tmpFile, err := os.CreateTemp("", "vpn-auth-*.tmp")
	if err != nil {
		updateStateError(fmt.Sprintf("Failed to create credentials temp file: %v", err))
		return err
	}
	_ = tmpFile.Chmod(0600) // Restricted to owner (root)

	_, err = tmpFile.WriteString(username + "\n" + password + "\n")
	tmpFile.Close()
	if err != nil {
		os.Remove(tmpFile.Name())
		updateStateError(fmt.Sprintf("Failed to write credentials: %v", err))
		return err
	}

	vpnState.Lock()
	vpnState.tempAuthFile = tmpFile.Name()

	// Launch OpenVPN
	cmd := exec.Command("sudo", "openvpn", "--config", configPath, "--auth-user-pass", tmpFile.Name(), "--disable-dco")
	vpnState.cmd = cmd
	vpnState.Unlock()

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		cleanupTempAuth()
		updateStateError(fmt.Sprintf("Failed to redirect stdout: %v", err))
		return err
	}
	cmd.Stderr = cmd.Stdout // merge stderr into stdout

	if err := cmd.Start(); err != nil {
		cleanupTempAuth()
		updateStateError(fmt.Sprintf("Failed to launch openvpn process: %v. Make sure 'openvpn' is installed and this app is run with sudo.", err))
		return err
	}

	// Delete credentials file after a short delay
	go func() {
		time.Sleep(5 * time.Second)
		cleanupTempAuth()
	}()

	// Clear logs console buffer
	vpnBroadcaster.Clear()
	vpnBroadcaster.Broadcast("SYSTEM: Launching OpenVPN process...")

	// Listen to stdout/stderr in a separate goroutine
	go func() {
		reader := io.Reader(stdout)
		buf := make([]byte, 1024)
		var lineAccumulator string

		for {
			n, err := reader.Read(buf)
			if n > 0 {
				lineAccumulator += string(buf[:n])
				for {
					idx := strings.Index(lineAccumulator, "\n")
					if idx == -1 {
						break
					}
					line := strings.TrimRight(lineAccumulator[:idx], "\r")
					lineAccumulator = lineAccumulator[idx+1:]

					vpnBroadcaster.Broadcast(line)
					parseLogLine(line)
				}
			}
			if err != nil {
				break
			}
		}

		// Wait for process to exit
		err = cmd.Wait()

		vpnState.Lock()
		if vpnState.Status == "connecting" || vpnState.Status == "connected" {
			vpnState.Status = "error"
			if err != nil {
				vpnState.ErrorMsg = fmt.Sprintf("VPN process exited: %v", err)
			} else {
				vpnState.ErrorMsg = "VPN process exited unexpectedly"
			}
			vpnBroadcaster.Broadcast(fmt.Sprintf("SYSTEM: Connection failed or exited. Error: %s", vpnState.ErrorMsg))
		} else if vpnState.Status == "disconnecting" {
			vpnState.Status = "disconnected"
			vpnBroadcaster.Broadcast("SYSTEM: Disconnected.")
		}
		vpnState.cmd = nil
		vpnState.Unlock()

		cleanupTempAuth()
	}()

	return nil
}

func stopVPN() error {
	vpnState.Lock()
	defer vpnState.Unlock()

	if vpnState.cmd == nil {
		vpnState.Status = "disconnected"
		return nil
	}

	vpnState.Status = "disconnecting"
	vpnBroadcaster.Broadcast("SYSTEM: Disconnect signal sent...")

	err := vpnState.cmd.Process.Signal(syscall.SIGTERM)
	if err != nil {
		log.Printf("Failed to SIGTERM VPN process: %v, falling back to Kill", err)
		err = vpnState.cmd.Process.Kill()
	}

	return err
}

func parseLogLine(line string) {
	vpnState.Lock()
	defer vpnState.Unlock()

	if strings.Contains(line, "Initialization Sequence Completed") {
		vpnState.Status = "connected"
		vpnState.StartTime = time.Now()
		vpnState.ErrorMsg = ""
		vpnBroadcaster.Broadcast("SYSTEM: Successfully connected! Fetching new WAN IP...")

		go func() {
			time.Sleep(2 * time.Second)
			ip, location := fetchCurrentIP()

			vpnState.Lock()
			if vpnState.Status == "connected" {
				vpnState.IPAddress = ip
				if location != "" {
					vpnState.IPAddress = fmt.Sprintf("%s (%s)", ip, location)
				}
				vpnBroadcaster.Broadcast(fmt.Sprintf("SYSTEM: Verified VPN IP address: %s", vpnState.IPAddress))
			}
			vpnState.Unlock()
		}()
	}

	if strings.Contains(line, "TUN/TAP device") && strings.Contains(line, "opened") {
		parts := strings.Split(line, "TUN/TAP device")
		if len(parts) > 1 {
			rest := strings.TrimSpace(parts[1])
			words := strings.Fields(rest)
			if len(words) > 0 {
				dev := strings.Trim(words[0], "[]")
				vpnState.Interface = dev
			}
		}
	}

	if strings.Contains(line, "AUTH_FAILED") {
		vpnState.Status = "error"
		vpnState.ErrorMsg = "Authentication Failed: Incorrect Username or Password"
	} else if strings.Contains(line, "TLS Error: TLS key negotiation failed") {
		vpnState.Status = "error"
		vpnState.ErrorMsg = "TLS Negotiation Failed: Handshake timed out"
	} else if strings.Contains(line, "Cannot resolve host address") {
		vpnState.Status = "error"
		vpnState.ErrorMsg = "DNS Error: Cannot resolve VPN server address"
	}
}

func fetchCurrentIP() (string, string) {
	client := http.Client{Timeout: 3 * time.Second}

	resp, err := client.Get("http://ip-api.com/json/")
	if err != nil {
		resp2, err2 := client.Get("https://api.ipify.org?format=text")
		if err2 != nil {
			return "Unknown", ""
		}
		defer resp2.Body.Close()
		ipBytes, _ := io.ReadAll(resp2.Body)
		return string(ipBytes), ""
	}
	defer resp.Body.Close()

	var res struct {
		Query   string `json:"query"`
		City    string `json:"city"`
		Country string `json:"country"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "Unknown", ""
	}

	if res.Query == "" {
		return "Unknown", ""
	}

	return res.Query, fmt.Sprintf("%s, %s", res.City, res.Country)
}

func cleanupTempAuth() {
	vpnState.Lock()
	defer vpnState.Unlock()
	if vpnState.tempAuthFile != "" {
		os.Remove(vpnState.tempAuthFile)
		vpnState.tempAuthFile = ""
	}
}

func updateStateError(errMsg string) {
	vpnState.Lock()
	defer vpnState.Unlock()
	vpnState.Status = "error"
	vpnState.ErrorMsg = errMsg
	vpnBroadcaster.Broadcast(fmt.Sprintf("SYSTEM ERROR: %s", errMsg))
}

func (lb *VPNLogBroadcaster) Register() chan string {
	lb.Lock()
	defer lb.Unlock()
	ch := make(chan string, 100)
	lb.clients[ch] = true
	for _, line := range lb.buffer {
		ch <- line
	}
	return ch
}

func (lb *VPNLogBroadcaster) Unregister(ch chan string) {
	lb.Lock()
	defer lb.Unlock()
	delete(lb.clients, ch)
	close(ch)
}

func (lb *VPNLogBroadcaster) Broadcast(line string) {
	lb.Lock()
	defer lb.Unlock()

	if len(lb.buffer) >= 200 {
		lb.buffer = lb.buffer[1:]
	}
	lb.buffer = append(lb.buffer, line)

	for ch := range lb.clients {
		select {
		case ch <- line:
		default:
			// slow consumer, skip
		}
	}
}

func (lb *VPNLogBroadcaster) Clear() {
	lb.Lock()
	defer lb.Unlock()
	lb.buffer = lb.buffer[:0]
}

func loadAccounts() ([]VPNSavedAccount, error) {
	vpnAccountsMutex.Lock()
	defer vpnAccountsMutex.Unlock()

	file, err := os.Open(getAccountsPath())
	if err != nil {
		if os.IsNotExist(err) {
			return []VPNSavedAccount{}, nil
		}
		return nil, err
	}
	defer file.Close()

	var accounts []VPNSavedAccount
	if err := json.NewDecoder(file).Decode(&accounts); err != nil {
		return nil, err
	}
	return accounts, nil
}

func saveAccounts(accounts []VPNSavedAccount) error {
	vpnAccountsMutex.Lock()
	defer vpnAccountsMutex.Unlock()

	data, err := json.MarshalIndent(accounts, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(getAccountsPath(), data, 0600)
}

func handleAccounts(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodGet {
		accounts, err := loadAccounts()
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, err.Error())
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(accounts)
		return
	}

	if r.Method == http.MethodPost {
		var req VPNSavedAccount
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "Invalid payload")
			return
		}

		if req.Username == "" || req.Password == "" || req.Label == "" {
			writeJSONError(w, http.StatusBadRequest, "Label, username, and password are required")
			return
		}

		accounts, err := loadAccounts()
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, err.Error())
			return
		}

		if req.ID == "" {
			req.ID = fmt.Sprintf("acc_%d", time.Now().UnixNano())
			accounts = append(accounts, req)
		} else {
			found := false
			for i, acc := range accounts {
				if acc.ID == req.ID {
					accounts[i] = req
					found = true
					break
				}
			}
			if !found {
				accounts = append(accounts, req)
			}
		}

		if err := saveAccounts(accounts); err != nil {
			writeJSONError(w, http.StatusInternalServerError, err.Error())
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(accounts)
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}

func handleDeleteAccount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeJSONError(w, http.StatusBadRequest, "Invalid payload")
		return
	}

	if req.ID == "" {
		writeJSONError(w, http.StatusBadRequest, "ID is required")
		return
	}

	accounts, err := loadAccounts()
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var updated []VPNSavedAccount
	for _, acc := range accounts {
		if acc.ID != req.ID {
			updated = append(updated, acc)
		}
	}

	if err := saveAccounts(updated); err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updated)
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

func main() {
	s := loadSettings()
	ensureGitInPath(s)
	log.Printf("[Init] DEV_AGENT_URL: %s", os.Getenv("DEV_AGENT_URL"))
	log.Printf("[Init] STG_AGENT_URL: %s", os.Getenv("STG_AGENT_URL"))
	startMetricsCollector()

	u, _ := user.Current()
	h, _ := os.UserHomeDir()
	log.Printf("[Init] Running as user: %s (UID: %s), Home: %s", u.Username, u.Uid, h)

	// Pre-init DB connection to check config
	go func() {
		if _, err := getDB(); err != nil {
			log.Printf("[Init] DB/SSH Warning: %v", err)
		}
	}()

	defer func() {
		dbMu.Lock()
		if globalDB != nil {
			log.Printf("[Main] Closing global DB connection")
			globalDB.Close()
		}
		if globalCleanup != nil {
			globalCleanup()
		}
		dbMu.Unlock()
	}()

	mux := http.NewServeMux()

	mux.HandleFunc("/", indexHandler)
	mux.HandleFunc("/health-monitor", healthMonitorHandler)
	mux.HandleFunc("/api/settings", settingsHandler)
	mux.HandleFunc("/api/services", servicesHandler)
	mux.HandleFunc("/api/services/{service_name}", serviceHandler)
	mux.HandleFunc("/api/history/{service_name}", historyHandler)
	mux.HandleFunc("/api/stats", statsHandler)
	mux.HandleFunc("/api/agent-metrics", agentMetricsHandler)
	mux.HandleFunc("/api/deploy", deployHandler)

	// New Git features
	mux.HandleFunc("/api/git/stash/{service_name}", gitStashHandler)
	mux.HandleFunc("/api/git/commits/{service_name}", gitCommitsHandler)
	mux.HandleFunc("/api/git/branches/{service_name}", gitBranchesHandler)
	mux.HandleFunc("/api/git/checkout/{service_name}", gitCheckoutHandler)
	mux.HandleFunc("/api/git/stash-push/{service_name}", gitStashPushHandler)
	mux.HandleFunc("/api/git/stash-pop/{service_name}", gitStashPopHandler)
	mux.HandleFunc("/api/git/create-branch/{service_name}", gitCreateBranchHandler)
	mux.HandleFunc("/api/git/merge/{service_name}", gitMergeHandler)
	mux.HandleFunc("/api/git/status/{service_name}", gitStatusHandler)
	mux.HandleFunc("/api/git/rollback/{service_name}", gitRollbackHandler)
	mux.HandleFunc("/api/git/fetch/{service_name}", gitFetchHandler)
	mux.HandleFunc("/api/git/push/{service_name}", gitPushHandler)
	mux.HandleFunc("/api/git/pull/{service_name}", gitPullHandler)

	// VPN Integration Routes
	mux.HandleFunc("/api/configs", handleConfigs)
	mux.HandleFunc("/api/status", handleStatus)
	mux.HandleFunc("/api/connect", handleConnect)
	mux.HandleFunc("/api/disconnect", handleDisconnect)
	mux.HandleFunc("/api/logs", handleLogs)
	mux.HandleFunc("/api/accounts", handleAccounts)
	mux.HandleFunc("/api/accounts/delete", handleDeleteAccount)

	// Static files
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.Dir(filepath.Join(basePath, "static")))))
	mux.HandleFunc("GET /favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(basePath, "static", "favicon.ico"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	go func() {
		fmt.Printf("Server starting on http://localhost:%s\n", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[Main] Shutting down server...")

	// Create a context with timeout for the shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("[Main] Server forced to shutdown: %v", err)
	}

	log.Println("[Main] Server exiting")
}
