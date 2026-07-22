package main

import (
	"encoding/json"
	"log"
	"os"
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
		UserName:      "",
		GitBashPath:   "",
		WorkspaceURL:  "",
		PreDeployCmd:  "",
		GoPrivate:     "",
		DevAgentURL:   os.Getenv("DEV_AGENT_URL"),
		StgAgentURL:   os.Getenv("STG_AGENT_URL"),
		ProdAgentURL:  os.Getenv("PROD_AGENT_URL"),
		ShowProduction: false,
		CustomCmds:    make(map[string]string),
		Services:      make([]ServiceConfig, 0),
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
	if s.Services == nil {
		s.Services = make([]ServiceConfig, 0)
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
	if len(s.Services) > 0 {
		return
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
