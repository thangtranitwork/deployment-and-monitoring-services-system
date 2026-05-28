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

	for _, cfg := range s.Services {
		folderPath := filepath.Join(s.WorkspaceURL, cfg.Folder)
		if _, err := os.Stat(folderPath); err != nil {
			log.Printf("[Scan] Folder %s not found for service %s", folderPath, cfg.Name)
			continue
		}

		if svc := getServiceInfo(s.WorkspaceURL, cfg.Name, gitPath); svc != nil {
			services = append(services, *svc)
		}
	}

	sort.Slice(services, func(i, j int) bool {
		return services[i].Name < services[j].Name
	})

	return services
}

func getServiceInfo(workspaceURL, name, gitPath string) *Service {
	var targetCfg *ServiceConfig
	for _, cfg := range settings.Services {
		if cfg.Name == name {
			targetCfg = &cfg
			break
		}
	}

	if targetCfg == nil {
		targetCfg = &ServiceConfig{
			Folder: name,
			Name:   name,
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
		Name:         targetCfg.Name,
		Dir:          folderPath,
		Branch:       branch,
		Tag:          tag,
		LastCommit:   lastCommit,
		HasDev:       targetCfg.DevCmd != "",
		HasStg:       targetCfg.StgCmd != "",
		DevScript:    targetCfg.DevCmd,
		StgScript:    targetCfg.StgCmd,
		PreDeployCmd: targetCfg.PreDeployCmd,
		HasStash:     hasStash,
		Ahead:        ahead,
		Behind:       behind,
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
