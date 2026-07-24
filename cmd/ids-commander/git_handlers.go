package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

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

	unpushedMap := make(map[string]bool)
	cmdUnpushed := exec.Command(gitPath, "-c", "safe.directory=*", "rev-list", "@{u}..HEAD")
	cmdUnpushed.Dir = svc.Dir
	if outUnpushed, err := cmdUnpushed.CombinedOutput(); err == nil {
		hashes := strings.Fields(string(outUnpushed))
		for _, h := range hashes {
			unpushedMap[h] = true
		}
	}

	for _, line := range lines {
		parts := strings.SplitN(line, "|", 4)
		if len(parts) == 4 {
			hash := parts[0]
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

	hasStaging := false
	stagingRef := ""
	cmdStg := exec.Command(gitPath, "-c", "safe.directory=*", "show-ref", "--verify", "refs/heads/staging")
	cmdStg.Dir = svc.Dir
	if err := cmdStg.Run(); err == nil {
		stagingRef = "staging"
		hasStaging = true
	} else {
		cmdStgRemote := exec.Command(gitPath, "-c", "safe.directory=*", "show-ref", "--verify", "refs/remotes/origin/staging")
		cmdStgRemote.Dir = svc.Dir
		if err := cmdStgRemote.Run(); err == nil {
			stagingRef = "origin/staging"
			hasStaging = true
		}
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
		Name          string `json:"name"`
		Ahead         int    `json:"ahead"`
		Behind        int    `json:"behind"`
		AheadStaging  int    `json:"ahead_staging"`
		BehindStaging int    `json:"behind_staging"`
		HasStaging    bool   `json:"has_staging"`
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
			track := parts[1]
			if strings.Contains(track, "ahead") {
				fmt.Sscanf(track[strings.Index(track, "ahead")+6:], "%d", &ahead)
			}
			if strings.Contains(track, "behind") {
				fmt.Sscanf(track[strings.Index(track, "behind")+7:], "%d", &behind)
			}
		}

		aheadStaging := 0
		behindStaging := 0
		if hasStaging {
			if name == stagingRef || (stagingRef == "staging" && name == "staging") {
				// 0, 0
			} else {
				cmdComp := exec.Command(gitPath, "-c", "safe.directory=*", "rev-list", "--left-right", "--count", name+"..."+stagingRef)
				cmdComp.Dir = svc.Dir
				if outComp, err := cmdComp.CombinedOutput(); err == nil {
					parts := strings.Fields(strings.TrimSpace(string(outComp)))
					if len(parts) == 2 {
						fmt.Sscanf(parts[0], "%d", &aheadStaging)
						fmt.Sscanf(parts[1], "%d", &behindStaging)
					}
				}
			}
		}

		branches = append(branches, BranchInfo{
			Name:          name,
			Ahead:         ahead,
			Behind:        behind,
			AheadStaging:  aheadStaging,
			BehindStaging: behindStaging,
			HasStaging:    hasStaging,
		})
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

	args := append([]string{"-c", "safe.directory=*", "checkout", "--"}, data.Files...)
	cmd := exec.Command(gitPath, args...)
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()

	if err != nil {
		for _, f := range data.Files {
			fullPath := filepath.Join(svc.Dir, f)
			if _, statErr := os.Stat(fullPath); statErr == nil {
				os.RemoveAll(fullPath)
			}
		}
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
