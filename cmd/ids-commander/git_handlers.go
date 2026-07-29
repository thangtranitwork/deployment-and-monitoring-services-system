package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
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

func gitCompareHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	target := r.URL.Query().Get("target")
	if target == "" {
		target = "staging"
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	// Verify target reference
	cmdCheck := exec.Command(gitPath, "-c", "safe.directory=*", "rev-parse", "--verify", target)
	cmdCheck.Dir = svc.Dir
	if err := cmdCheck.Run(); err != nil {
		// Fallback to origin/target if local doesn't exist
		if !strings.HasPrefix(target, "origin/") {
			altTarget := "origin/" + target
			cmdCheckAlt := exec.Command(gitPath, "-c", "safe.directory=*", "rev-parse", "--verify", altTarget)
			cmdCheckAlt.Dir = svc.Dir
			if errAlt := cmdCheckAlt.Run(); errAlt == nil {
				target = altTarget
			}
		}
	}

	// 1. Get ahead commits: git log target..HEAD
	cmdCommits := exec.Command(gitPath, "-c", "safe.directory=*", "log", target+"..HEAD", "--pretty=format:%h|%an|%ar|%s")
	cmdCommits.Dir = svc.Dir
	outCommits, err := cmdCommits.CombinedOutput()

	type Commit struct {
		Hash    string `json:"hash"`
		Author  string `json:"author"`
		Date    string `json:"date"`
		Subject string `json:"subject"`
	}
	commits := []Commit{}

	if err == nil {
		lines := strings.Split(strings.TrimSpace(string(outCommits)), "\n")
		for _, line := range lines {
			if line == "" {
				continue
			}
			parts := strings.SplitN(line, "|", 4)
			if len(parts) == 4 {
				commits = append(commits, Commit{
					Hash:    parts[0],
					Author:  parts[1],
					Date:    parts[2],
					Subject: parts[3],
				})
			}
		}
	}

	// 2. Get changed files: git diff --name-status target..HEAD
	cmdDiff := exec.Command(gitPath, "-c", "safe.directory=*", "diff", "--name-status", target+"..HEAD")
	cmdDiff.Dir = svc.Dir
	outDiff, err := cmdDiff.CombinedOutput()

	type ChangedFile struct {
		Path   string `json:"path"`
		Status string `json:"status"`
	}
	files := []ChangedFile{}

	if err == nil {
		lines := strings.Split(strings.TrimSpace(string(outDiff)), "\n")
		for _, line := range lines {
			if line == "" {
				continue
			}
			parts := strings.Fields(line)
			if len(parts) >= 2 {
				statusChar := parts[0]
				filePath := parts[1]

				statusText := "Modified"
				if strings.HasPrefix(statusChar, "A") {
					statusText = "Added"
				} else if strings.HasPrefix(statusChar, "D") {
					statusText = "Deleted"
				} else if strings.HasPrefix(statusChar, "R") {
					statusText = "Renamed"
				} else if strings.HasPrefix(statusChar, "C") {
					statusText = "Copied"
				}

				files = append(files, ChangedFile{
					Path:   filePath,
					Status: statusText,
				})
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"target":  target,
		"commits": commits,
		"files":   files,
	})
}

func gitCompareAllHandler(w http.ResponseWriter, r *http.Request) {
	target := r.URL.Query().Get("target")
	if target == "" {
		target = "staging"
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	services := scanServices(s)

	type Commit struct {
		Hash    string `json:"hash"`
		Author  string `json:"author"`
		Date    string `json:"date"`
		Subject string `json:"subject"`
	}

	type ChangedFile struct {
		Path   string `json:"path"`
		Status string `json:"status"`
	}

	type ServiceCompareResult struct {
		Name         string        `json:"name"`
		LocalBranch  string        `json:"local_branch"`
		TargetBranch string        `json:"target_branch"`
		Commits      []Commit      `json:"commits"`
		Files        []ChangedFile `json:"files"`
		Error        string        `json:"error,omitempty"`
	}

	var results []ServiceCompareResult
	var wg sync.WaitGroup
	var mu sync.Mutex

	for _, svc := range services {
		wg.Add(1)
		go func(svc Service) {
			defer wg.Done()

			res := ServiceCompareResult{
				Name:         svc.Name,
				LocalBranch:  svc.Branch,
				TargetBranch: target,
				Commits:      []Commit{},
				Files:        []ChangedFile{},
			}

			targetRef := target
			cmdCheck := exec.Command(gitPath, "-c", "safe.directory=*", "rev-parse", "--verify", targetRef)
			cmdCheck.Dir = svc.Dir
			if err := cmdCheck.Run(); err != nil {
				if !strings.HasPrefix(targetRef, "origin/") {
					altTarget := "origin/" + targetRef
					cmdCheckAlt := exec.Command(gitPath, "-c", "safe.directory=*", "rev-parse", "--verify", altTarget)
					cmdCheckAlt.Dir = svc.Dir
					if errAlt := cmdCheckAlt.Run(); errAlt == nil {
						targetRef = altTarget
					} else {
						res.Error = fmt.Sprintf("Target branch %s or %s not found", target, altTarget)
						mu.Lock()
						results = append(results, res)
						mu.Unlock()
						return
					}
				} else {
					res.Error = fmt.Sprintf("Target branch %s not found", target)
					mu.Lock()
					results = append(results, res)
					mu.Unlock()
					return
				}
			}
			res.TargetBranch = targetRef

			// Get ahead commits: git log target..HEAD
			cmdCommits := exec.Command(gitPath, "-c", "safe.directory=*", "log", targetRef+"..HEAD", "--pretty=format:%h|%an|%ar|%s")
			cmdCommits.Dir = svc.Dir
			outCommits, err := cmdCommits.CombinedOutput()
			if err == nil {
				lines := strings.Split(strings.TrimSpace(string(outCommits)), "\n")
				for _, line := range lines {
					if line == "" {
						continue
					}
					parts := strings.SplitN(line, "|", 4)
					if len(parts) == 4 {
						res.Commits = append(res.Commits, Commit{
							Hash:    parts[0],
							Author:  parts[1],
							Date:    parts[2],
							Subject: parts[3],
						})
					}
				}
			}

			// Get changed files: git diff --name-status target..HEAD
			cmdDiff := exec.Command(gitPath, "-c", "safe.directory=*", "diff", "--name-status", targetRef+"..HEAD")
			cmdDiff.Dir = svc.Dir
			outDiff, err := cmdDiff.CombinedOutput()
			if err == nil {
				lines := strings.Split(strings.TrimSpace(string(outDiff)), "\n")
				for _, line := range lines {
					if line == "" {
						continue
					}
					parts := strings.Fields(line)
					if len(parts) >= 2 {
						statusChar := parts[0]
						filePath := parts[1]

						statusText := "Modified"
						if strings.HasPrefix(statusChar, "A") {
							statusText = "Added"
						} else if strings.HasPrefix(statusChar, "D") {
							statusText = "Deleted"
						} else if strings.HasPrefix(statusChar, "R") {
							statusText = "Renamed"
						} else if strings.HasPrefix(statusChar, "C") {
							statusText = "Copied"
						}

						res.Files = append(res.Files, ChangedFile{
							Path:   filePath,
							Status: statusText,
						})
					}
				}
			}

			mu.Lock()
			results = append(results, res)
			mu.Unlock()
		}(svc)
	}

	wg.Wait()

	sort.Slice(results, func(i, j int) bool {
		return results[i].Name < results[j].Name
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(results)
}

func gitStashShowHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	stashRef := r.URL.Query().Get("stash_ref")
	if stashRef == "" {
		http.Error(w, "stash_ref query parameter is required", http.StatusBadRequest)
		return
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "stash", "show", "--name-status", stashRef)
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		http.Error(w, fmt.Sprintf("Error running git stash show: %s", string(out)), http.StatusInternalServerError)
		return
	}

	type StashFile struct {
		Path   string `json:"path"`
		Status string `json:"status"`
	}
	var files []StashFile

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		parts := strings.Fields(line)
		if len(parts) >= 2 {
			statusChar := parts[0]
			filePath := parts[1]

			statusText := "Modified"
			if strings.HasPrefix(statusChar, "A") {
				statusText = "Added"
			} else if strings.HasPrefix(statusChar, "D") {
				statusText = "Deleted"
			} else if strings.HasPrefix(statusChar, "R") {
				statusText = "Renamed"
			} else if strings.HasPrefix(statusChar, "C") {
				statusText = "Copied"
			}

			files = append(files, StashFile{
				Path:   filePath,
				Status: statusText,
			})
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(files)
}

func gitStashDiffHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	stashRef := r.URL.Query().Get("stash_ref")
	filePath := r.URL.Query().Get("file_path")
	if stashRef == "" || filePath == "" {
		http.Error(w, "stash_ref and file_path query parameters are required", http.StatusBadRequest)
		return
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "diff", stashRef+"^!", "--", filePath)
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		if _, ok := err.(*exec.ExitError); !ok {
			http.Error(w, fmt.Sprintf("Error running git diff: %v: %s", err, string(out)), http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "text/plain")
	w.Write(out)
}

func gitChangesHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	if serviceName == "" {
		serviceName = strings.TrimPrefix(r.URL.Path, "/api/git/changes/")
	}
	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "status", "--porcelain")
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		http.Error(w, string(out), http.StatusInternalServerError)
		return
	}

	type GitChange struct {
		Path   string `json:"path"`
		Status string `json:"status"` // "M", "A", "D", etc.
		Staged bool   `json:"staged"`
	}

	changes := []GitChange{}
	lines := strings.Split(string(out), "\n")
	for _, line := range lines {
		if len(line) < 4 {
			continue
		}
		x := string(line[0])
		y := string(line[1])
		filePath := strings.TrimSpace(line[3:])

		// Handle renamed files: format "old -> new"
		if strings.Contains(filePath, " -> ") {
			parts := strings.Split(filePath, " -> ")
			if len(parts) > 1 {
				filePath = parts[1]
			}
		}

		// Clean quotes if git status wrapped it (e.g. non-ascii chars)
		filePath = strings.Trim(filePath, "\"")

		if x == "?" && y == "?" {
			// Untracked files
			changes = append(changes, GitChange{
				Path:   filePath,
				Status: "??",
				Staged: false,
			})
		} else {
			if x != " " && x != "?" {
				changes = append(changes, GitChange{
					Path:   filePath,
					Status: x,
					Staged: true,
				})
			}
			if y != " " && y != "?" {
				changes = append(changes, GitChange{
					Path:   filePath,
					Status: y,
					Staged: false,
				})
			}
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(changes)
}

func gitDiffHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	filePath := r.URL.Query().Get("file_path")
	stagedStr := r.URL.Query().Get("staged")
	isUntrackedStr := r.URL.Query().Get("untracked")
	if filePath == "" {
		http.Error(w, "file_path is required", http.StatusBadRequest)
		return
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	var args []string
	if isUntrackedStr == "true" {
		// Use os.DevNull as comparison baseline for untracked files
		args = []string{"-c", "safe.directory=*", "diff", "--no-index", os.DevNull, filePath}
	} else if stagedStr == "true" {
		args = []string{"-c", "safe.directory=*", "diff", "--cached", "--", filePath}
	} else {
		args = []string{"-c", "safe.directory=*", "diff", "--", filePath}
	}

	cmd := exec.Command(gitPath, args...)
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		if _, ok := err.(*exec.ExitError); !ok {
			http.Error(w, fmt.Sprintf("Error running git diff: %v: %s", err, string(out)), http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "text/plain")
	w.Write(out)
}

func gitStageHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	var data struct {
		FilePath string `json:"file_path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if data.FilePath == "" {
		http.Error(w, "file_path is required", http.StatusBadRequest)
		return
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "add", data.FilePath)
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		http.Error(w, string(out), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": "File staged successfully"})
}

func gitUnstageHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	var data struct {
		FilePath string `json:"file_path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if data.FilePath == "" {
		http.Error(w, "file_path is required", http.StatusBadRequest)
		return
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "restore", "--staged", "--", data.FilePath)
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		http.Error(w, string(out), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": "File unstaged successfully"})
}

func gitDiscardHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	var data struct {
		FilePath  string `json:"file_path"`
		Untracked bool   `json:"untracked"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if data.FilePath == "" {
		http.Error(w, "file_path is required", http.StatusBadRequest)
		return
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	var cmd *exec.Cmd
	if data.Untracked {
		cmd = exec.Command(gitPath, "-c", "safe.directory=*", "clean", "-fd", "--", data.FilePath)
	} else {
		cmd = exec.Command(gitPath, "-c", "safe.directory=*", "checkout", "--", data.FilePath)
	}
	cmd.Dir = svc.Dir
	out, err := cmd.CombinedOutput()
	if err != nil {
		http.Error(w, string(out), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": "Changes discarded successfully"})
}

func gitCommitHandler(w http.ResponseWriter, r *http.Request) {
	serviceName := r.PathValue("service_name")
	var data struct {
		Message  string `json:"message"`
		StageAll bool   `json:"stage_all"`
	}
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(data.Message) == "" {
		http.Error(w, "Commit message cannot be empty", http.StatusBadRequest)
		return
	}

	s := loadSettings()
	gitPath := getGitPath(s)
	svc := getServiceInfo(s.WorkspaceURL, serviceName, gitPath)
	if svc == nil {
		http.Error(w, "Service not found", http.StatusNotFound)
		return
	}

	if data.StageAll {
		cmdAdd := exec.Command(gitPath, "-c", "safe.directory=*", "add", "-A")
		cmdAdd.Dir = svc.Dir
		if outAdd, err := cmdAdd.CombinedOutput(); err != nil {
			http.Error(w, fmt.Sprintf("Error staging files: %s", string(outAdd)), http.StatusInternalServerError)
			return
		}
	}

	cmdCommit := exec.Command(gitPath, "-c", "safe.directory=*", "commit", "-m", data.Message)
	cmdCommit.Dir = svc.Dir
	outCommit, err := cmdCommit.CombinedOutput()
	if err != nil {
		http.Error(w, fmt.Sprintf("Error committing: %s", string(outCommit)), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "ok", "message": "Committed successfully", "output": string(outCommit)})
}

