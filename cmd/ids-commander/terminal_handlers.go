package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"sync"
	"time"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

type TerminalExecRequest struct {
	ServiceName string `json:"service_name"`
	Command     string `json:"command"`
}

type TerminalMessage struct {
	Type string `json:"type"` // "input", "resize"
	Data string `json:"data"`
	Cols uint16 `json:"cols"`
	Rows uint16 `json:"rows"`
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

// terminalExecHandler provides stateless HTTP SSE command execution for fallback & deploy scripts
func terminalExecHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req TerminalExecRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.ServiceName == "" || req.Command == "" {
		http.Error(w, "service_name and command are required", http.StatusBadRequest)
		return
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, req.ServiceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	// Use last known working dir if available
	serviceWorkingDirMu.RLock()
	startDir, exists := serviceWorkingDir[req.ServiceName]
	serviceWorkingDirMu.RUnlock()

	if !exists || startDir == "" {
		startDir = svc.Dir
	} else if _, err := os.Stat(startDir); err != nil {
		startDir = svc.Dir
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

	cmd := exec.Command("bash", "-c", req.Command)
	cmd.Dir = startDir

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		send(fmt.Sprintf("Error creating stdout pipe: %v", err))
		send("[EOF]")
		return
	}
	cmd.Stderr = cmd.Stdout

	if err := cmd.Start(); err != nil {
		send(fmt.Sprintf("Error starting command: %v", err))
		send("[EOF]")
		return
	}

	scanner := bufio.NewScanner(stdout)
	for scanner.Scan() {
		send(scanner.Text())
	}

	if err := cmd.Wait(); err != nil {
		send(fmt.Sprintf("Command finished with error: %v", err))
	}
	send("[EOF]")
}

// terminalWebSocketHandler provides stateful interactive PTY terminal sessions over WebSocket
func terminalWebSocketHandler(w http.ResponseWriter, r *http.Request) {
	svcName := r.PathValue("service_name")
	if svcName == "" {
		svcName = strings.TrimPrefix(r.URL.Path, "/api/terminal/ws/")
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, svcName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	// Determine starting working directory for this service
	serviceWorkingDirMu.RLock()
	startDir, exists := serviceWorkingDir[svcName]
	serviceWorkingDirMu.RUnlock()

	if !exists || startDir == "" {
		startDir = svc.Dir
	} else if _, err := os.Stat(startDir); err != nil {
		startDir = svc.Dir
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS Terminal] Upgrade error for service %s: %v", svcName, err)
		return
	}
	defer conn.Close()

	// Spawn bash subshell with PTY
	cmd := exec.Command("bash")
	cmd.Dir = startDir
	cmd.Env = append(os.Environ(), "TERM=xterm-256color", "COLORTERM=truecolor")

	ptyFile, err := pty.Start(cmd)
	if err != nil {
		conn.WriteMessage(websocket.TextMessage, []byte("\r\nError starting PTY shell: "+err.Error()+"\r\n"))
		return
	}
	defer func() {
		ptyFile.Close()
		if cmd.Process != nil {
			cmd.Process.Kill()
		}
	}()

	var writeMu sync.Mutex

	// Send initial working dir message
	initialCwdMsg, _ := json.Marshal(map[string]string{
		"type": "cwd",
		"path": startDir,
	})
	writeMu.Lock()
	conn.WriteMessage(websocket.TextMessage, initialCwdMsg)
	writeMu.Unlock()

	// Periodic task to inspect current working directory of bash subshell
	go func() {
		var lastSentCwd string = startDir
		ticker := time.NewTicker(500 * time.Millisecond)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if cmd.Process == nil {
					return
				}
				cwd, err := os.Readlink(fmt.Sprintf("/proc/%d/cwd", cmd.Process.Pid))
				if err == nil && cwd != "" {
					serviceWorkingDirMu.Lock()
					serviceWorkingDir[svcName] = cwd
					serviceWorkingDirMu.Unlock()

					if cwd != lastSentCwd {
						lastSentCwd = cwd
						cwdMsg, _ := json.Marshal(map[string]string{
							"type": "cwd",
							"path": cwd,
						})
						writeMu.Lock()
						conn.WriteMessage(websocket.TextMessage, cwdMsg)
						writeMu.Unlock()
					}
				}
			}
		}
	}()

	// Read PTY output -> Write to WebSocket
	go func() {
		buf := make([]byte, 8192)
		for {
			n, err := ptyFile.Read(buf)
			if err != nil {
				if err != io.EOF {
					log.Printf("[WS Terminal] PTY read error: %v", err)
				}
				break
			}
			if n > 0 {
				writeMu.Lock()
				err = conn.WriteMessage(websocket.TextMessage, buf[:n])
				writeMu.Unlock()
				if err != nil {
					break
				}
			}
		}
	}()

	// Read WebSocket input -> Write to PTY
	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			break
		}

		if messageType == websocket.TextMessage {
			var msg TerminalMessage
			if err := json.Unmarshal(p, &msg); err == nil && msg.Type != "" {
				switch msg.Type {
				case "resize":
					if msg.Cols > 0 && msg.Rows > 0 {
						_ = pty.Setsize(ptyFile, &pty.Winsize{
							Rows: msg.Rows,
							Cols: msg.Cols,
						})
					}
				case "input":
					ptyFile.Write([]byte(msg.Data))
				}
			} else {
				ptyFile.Write(p)
			}
		} else if messageType == websocket.BinaryMessage {
			ptyFile.Write(p)
		}
	}
}

// terminalCwdHandler returns the current working directory for a given service
func terminalCwdHandler(w http.ResponseWriter, r *http.Request) {
	svcName := r.PathValue("service_name")
	if svcName == "" {
		svcName = strings.TrimPrefix(r.URL.Path, "/api/terminal/cwd/")
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, svcName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	serviceWorkingDirMu.RLock()
	cwd, exists := serviceWorkingDir[svcName]
	serviceWorkingDirMu.RUnlock()

	if !exists || cwd == "" {
		cwd = svc.Dir
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"cwd": cwd})
}

// terminalSnippetsHandler returns or updates quick terminal command snippets
func terminalSnippetsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	s := loadSettings()

	if len(s.TerminalSnippets) == 0 {
		s.TerminalSnippets = []string{
			"go mod tidy",
			"go test ./...",
			"git status",
			"git log -n 5 --oneline",
			"ls -la",
		}
	}

	if r.Method == http.MethodGet {
		json.NewEncoder(w).Encode(s.TerminalSnippets)
		return
	}

	if r.Method == http.MethodPost {
		var req struct {
			Snippets []string `json:"snippets"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		s.TerminalSnippets = req.Snippets
		saveSettings(s)
		json.NewEncoder(w).Encode(map[string]interface{}{"success": true, "snippets": s.TerminalSnippets})
		return
	}

	http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
}
