package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

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

		oldSettings := loadSettings()
		for i, svc := range s.Services {
			// If password is changed (not the placeholder)
			if svc.ProdPasswordHash != "" && svc.ProdPasswordHash != "********" {
				hash, err := bcrypt.GenerateFromPassword([]byte(svc.ProdPasswordHash), bcrypt.DefaultCost)
				if err == nil {
					s.Services[i].ProdPasswordHash = string(hash)
				}
			} else if svc.ProdPasswordHash == "********" {
				// Keep old hash
				for _, oldSvc := range oldSettings.Services {
					if oldSvc.Folder == svc.Folder && oldSvc.Name == svc.Name {
						s.Services[i].ProdPasswordHash = oldSvc.ProdPasswordHash
						break
					}
				}
			}
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
	// Hide real hashes from frontend
	for i := range s.Services {
		if s.Services[i].ProdPasswordHash != "" {
			s.Services[i].ProdPasswordHash = "********"
		}
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(s)
}

func workspaceFoldersHandler(w http.ResponseWriter, r *http.Request) {
	s := loadSettings()
	entries, err := os.ReadDir(s.WorkspaceURL)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var folders []string
	for _, entry := range entries {
		if entry.IsDir() && !strings.HasPrefix(entry.Name(), ".") {
			folders = append(folders, entry.Name())
		}
	}
	sort.Strings(folders)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(folders)
}

func servicesHandler(w http.ResponseWriter, r *http.Request) {
	s := loadSettings()
	services := scanServices(s)

	results := make([]Service, 0)
	for _, svc := range services {
		metricsMu.RLock()
		svc.Metrics = make(map[string]ServiceMetrics)
		
		lookupName := svc.Name

		if m, ok := globalMetrics["Development"][lookupName]; ok {
			svc.Metrics["Development"] = m
		}
		if m, ok := globalMetrics["Staging"][lookupName]; ok {
			svc.Metrics["Staging"] = m
		}
		if m, ok := globalMetrics["Production"][lookupName]; ok {
			svc.Metrics["Production"] = m
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

	lookupName := svc.Name

	metricsMu.RLock()
	svc.Metrics = make(map[string]ServiceMetrics)
	if m, ok := globalMetrics["Development"][lookupName]; ok {
		svc.Metrics["Development"] = m
	}
	if m, ok := globalMetrics["Staging"][lookupName]; ok {
		svc.Metrics["Staging"] = m
	}
	if m, ok := globalMetrics["Production"][lookupName]; ok {
		svc.Metrics["Production"] = m
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

	rowsS, _ := db.Query("SELECT service, COUNT(*) FROM deployments GROUP BY service")
	defer rowsS.Close()
	byService := make(map[string]int)
	for rowsS.Next() {
		var s string
		var c int
		rowsS.Scan(&s, &c)
		byService[s] = c
	}

	rowsE, _ := db.Query("SELECT environment, COUNT(*) FROM deployments GROUP BY environment")
	defer rowsE.Close()
	byEnv := make(map[string]int)
	for rowsE.Next() {
		var e string
		var c int
		rowsE.Scan(&e, &c)
		byEnv[e] = c
	}

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

func deployHandler(w http.ResponseWriter, r *http.Request) {
	var data struct {
		Service      string `json:"service"`
		Env          string `json:"env"`
		Message      string `json:"message"`
		Password     string `json:"password"`
		ResetStaging bool   `json:"reset_staging"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	s := loadSettings()
	
	// Verify production password
	if data.Env == "Production" {
		var targetCfg *ServiceConfig
		for _, cfg := range s.Services {
			if cfg.Name == data.Service {
				targetCfg = &cfg
				break
			}
		}
		
		if targetCfg != nil && targetCfg.ProdPasswordHash != "" {
			err := bcrypt.CompareHashAndPassword([]byte(targetCfg.ProdPasswordHash), []byte(data.Password))
			if err != nil {
				http.Error(w, "Invalid production password", http.StatusUnauthorized)
				return
			}
		}
	}

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
	} else if data.Env == "Production" {
		scriptPath = svc.ProdScript
	}

	if scriptPath == "" {
		http.Error(w, "Script not found for environment", http.StatusBadRequest)
		return
	}

	preMetrics := getLatestMetricsForService(data.Env, svc.Name)
	var preMtime int64 = 0
	var prePID string = ""
	if preMetrics != nil {
		preMtime = preMetrics.BinaryMtime
		prePID = preMetrics.PID
	}

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

	var prevBranch string
	var prevCommit string
	var hasStashed bool
	gitPath := getGitPath(s)

	restoreGitState := func() {
		if !data.ResetStaging {
			return
		}
		send("[Git Reset Staging] Restoring previous Git state...")
		if prevBranch == "HEAD" && prevCommit != "" {
			send(fmt.Sprintf("[Git Reset Staging] Checking out previous commit %s...", prevCommit))
			cmdRestore := exec.Command(gitPath, "-c", "safe.directory=*", "checkout", prevCommit)
			cmdRestore.Dir = svc.Dir
			cmdRestore.Run()
		} else if prevBranch != "" && prevBranch != "HEAD" {
			send(fmt.Sprintf("[Git Reset Staging] Checking out previous branch '%s'...", prevBranch))
			cmdRestore := exec.Command(gitPath, "-c", "safe.directory=*", "checkout", prevBranch)
			cmdRestore.Dir = svc.Dir
			cmdRestore.Run()
		}

		if hasStashed {
			send("[Git Reset Staging] Popping stashed changes...")
			cmdPop := exec.Command(gitPath, "-c", "safe.directory=*", "stash", "pop")
			cmdPop.Dir = svc.Dir
			popOut, err := cmdPop.CombinedOutput()
			if err != nil {
				send(fmt.Sprintf("[Git Reset Staging] ⚠️ Git stash pop returned warning/error: %v\n%s", err, string(popOut)))
			} else {
				send("[Git Reset Staging] Stash popped successfully.")
			}
		}
	}

	if data.ResetStaging {
		send("[Git Reset Staging] Starting Git staging reset process...")

		// 1. Get current branch
		cmdRef := exec.Command(gitPath, "-c", "safe.directory=*", "rev-parse", "--abbrev-ref", "HEAD")
		cmdRef.Dir = svc.Dir
		refOut, err := cmdRef.CombinedOutput()
		if err != nil {
			send(fmt.Sprintf("[Git Reset Staging] ❌ Failed to get current branch: %v\n%s", err, string(refOut)))
			send("[EOF]")
			return
		}
		prevBranch = strings.TrimSpace(string(refOut))
		send(fmt.Sprintf("[Git Reset Staging] Current branch: %s", prevBranch))

		if prevBranch == "HEAD" {
			cmdHash := exec.Command(gitPath, "-c", "safe.directory=*", "rev-parse", "HEAD")
			cmdHash.Dir = svc.Dir
			hashOut, _ := cmdHash.CombinedOutput()
			prevCommit = strings.TrimSpace(string(hashOut))
			send(fmt.Sprintf("[Git Reset Staging] Detached HEAD at commit: %s", prevCommit))
		}

		// 2. Check for local changes & stash
		cmdStatus := exec.Command(gitPath, "-c", "safe.directory=*", "status", "--porcelain")
		cmdStatus.Dir = svc.Dir
		statusOut, err := cmdStatus.CombinedOutput()
		if err != nil {
			send(fmt.Sprintf("[Git Reset Staging] ❌ Failed to get git status: %v\n%s", err, string(statusOut)))
			send("[EOF]")
			return
		}
		hasChanges := len(strings.TrimSpace(string(statusOut))) > 0

		if hasChanges {
			send("[Git Reset Staging] Local changes detected. Stashing changes...")
			cmdStash := exec.Command(gitPath, "-c", "safe.directory=*", "stash", "push", "-u", "-m", "Auto stash before reset staging")
			cmdStash.Dir = svc.Dir
			stashOut, err := cmdStash.CombinedOutput()
			if err != nil {
				send(fmt.Sprintf("[Git Reset Staging] ❌ Git stash failed: %v\n%s", err, string(stashOut)))
				send("[EOF]")
				return
			}
			send(fmt.Sprintf("[Git Reset Staging] Stashed successfully:\n%s", strings.TrimSpace(string(stashOut))))
			hasStashed = true
		} else {
			send("[Git Reset Staging] No local changes to stash.")
		}

		// 3. Detach HEAD if currently on staging branch
		if prevBranch == "staging" {
			send("[Git Reset Staging] Currently on 'staging' branch. Detaching HEAD to allow deletion...")
			cmdDetach := exec.Command(gitPath, "-c", "safe.directory=*", "checkout", "--detach")
			cmdDetach.Dir = svc.Dir
			detachOut, err := cmdDetach.CombinedOutput()
			if err != nil {
				send(fmt.Sprintf("[Git Reset Staging] ❌ Failed to detach HEAD: %v\n%s", err, string(detachOut)))
				restoreGitState()
				send("[EOF]")
				return
			}
		}

		// 4. Delete local staging branch if it exists
		cmdCheckStg := exec.Command(gitPath, "-c", "safe.directory=*", "show-ref", "--verify", "refs/heads/staging")
		cmdCheckStg.Dir = svc.Dir
		if err := cmdCheckStg.Run(); err == nil {
			send("[Git Reset Staging] Deleting local 'staging' branch...")
			cmdDelStg := exec.Command(gitPath, "-c", "safe.directory=*", "branch", "-D", "staging")
			cmdDelStg.Dir = svc.Dir
			delStgOut, err := cmdDelStg.CombinedOutput()
			if err != nil {
				send(fmt.Sprintf("[Git Reset Staging] ❌ Failed to delete local 'staging' branch: %v\n%s", err, string(delStgOut)))
				restoreGitState()
				send("[EOF]")
				return
			}
			send("[Git Reset Staging] Local 'staging' branch deleted successfully.")
		} else {
			send("[Git Reset Staging] Local 'staging' branch does not exist.")
		}

		// 5. Fetch new staging branch from remote
		send("[Git Reset Staging] Fetching 'staging' from origin...")
		cmdFetch := exec.Command(gitPath, "-c", "safe.directory=*", "fetch", "origin", "staging")
		cmdFetch.Dir = svc.Dir
		fetchOut, err := cmdFetch.CombinedOutput()
		if err != nil {
			send(fmt.Sprintf("[Git Reset Staging] ❌ Failed to fetch 'staging' from origin: %v\n%s", err, string(fetchOut)))
			restoreGitState()
			send("[EOF]")
			return
		}

		// 6. Checkout new staging branch tracking origin/staging
		send("[Git Reset Staging] Checking out new 'staging' branch tracking 'origin/staging'...")
		cmdCheckout := exec.Command(gitPath, "-c", "safe.directory=*", "checkout", "-b", "staging", "origin/staging")
		cmdCheckout.Dir = svc.Dir
		checkoutOut, err := cmdCheckout.CombinedOutput()
		if err != nil {
			send(fmt.Sprintf("[Git Reset Staging] ❌ Failed to checkout 'staging' branch: %v\n%s", err, string(checkoutOut)))
			restoreGitState()
			send("[EOF]")
			return
		}
		send("[Git Reset Staging] Checked out 'staging' branch successfully.")
	}

	bash := getBashPath(s)
	userName := s.UserName
	if userName == "" {
		userName = "WebUser"
	}
	if data.ResetStaging {
		svc.Branch = "staging"
	}
	nowStr := time.Now().Format("2006-01-02 15:04:05")
	finalMsg := fmt.Sprintf("[%s] [%s] [%s] %s", userName, svc.Branch, nowStr, data.Message)

	preDeployCmd := svc.PreDeployCmd
	if preDeployCmd != "" {
		send(fmt.Sprintf("[Pre-deploy] $ %s", preDeployCmd))
		var cmd *exec.Cmd
		if runtime.GOOS == "windows" {
			cmd = exec.Command("cmd.exe", "/c", preDeployCmd)
		} else {
			cmd = exec.Command("sh", "-c", preDeployCmd)
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
				restoreGitState()
				duration := time.Since(startTime)
				send(fmt.Sprintf("\n[Time] Total deployment time: %.2f seconds", duration.Seconds()))
				send("[EOF]")
				return
			}
		}
	}

	isCustomCmd := true
	resolvedScriptPath := scriptPath
	if strings.HasPrefix(scriptPath, "./") || strings.HasPrefix(scriptPath, "scripts/") {
		fullPath := filepath.Join(svc.Dir, scriptPath)
		if _, err := os.Stat(fullPath); err == nil {
			isCustomCmd = false
			resolvedScriptPath = fullPath
		}
	}

	var cmd *exec.Cmd
	if isCustomCmd {
		send(fmt.Sprintf("[Deploy] Running custom command: %s", scriptPath))
		bashPath := getBashPath(s)
		cmd = exec.Command(bashPath, "-c", scriptPath)
	} else {
		relScriptPath, _ := filepath.Rel(svc.Dir, resolvedScriptPath)
		send(fmt.Sprintf("$ bash %s \"%s\"", relScriptPath, finalMsg))
		cmd = exec.Command(bash, resolvedScriptPath, finalMsg)
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
	cmd.Env = append(cmd.Env,
		"DEPLOY_MSG="+finalMsg,
		"DEPLOY_MESSAGE="+finalMsg,
	)
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

	restoreGitState()
	duration := time.Since(startTime)
	send(fmt.Sprintf("\n[Time] Total deployment time: %.2f seconds", duration.Seconds()))

	send("[EOF]")
}
