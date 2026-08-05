package main

import (
	"encoding/json"
	"log"
	"os"
	"fmt"
	"time"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

func getSettingsPath() string {
	return filepath.Join(basePath, "settings.json")
}

func loadSettings() Settings {
	s := Settings{
		UserName:          "",
		GitBashPath:       "",
		ActiveWorkspaceID: "",
		WorkspaceURL:      "",
		PreDeployCmd:      "",
		GoPrivate:         "",
		DevAgentURL:       os.Getenv("DEV_AGENT_URL"),
		StgAgentURL:       os.Getenv("STG_AGENT_URL"),
		ProdAgentURL:      os.Getenv("PROD_AGENT_URL"),
		ShowProduction:    false,
		CustomCmds:        make(map[string]string),
		Services:          make([]ServiceConfig, 0),
		Workspaces:        make([]WorkspaceItem, 0),
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

	if s.CustomCmds == nil {
		s.CustomCmds = make(map[string]string)
	}
	if s.Workspaces == nil {
		s.Workspaces = make([]WorkspaceItem, 0)
	}

	// Auto-migrate single workspace_url into workspaces array if empty
	if len(s.Workspaces) == 0 && s.WorkspaceURL != "" {
		wsName := filepath.Base(s.WorkspaceURL)
		if wsName == "." || wsName == "/" {
			wsName = "Main Workspace"
		}
		s.Workspaces = append(s.Workspaces, WorkspaceItem{
			ID:   "ws-default",
			Name: wsName,
			Path: s.WorkspaceURL,
		})
	}

	// Ensure all workspaces have valid IDs and initialized Services slice
	for i := range s.Workspaces {
		if s.Workspaces[i].ID == "" {
			s.Workspaces[i].ID = fmt.Sprintf("ws-%d", i+1)
		}
		if s.Workspaces[i].Services == nil {
			s.Workspaces[i].Services = make([]ServiceConfig, 0)
		}
	}

	// Ensure ActiveWorkspaceID and WorkspaceURL are in sync
	activeWs := s.GetActiveWorkspace()
	if activeWs != nil {
		s.ActiveWorkspaceID = activeWs.ID
		s.WorkspaceURL = activeWs.Path
	}

	// Migrate flat s.Services into respective s.Workspaces[i].Services if flat Services exist
	if len(s.Services) > 0 {
		migrateFlatServicesToWorkspaces(&s)
	}

	// Always fallback to ENV if JSON has empty strings
	if s.DevAgentURL == "" {
		s.DevAgentURL = os.Getenv("DEV_AGENT_URL")
	}
	if s.StgAgentURL == "" {
		s.StgAgentURL = os.Getenv("STG_AGENT_URL")
	}

	settings = s
	return s
}

func migrateFlatServicesToWorkspaces(s *Settings) {
	log.Printf("[Settings] Migrating flat services array (%d items) into nested Workspaces...", len(s.Services))
	for _, svc := range s.Services {
		targetWsPath := svc.WorkspaceURL
		if targetWsPath == "" {
			targetWsPath = s.WorkspaceURL
		}

		var targetWs *WorkspaceItem
		for i := range s.Workspaces {
			if filepath.Clean(s.Workspaces[i].Path) == filepath.Clean(targetWsPath) {
				targetWs = &s.Workspaces[i]
				break
			}
		}

		if targetWs == nil {
			// Create a new workspace for this unassigned path
			wsName := filepath.Base(targetWsPath)
			if wsName == "." || wsName == "/" {
				wsName = "Workspace " + targetWsPath
			}
			newWs := WorkspaceItem{
				ID:       fmt.Sprintf("ws-%d", time.Now().UnixNano()),
				Name:     wsName,
				Path:     targetWsPath,
				Services: []ServiceConfig{svc},
			}
			s.Workspaces = append(s.Workspaces, newWs)
		} else {
			// Check if service already exists in workspace
			exists := false
			for _, existingSvc := range targetWs.Services {
				if existingSvc.Name == svc.Name || existingSvc.Folder == svc.Folder {
					exists = true
					break
				}
			}
			if !exists {
				targetWs.Services = append(targetWs.Services, svc)
			}
		}
	}

	// Clear flat services array after migration
	s.Services = nil
	_ = saveSettings(*s)
	log.Printf("[Settings] Nested workspace migration completed successfully!")
}

func (s Settings) GetActiveWorkspace() *WorkspaceItem {
	if s.WorkspaceURL != "" {
		cleanURL := filepath.Clean(s.WorkspaceURL)
		for i := range s.Workspaces {
			if filepath.Clean(s.Workspaces[i].Path) == cleanURL {
				return &s.Workspaces[i]
			}
		}
	}
	if s.ActiveWorkspaceID != "" {
		for i := range s.Workspaces {
			if s.Workspaces[i].ID == s.ActiveWorkspaceID {
				return &s.Workspaces[i]
			}
		}
	}
	if len(s.Workspaces) > 0 {
		return &s.Workspaces[0]
	}
	return nil
}

func (s Settings) GetWorkspaceByID(id string) *WorkspaceItem {
	for i := range s.Workspaces {
		if s.Workspaces[i].ID == id {
			return &s.Workspaces[i]
		}
	}
	return nil
}

func (s Settings) GetWorkspaceByPath(path string) *WorkspaceItem {
	clean := filepath.Clean(path)
	for i := range s.Workspaces {
		if filepath.Clean(s.Workspaces[i].Path) == clean {
			return &s.Workspaces[i]
		}
	}
	return nil
}

func (s Settings) GetAgentURLs(ws *WorkspaceItem) (devURL, stgURL, prodURL string) {
	devURL = s.DevAgentURL
	stgURL = s.StgAgentURL
	prodURL = s.ProdAgentURL

	if ws != nil {
		if ws.DevAgentURL != "" {
			devURL = ws.DevAgentURL
		}
		if ws.StgAgentURL != "" {
			stgURL = ws.StgAgentURL
		}
		if ws.ProdAgentURL != "" {
			prodURL = ws.ProdAgentURL
		}
	}

	if devURL == "" {
		devURL = os.Getenv("DEV_AGENT_URL")
	}
	if stgURL == "" {
		stgURL = os.Getenv("STG_AGENT_URL")
	}
	if prodURL == "" {
		prodURL = os.Getenv("PROD_AGENT_URL")
	}
	return
}

func saveSettings(s Settings) error {
	f, err := os.Create(getSettingsPath())
	if err != nil {
		return err
	}
	defer f.Close()
	encoder := json.NewEncoder(f)
	encoder.SetIndent("", "    ")
	err = encoder.Encode(s)
	if err == nil {
		settings = s
	}
	return err
}

func migrateSettings(s *Settings) {
	if len(s.Workspaces) > 0 {
		for _, ws := range s.Workspaces {
			if len(ws.Services) > 0 {
				return
			}
		}
	}

	// 1. Migrate from custom_cmds map
	if len(s.CustomCmds) > 0 {
		cmdMap := make(map[string]*ServiceConfig)
		for key, val := range s.CustomCmds {
			parts := strings.Split(key, ":")
			if len(parts) == 2 {
				folder := parts[0]
				env := parts[1]

				cfg, ok := cmdMap[folder]
				if !ok {
					cfg = &ServiceConfig{
						Enabled: true,
						Folder:  folder,
						Name:    folder,
					}
					cmdMap[folder] = cfg
				}
				if env == "dev" {
					cfg.DevCmd = val
				} else if env == "stg" {
					cfg.StgCmd = val
				}
			}
		}
		for _, cfg := range cmdMap {
			s.Services = append(s.Services, *cfg)
		}
	}

	// 2. Fallback to scanning workspace directories for physical deploy scripts
	if len(s.Services) == 0 && s.WorkspaceURL != "" {
		entries, err := os.ReadDir(s.WorkspaceURL)
		if err == nil {
			for _, entry := range entries {
				if !entry.IsDir() || strings.HasPrefix(entry.Name(), ".") {
					continue
				}
				folderName := entry.Name()
				path := filepath.Join(s.WorkspaceURL, folderName)

				devCmd := ""
				stgCmd := ""
				prodCmd := ""

				// Check standard scripts
				if _, err := os.Stat(filepath.Join(path, "deploy-dev.sh")); err == nil {
					devCmd = "./deploy-dev.sh"
				} else if _, err := os.Stat(filepath.Join(path, "scripts", "deploy-dev.sh")); err == nil {
					devCmd = "./scripts/deploy-dev.sh"
				}

				if _, err := os.Stat(filepath.Join(path, "deploy-stg.sh")); err == nil {
					stgCmd = "./deploy-stg.sh"
				} else if _, err := os.Stat(filepath.Join(path, "scripts", "deploy-stg.sh")); err == nil {
					stgCmd = "./scripts/deploy-stg.sh"
				}

				if _, err := os.Stat(filepath.Join(path, "deploy-prod.sh")); err == nil {
					prodCmd = "./deploy-prod.sh"
				} else if _, err := os.Stat(filepath.Join(path, "scripts", "deploy-prod.sh")); err == nil {
					prodCmd = "./scripts/deploy-prod.sh"
				}

				// Check frontend scripts
				devFE := ""
				stgFE := ""
				prodFE := ""
				if _, err := os.Stat(filepath.Join(path, "deploy-front-end-dev.sh")); err == nil {
					devFE = "./deploy-front-end-dev.sh"
				}
				if _, err := os.Stat(filepath.Join(path, "deploy-front-end-stg.sh")); err == nil {
					stgFE = "./deploy-front-end-stg.sh"
				} else if _, err := os.Stat(filepath.Join(path, "deploy-front-end.sh")); err == nil {
					stgFE = "./deploy-front-end.sh"
				}
				if _, err := os.Stat(filepath.Join(path, "deploy-front-end-prod.sh")); err == nil {
					prodFE = "./deploy-front-end-prod.sh"
				}

				alias := folderName

				if devCmd != "" || stgCmd != "" || prodCmd != "" {
					s.Services = append(s.Services, ServiceConfig{
						Enabled:        true,
						Folder:         folderName,
						Name:           alias,
						DevCmd:         devCmd,
						StgCmd:         stgCmd,
						ProdCmd:        prodCmd,
						ShowProduction: prodCmd != "",
					})
				}

				if devFE != "" || stgFE != "" || prodFE != "" {
					feAlias := alias + "-front-end"
					if alias == "crm-service" {
						feAlias = "crm-front-end"
					}
					s.Services = append(s.Services, ServiceConfig{
						Enabled:        true,
						Folder:         folderName,
						Name:           feAlias,
						DevCmd:         devFE,
						StgCmd:         stgFE,
						ProdCmd:        prodFE,
						ShowProduction: prodFE != "",
					})
				}
			}
		}
	}

	_ = saveSettings(*s)
}

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
			gitPath := filepath.Join(filepath.Dir(filepath.Dir(s.GitBashPath)), "cmd", "git.exe")
			if _, err := os.Stat(gitPath); err == nil {
				return gitPath
			}
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
	if s.GoPrivate != "" {
		os.Setenv("GOPRIVATE", s.GoPrivate)
		log.Printf("[Env] GOPRIVATE set to: %s", s.GoPrivate)
	}

	if runtime.GOOS != "windows" {
		return
	}

	var pathsToCheck []string
	if s.GitBashPath != "" {
		binDir := filepath.Dir(s.GitBashPath)
		cmdDir := filepath.Join(filepath.Dir(binDir), "cmd")
		pathsToCheck = append(pathsToCheck, binDir, cmdDir)
	}
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
}
