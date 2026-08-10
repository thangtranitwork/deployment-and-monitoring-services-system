package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"time"
)

func scanServices(s Settings) []Service {
	return scanWorkspaceServices(s, "")
}

func scanWorkspaceServices(s Settings, wsID string) []Service {
	gitPath := getGitPath(s)
	var services []Service

	var ws *WorkspaceItem
	if wsID != "" {
		ws = s.GetWorkspaceByID(wsID)
		if ws == nil {
			ws = s.GetWorkspaceByPath(wsID)
		}
	}
	if ws == nil {
		ws = s.GetActiveWorkspace()
	}
	if ws == nil || ws.Path == "" {
		return services
	}

	entries, err := os.ReadDir(ws.Path)
	if err != nil {
		log.Printf("[Scan] Error reading workspace path '%s': %v", ws.Path, err)
		return services
	}

	configuredFolders := make(map[string]bool)

	// 1. Process explicitly configured services for this workspace
	for _, cfg := range ws.Services {
		configuredFolders[cfg.Folder] = true
		if !cfg.Enabled {
			continue
		}
		if svc := getServiceInfoForWorkspace(ws, cfg.Name, gitPath); svc != nil {
			services = append(services, *svc)
		}
	}

	// 2. Scan workspace directory for unconfigured folders
	for _, entry := range entries {
		if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		folderName := entry.Name()
		if !configuredFolders[folderName] {
			if svc := getServiceInfoForWorkspace(ws, folderName, gitPath); svc != nil {
				services = append(services, *svc)
			}
		}
	}

	sort.Slice(services, func(i, j int) bool {
		return services[i].Name < services[j].Name
	})

	return services
}

func getServiceInfo(workspaceURL, serviceName, gitPath string) *Service {
	s := loadSettings()
	var ws *WorkspaceItem
	if workspaceURL != "" {
		ws = s.GetWorkspaceByPath(workspaceURL)
	}
	if ws == nil {
		ws = s.GetActiveWorkspace()
	}
	if ws == nil {
		if workspaceURL == "" {
			return nil
		}
		ws = &WorkspaceItem{ID: "ws-tmp", Name: "Tmp", Path: workspaceURL}
	}
	return getServiceInfoForWorkspace(ws, serviceName, gitPath)
}

func getServiceInfoForWorkspace(ws *WorkspaceItem, serviceName, gitPath string) *Service {
	if ws == nil || ws.Path == "" {
		return nil
	}

	var targetCfg *ServiceConfig

	// 1. Search in ws.Services by name
	for i := range ws.Services {
		cfg := &ws.Services[i]
		if cfg.Name == serviceName {
			targetCfg = cfg
			break
		}
	}

	// 2. Search in ws.Services by folder
	if targetCfg == nil {
		for i := range ws.Services {
			cfg := &ws.Services[i]
			if cfg.Folder == serviceName {
				targetCfg = cfg
				break
			}
		}
	}

	// 3. Fallback default config
	if targetCfg == nil {
		targetCfg = &ServiceConfig{
			Enabled: true,
			Folder:  serviceName,
			Name:    serviceName,
		}
	}

	folderPath := filepath.Join(ws.Path, targetCfg.Folder)
	if _, err := os.Stat(folderPath); err != nil {
		return nil
	}

	branch := "unknown"
	cmd := exec.Command(gitPath, "-c", "safe.directory=*", "rev-parse", "--abbrev-ref", "HEAD")
	cmd.Dir = folderPath
	if out, err := cmd.CombinedOutput(); err == nil {
		branch = strings.TrimSpace(string(out))
	}

	tag := ""

	lastCommit := ""
	cmd = exec.Command(gitPath, "-c", "safe.directory=*", "log", "-1", "--pretty=%s")
	cmd.Dir = folderPath
	if out, err := cmd.CombinedOutput(); err == nil {
		lastCommit = strings.TrimSpace(string(out))
	}

	hasStash := false
	cmd = exec.Command(gitPath, "-c", "safe.directory=*", "stash", "list")
	cmd.Dir = folderPath
	if out, err := cmd.CombinedOutput(); err == nil {
		if len(strings.TrimSpace(string(out))) > 0 {
			hasStash = true
		}
	}

	ahead := 0
	behind := 0
	cmd = exec.Command(gitPath, "-c", "safe.directory=*", "rev-list", "--left-right", "--count", "HEAD...@{u}")
	cmd.Dir = folderPath
	if out, err := cmd.CombinedOutput(); err == nil {
		parts := strings.Fields(strings.TrimSpace(string(out)))
		if len(parts) == 2 {
			fmt.Sscanf(parts[0], "%d", &ahead)
			fmt.Sscanf(parts[1], "%d", &behind)
		}
	}

	aheadStaging := 0
	behindStaging := 0
	hasStaging := false
	stagingRef := ""
	cmdStg := exec.Command(gitPath, "-c", "safe.directory=*", "show-ref", "--verify", "refs/heads/staging")
	cmdStg.Dir = folderPath
	errStgLocal := cmdStg.Run()
	if errStgLocal == nil {
		stagingRef = "staging"
		hasStaging = true
	} else {
		cmdStgRemote := exec.Command(gitPath, "-c", "safe.directory=*", "show-ref", "--verify", "refs/remotes/origin/staging")
		cmdStgRemote.Dir = folderPath
		errStgRemote := cmdStgRemote.Run()
		if errStgRemote == nil {
			stagingRef = "origin/staging"
			hasStaging = true
		} else {
			log.Printf("[Git Debug] Service %s local err: %v, remote err: %v", targetCfg.Name, errStgLocal, errStgRemote)
		}
	}

	if hasStaging {
		cmdStgComp := exec.Command(gitPath, "-c", "safe.directory=*", "rev-list", "--left-right", "--count", "HEAD..."+stagingRef)
		cmdStgComp.Dir = folderPath
		out, err := cmdStgComp.CombinedOutput()
		if err == nil {
			parts := strings.Fields(strings.TrimSpace(string(out)))
			if len(parts) == 2 {
				fmt.Sscanf(parts[0], "%d", &aheadStaging)
				fmt.Sscanf(parts[1], "%d", &behindStaging)
			}
		} else {
			log.Printf("[Git Debug] Service %s rev-list err: %v, out: %s", targetCfg.Name, err, string(out))
		}
	}

	stagedChanges := 0
	cmd = exec.Command(gitPath, "-c", "safe.directory=*", "status", "--porcelain")
	cmd.Dir = folderPath
	if out, err := cmd.CombinedOutput(); err == nil {
		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			if len(line) >= 2 {
				indexStatus := line[0]
				if indexStatus != ' ' && indexStatus != '?' {
					stagedChanges++
				}
			}
		}
	}

	return &Service{
		Name:           targetCfg.Name,
		Dir:            folderPath,
		Branch:         branch,
		Tag:            tag,
		LastCommit:     lastCommit,
		HasDev:         targetCfg.DevCmd != "",
		HasStg:         targetCfg.StgCmd != "",
		HasProd:        targetCfg.ProdCmd != "",
		DevScript:      targetCfg.DevCmd,
		StgScript:      targetCfg.StgCmd,
		ProdScript:     targetCfg.ProdCmd,
		PreDeployCmd:   targetCfg.PreDeployCmd,
		HasStash:       hasStash,
		Ahead:          ahead,
		Behind:         behind,
		AheadStaging:   aheadStaging,
		BehindStaging:  behindStaging,
		HasStaging:     hasStaging,
		StagedChanges:  stagedChanges,
		ShowProduction: targetCfg.ShowProduction,
	}
}

func getLatestMetricsForService(env, serviceName string) *ServiceMetrics {
	metricsMu.RLock()
	defer metricsMu.RUnlock()

	if m, ok := globalMetrics[env][serviceName]; ok {
		return &m
	}
	return nil
}

func startMetricsCollector() {
	ticker := time.NewTicker(5 * time.Second)
	go func() {
		for range ticker.C {
			s := loadSettings()
			ws := s.GetActiveWorkspace()
			devURL, stgURL, prodURL := s.GetAgentURLs(ws)

			envs := []struct {
				name string
				url  string
			}{
				{"Development", devURL},
				{"Staging", stgURL},
				{"Production", prodURL},
			}

			for _, e := range envs {
				if e.url == "" {
					continue
				}

				targetURL := strings.TrimRight(e.url, "/") + "/health"

				go func(envName, url string) {
					client := http.Client{Timeout: 3 * time.Second}
					resp, err := client.Get(url)
					if err != nil {
						return
					}
					defer resp.Body.Close()

					var metrics []ServiceMetrics
					if err := json.NewDecoder(resp.Body).Decode(&metrics); err == nil {
						metricsMu.Lock()
						if globalMetrics[envName] == nil {
							globalMetrics[envName] = make(map[string]ServiceMetrics)
						}
						newMap := make(map[string]ServiceMetrics)
						for _, m := range metrics {
							newMap[m.Service] = m
						}
						globalMetrics[envName] = newMap
						metricsMu.Unlock()
					}
				}(e.name, targetURL)
			}
		}
	}()
}
