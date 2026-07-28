package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
)

type TerminalExecRequest struct {
	ServiceName string `json:"service_name"`
	Command     string `json:"command"`
}

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
	cmd.Dir = svc.Dir

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
