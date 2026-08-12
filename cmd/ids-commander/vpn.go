package main

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
)

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

type VPNProcessInfo struct {
	PID     string `json:"pid"`
	User    string `json:"user"`
	CPU     string `json:"cpu"`
	Mem     string `json:"mem"`
	Stat    string `json:"stat"`
	Start   string `json:"start"`
	Command string `json:"command"`
}

type VPNDiagnosticsResponse struct {
	ProcessCount    int              `json:"process_count"`
	HasConflict     bool             `json:"has_conflict"`
	ConflictMessage string           `json:"conflict_message,omitempty"`
	Processes       []VPNProcessInfo `json:"processes"`
	Interfaces      []string         `json:"interfaces"`
	Routes          []string         `json:"routes"`
	RawReport       string           `json:"raw_report"`
	CheckedAt       string           `json:"checked_at"`
}

type VPNState struct {
	sync.Mutex
	Status       string    `json:"status"` // "disconnected", "connecting", "connected", "disconnecting", "error"
	ActiveConfig string    `json:"active_config"`
	StartTime    time.Time `json:"start_time,omitempty"`
	IPAddress    string    `json:"ip_address,omitempty"`
	Interface    string    `json:"interface,omitempty"`
	ErrorMsg     string    `json:"error_msg,omitempty"`
	Latency      string    `json:"latency,omitempty"`

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
		files, _ := filepath.Glob("*.ovpn")
		for _, f := range files {
			abs, err := filepath.Abs(f)
			if err == nil {
				configs = append(configs, VPNConfigItem{Name: filepath.Base(f), Path: abs})
			}
		}

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
			homeFiles, _ := filepath.Glob(filepath.Join(homeDir, "*.ovpn"))
			for _, f := range homeFiles {
				configs = append(configs, VPNConfigItem{Name: filepath.Base(f), Path: f})
			}

			downloadFiles, _ := filepath.Glob(filepath.Join(homeDir, "Downloads", "*.ovpn"))
			for _, f := range downloadFiles {
				configs = append(configs, VPNConfigItem{Name: filepath.Base(f), Path: f})
			}
		}
	}

	seen := make(map[string]bool)
	var uniqueConfigs []VPNConfigItem
	for _, c := range configs {
		if !seen[c.Path] {
			seen[c.Path] = true
			uniqueConfigs = append(uniqueConfigs, c)
		}
	}

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

	// Proactively and reliably clean up any existing OpenVPN daemons to prevent multi-process leaks
	_ = exec.Command("sudo", "killall", "-9", "openvpn").Run()
	_ = exec.Command("sudo", "pkill", "-9", "-x", "openvpn").Run()
	_ = exec.Command("sudo", "pkill", "-9", "-f", "openvpn").Run()
	time.Sleep(300 * time.Millisecond)

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

	tmpFile, err := os.CreateTemp("", "vpn-auth-*.tmp")
	if err != nil {
		updateStateError(fmt.Sprintf("Failed to create credentials temp file: %v", err))
		return err
	}
	_ = tmpFile.Chmod(0600)

	_, err = tmpFile.WriteString(username + "\n" + password + "\n")
	tmpFile.Close()
	if err != nil {
		os.Remove(tmpFile.Name())
		updateStateError(fmt.Sprintf("Failed to write credentials: %v", err))
		return err
	}

	vpnState.Lock()
	vpnState.tempAuthFile = tmpFile.Name()

	cmd := exec.Command("sudo", "openvpn",
		"--config", configPath,
		"--auth-user-pass", tmpFile.Name(),
		"--disable-dco",
		"--management", "127.0.0.1", "11195",
		"--management-signal",
	)
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}
	vpnState.cmd = cmd
	vpnState.Unlock()

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		cleanupTempAuth()
		updateStateError(fmt.Sprintf("Failed to redirect stdout: %v", err))
		return err
	}
	cmd.Stderr = cmd.Stdout

	if err := cmd.Start(); err != nil {
		cleanupTempAuth()
		updateStateError(fmt.Sprintf("Failed to launch openvpn process: %v. Make sure 'openvpn' is installed and this app is run with sudo.", err))
		return err
	}

	go func() {
		time.Sleep(5 * time.Second)
		cleanupTempAuth()
	}()

	vpnBroadcaster.Clear()
	vpnBroadcaster.Broadcast("SYSTEM: Launching OpenVPN process...")

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

func sendOpenVPNManagementSignal(command string) bool {
	conn, err := net.DialTimeout("tcp", "127.0.0.1:11195", 500*time.Millisecond)
	if err != nil {
		return false
	}
	defer conn.Close()
	_, _ = fmt.Fprintf(conn, "%s\n", command)
	time.Sleep(200 * time.Millisecond)
	return true
}

func stopVPN() error {
	vpnState.Lock()
	if vpnState.cmd == nil && vpnState.Status == "disconnected" {
		vpnState.Unlock()
		return nil
	}

	vpnState.Status = "disconnecting"
	cmd := vpnState.cmd
	vpnState.Unlock()

	vpnBroadcaster.Broadcast("SYSTEM: Đang ngắt kết nối VPN...")

	// 1. Send graceful shutdown signal via OpenVPN Management Port (No sudo required)
	_ = sendOpenVPNManagementSignal("signal SIGTERM")
	_ = sendOpenVPNManagementSignal("signal SIGINT")
	_ = sendOpenVPNManagementSignal("kill")

	// 2. Terminate the sudo process group
	if cmd != nil && cmd.Process != nil {
		if pgid, err := syscall.Getpgid(cmd.Process.Pid); err == nil {
			_ = syscall.Kill(-pgid, syscall.SIGTERM)
		}
		_ = cmd.Process.Signal(syscall.SIGTERM)
		_ = cmd.Process.Kill()
	}

	// 3. Fallback kill (if sudoers allows)
	_ = exec.Command("sudo", "killall", "-9", "openvpn").Run()
	_ = exec.Command("sudo", "pkill", "-9", "-x", "openvpn").Run()
	_ = exec.Command("sudo", "pkill", "-9", "-f", "openvpn").Run()
	_ = exec.Command("pkill", "-9", "-x", "openvpn").Run()
	time.Sleep(300 * time.Millisecond)

	vpnState.Lock()
	vpnState.Status = "disconnected"
	vpnState.IPAddress = ""
	vpnState.Interface = ""
	vpnState.ErrorMsg = ""
	vpnState.Latency = ""
	vpnState.cmd = nil
	vpnState.Unlock()

	cleanupTempAuth()
	vpnBroadcaster.Broadcast("SYSTEM: Đã ngắt kết nối VPN thành công.")
	return nil
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

func startVPNMonitor() {
	go func() {
		ticker := time.NewTicker(15 * time.Second)
		defer ticker.Stop()

		pingFailCount := 0

		for range ticker.C {
			vpnState.Lock()
			status := vpnState.Status
			activeCfg := vpnState.ActiveConfig
			vpnState.Unlock()

			if status != "connected" {
				if status == "error" && activeCfg != "" {
					log.Printf("[VPN Monitor] VPN status is error. Attempting auto-reconnect...")
					creds, err := loadCredentials()
					if err == nil {
						if cred, ok := creds[activeCfg]; ok {
							vpnBroadcaster.Broadcast("SYSTEM: Auto-reconnecting VPN due to unexpected crash...")
							_ = startVPN(activeCfg, cred.Username, cred.Password, true)
						}
					}
				}
				pingFailCount = 0
				vpnState.Lock()
				vpnState.Latency = ""
				vpnState.Unlock()
				continue
			}

			agentURL := os.Getenv("DEV_AGENT_URL")
			if agentURL == "" {
				agentURL = os.Getenv("STG_AGENT_URL")
			}
			if agentURL == "" {
				agentURL = os.Getenv("PROD_AGENT_URL")
			}
			if agentURL == "" {
				agentURL = "http://ip-api.com/json/"
			}

			client := http.Client{Timeout: 3 * time.Second}
			start := time.Now()
			resp, err := client.Head(agentURL)
			duration := time.Since(start)

			if err == nil {
				resp.Body.Close()
				pingFailCount = 0
				latencyStr := fmt.Sprintf("%dms", duration.Milliseconds())
				vpnState.Lock()
				vpnState.Latency = latencyStr
				vpnState.Unlock()
			} else {
				pingFailCount++
				log.Printf("[VPN Monitor] Latency check failed (%d/3): %v", pingFailCount, err)

				vpnState.Lock()
				vpnState.Latency = "timeout"
				vpnState.Unlock()

				if pingFailCount >= 3 {
					log.Printf("[VPN Monitor] VPN connection failed 3 consecutive checks. Triggering auto-reconnect...")
					pingFailCount = 0

					_ = stopVPN()
					time.Sleep(3 * time.Second)

					creds, err := loadCredentials()
					if err == nil {
						if cred, ok := creds[activeCfg]; ok {
							vpnBroadcaster.Broadcast("SYSTEM: Auto-reconnecting VPN due to connection loss...")
							_ = startVPN(activeCfg, cred.Username, cred.Password, true)
						} else {
							log.Printf("[VPN Monitor] No saved credentials found for config: %s", activeCfg)
						}
					} else {
						log.Printf("[VPN Monitor] Failed to load credentials: %v", err)
					}
				}
			}
		}
	}()
}

// ─── OpenVPN Diagnostics & Conflict Inspection Engine ────────────────────────
func getVPNDiagnostics() *VPNDiagnosticsResponse {
	resp := &VPNDiagnosticsResponse{
		Processes:  make([]VPNProcessInfo, 0),
		Interfaces: make([]string, 0),
		Routes:     make([]string, 0),
		CheckedAt:  time.Now().Format("2006-01-02 15:04:05"),
	}

	var sb strings.Builder
	sb.WriteString("=================================================================\n")
	sb.WriteString("               🔍 KIỂM TRA TRẠNG THÁI OPENVPN                    \n")
	sb.WriteString("=================================================================\n\n")

	// 1. Process Check
	sb.WriteString("1️⃣  [TIẾN TRÌNH OPENVPN]\n")
	out, err := exec.Command("ps", "-eo", "pid,user,%cpu,%mem,stat,start,args").Output()
	if err == nil {
		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			trimmed := strings.TrimSpace(line)
			if trimmed == "" || strings.HasPrefix(trimmed, "PID") {
				continue
			}
			fields := strings.Fields(trimmed)
			if len(fields) >= 7 {
				cmdStr := strings.Join(fields[6:], " ")
				cmdLower := strings.ToLower(cmdStr)
				firstArg := strings.ToLower(fields[6])

				// Only count actual OpenVPN daemon processes, not the sudo parent launcher wrapper
				isDaemon := (firstArg == "openvpn" ||
					strings.HasSuffix(firstArg, "/openvpn") ||
					(strings.Contains(cmdLower, "openvpn --config") && !strings.HasPrefix(firstArg, "sudo"))) &&
					!strings.Contains(cmdLower, "pkill") &&
					!strings.Contains(cmdLower, "killall") &&
					!strings.Contains(cmdLower, "ids-commander") &&
					!strings.Contains(cmdLower, "grep") &&
					!strings.Contains(cmdLower, "vscode")

				if isDaemon {
					resp.Processes = append(resp.Processes, VPNProcessInfo{
						PID:     fields[0],
						User:    fields[1],
						CPU:     fields[2],
						Mem:     fields[3],
						Stat:    fields[4],
						Start:   fields[5],
						Command: cmdStr,
					})
				}
			}
		}
	}

	resp.ProcessCount = len(resp.Processes)
	if resp.ProcessCount == 0 {
		sb.WriteString("   ⚠️  Không có tiến trình OpenVPN nào đang chạy.\n")
	} else {
		if resp.ProcessCount > 1 {
			resp.HasConflict = true
			resp.ConflictMessage = fmt.Sprintf("⚠️ CẢNH BÁO: Phát hiện %d tiến trình OpenVPN đang chạy đồng thời! Các tiến trình này xung đột chiếm quyền tunnel và định tuyến, làm chậm hoặc ngắt kết nối mạng.", resp.ProcessCount)
			sb.WriteString(fmt.Sprintf("   🚨 CẢNH BÁO XUNG ĐỘT: Tìm thấy %d tiến trình OpenVPN đang chạy đồng thời!\n\n", resp.ProcessCount))
		} else {
			sb.WriteString(fmt.Sprintf("   ✅ Tìm thấy %d tiến trình OpenVPN đang chạy bình thường:\n\n", resp.ProcessCount))
		}

		sb.WriteString(fmt.Sprintf("   %-8s %-10s %-6s %-6s %-6s %-8s %s\n", "PID", "USER", "%CPU", "%MEM", "STAT", "START", "COMMAND"))
		for _, p := range resp.Processes {
			sb.WriteString(fmt.Sprintf("   %-8s %-10s %-6s %-6s %-6s %-8s %s\n", p.PID, p.User, p.CPU, p.Mem, p.Stat, p.Start, p.Command))
		}
	}

	sb.WriteString("\n-----------------------------------------------------------------\n")

	// 2. Network Interface Check
	sb.WriteString("2️⃣  [GIAO DIỆN MẠNG VPN (tun/utun)]\n")
	ifaceOut, err := exec.Command("ip", "-o", "addr", "show").Output()
	if err != nil {
		ifaceOut, _ = exec.Command("ifconfig").Output()
	}

	if len(ifaceOut) > 0 {
		for _, l := range strings.Split(string(ifaceOut), "\n") {
			lTrim := strings.TrimSpace(l)
			if lTrim == "" {
				continue
			}
			lLower := strings.ToLower(lTrim)
			if strings.Contains(lLower, "tun") || strings.Contains(lLower, "utun") || strings.Contains(lLower, "10.2.") {
				resp.Interfaces = append(resp.Interfaces, lTrim)
				sb.WriteString(fmt.Sprintf("   🌐 %s\n", lTrim))
			}
		}
	}

	if len(resp.Interfaces) == 0 {
		sb.WriteString("   ⚠️  Chưa tìm thấy IP tunnel 10.2.x.x hoặc interface tun/utun đang hoạt động.\n")
	}

	sb.WriteString("\n-----------------------------------------------------------------\n")

	// 3. Routing Table Check
	sb.WriteString("3️⃣  [ĐỊNH TUYẾN TỚI SERVER BSHIP & NỘI BỘ]\n")
	routeOut, err := exec.Command("ip", "route", "show").Output()
	if err != nil {
		routeOut, _ = exec.Command("netstat", "-nr", "-f", "inet").Output()
	}

	if len(routeOut) > 0 {
		for _, l := range strings.Split(string(routeOut), "\n") {
			lTrim := strings.TrimSpace(l)
			if lTrim == "" {
				continue
			}
			if strings.Contains(lTrim, "171.244.204") ||
				strings.Contains(lTrim, "14.225.249") ||
				strings.Contains(lTrim, "10.2.") ||
				strings.Contains(lTrim, "tun") ||
				strings.Contains(lTrim, "utun") {
				resp.Routes = append(resp.Routes, lTrim)
				sb.WriteString(fmt.Sprintf("   ➡️  %s\n", lTrim))
			}
		}
	}

	if len(resp.Routes) == 0 {
		sb.WriteString("   ⚠️  Chưa có route nội bộ nào (10.2.x, 171.244.204.x, 14.225.249.x) được nạp vào routing table.\n")
	} else {
		sb.WriteString("   ✅ Các tuyến đường nội bộ đã nạp thành công.\n")
	}

	sb.WriteString("\n=================================================================\n")
	sb.WriteString("💡 Gợi ý lệnh nhanh:\n")
	sb.WriteString("   - Tắt toàn bộ VPN:     sudo killall -9 openvpn (hoặc bấm 'Dọn sạch' trên UI)\n")
	sb.WriteString("=================================================================\n")

	resp.RawReport = sb.String()
	return resp
}

func killAllOpenVPNProcesses() (*VPNDiagnosticsResponse, error) {
	_ = exec.Command("sudo", "pkill", "-9", "-f", "openvpn").Run()
	_ = exec.Command("sudo", "killall", "-9", "openvpn").Run()
	time.Sleep(400 * time.Millisecond)

	vpnState.Lock()
	vpnState.Status = "disconnected"
	vpnState.IPAddress = ""
	vpnState.Interface = ""
	vpnState.ErrorMsg = ""
	vpnState.Latency = ""
	vpnState.cmd = nil
	vpnState.Unlock()

	cleanupTempAuth()
	vpnBroadcaster.Broadcast("SYSTEM: Đã dọn sạch toàn bộ tiến trình OpenVPN trên hệ thống.")

	return getVPNDiagnostics(), nil
}

func handleVPNDiagnostics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	diag := getVPNDiagnostics()
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(diag)
}

func handleVPNKillAll(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	diag, err := killAllOpenVPNProcesses()
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message":     "Đã dọn sạch toàn bộ tiến trình OpenVPN thành công",
		"diagnostics": diag,
	})
}
