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
	gitPath := getGitPath(s)
	var services []Service

	// 1. Get all folders in workspace
	entries, err := os.ReadDir(s.WorkspaceURL)
	if err != nil {
		log.Printf("[Scan] Error reading workspace: %v", err)
		return services
	}

	// Track folders that are explicitly configured
	configuredFolders := make(map[string]bool)

	// 2. Process all explicitly configured services
	for _, cfg := range s.Services {
		configuredFolders[cfg.Folder] = true
		if !cfg.Enabled {
			continue
		}
		if svc := getServiceInfo(s.WorkspaceURL, cfg.Name, gitPath); svc != nil {
			services = append(services, *svc)
		}
	}

	// 3. Scan workspace for any new/unconfigured folders
	for _, entry := range entries {
		if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
			continue
		}

		folderName := entry.Name()
		if !configuredFolders[folderName] {
			if svc := getServiceInfo(s.WorkspaceURL, folderName, gitPath); svc != nil {
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
	var targetCfg *ServiceConfig
	
	// 1. Search by service name in the configured services first
	for i := range settings.Services {
		if settings.Services[i].Name == serviceName {
			targetCfg = &settings.Services[i]
			break
		}
	}

	// 2. Search by folder if no config name matches
	if targetCfg == nil {
		for i := range settings.Services {
			if settings.Services[i].Folder == serviceName {
				targetCfg = &settings.Services[i]
				break
			}
		}
	}

	// 3. Create a default config if still not found
	if targetCfg == nil {
		targetCfg = &ServiceConfig{
			Enabled: true,
			Folder:  serviceName,
			Name:    serviceName,
		}
	}

	folderPath := filepath.Join(workspaceURL, targetCfg.Folder)
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
			envs := []string{"Development", "Staging", "Production"}
			for _, env := range envs {
				url := ""
				if env == "Development" && settings.DevAgentURL != "" {
					url = settings.DevAgentURL + "/health"
				} else if env == "Staging" && settings.StgAgentURL != "" {
					url = settings.StgAgentURL + "/health"
				} else if env == "Production" && settings.ProdAgentURL != "" {
					url = settings.ProdAgentURL + "/health"
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
