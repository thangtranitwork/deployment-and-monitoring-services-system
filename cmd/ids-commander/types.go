package main

import (
	"database/sql"
	"sync"
)

type ThemeColors struct {
	Accent       string `json:"accent"`
	TextMain     string `json:"text_main"`
	TextDim      string `json:"text_dim"`
	TerminalText string `json:"terminal_text"`
}

type ServiceConfig struct {
	Folder       string `json:"folder"`
	Name         string `json:"name"`
	DevCmd       string `json:"dev_cmd"`
	StgCmd       string `json:"stg_cmd"`
	PreDeployCmd string `json:"pre_deploy_cmd"`
}

type Settings struct {
	UserName      string            `json:"user_name"`
	GitBashPath   string            `json:"git_bash_path"`
	WorkspaceURL  string            `json:"workspace_url"`
	PreDeployCmd  string            `json:"pre_deploy_cmd"`
	GoPrivate     string            `json:"go_private"`
	DevAgentURL   string            `json:"dev_agent_url"`
	StgAgentURL   string            `json:"stg_agent_url"`
	FolderAliases map[string]string `json:"folder_aliases"`
	DarkTheme     ThemeColors       `json:"dark_theme"`
	LightTheme    ThemeColors       `json:"light_theme"`
	CustomCmds    map[string]string `json:"custom_cmds"`
	Services      []ServiceConfig   `json:"services"`
}

type Service struct {
	Name         string                    `json:"name"`
	Dir          string                    `json:"dir"`
	Branch       string                    `json:"branch"`
	Tag          string                    `json:"tag"`
	LastCommit   string                    `json:"last_commit"`
	HasDev       bool                      `json:"has_dev"`
	HasStg       bool                      `json:"has_stg"`
	DevScript    string                    `json:"dev_script"`
	StgScript    string                    `json:"stg_script"`
	PreDeployCmd string                    `json:"pre_deploy_cmd"`
	HasStash     bool                      `json:"has_stash"`
	Ahead        int                       `json:"ahead"`
	Behind       int                       `json:"behind"`
	Metrics      map[string]ServiceMetrics `json:"metrics,omitempty"` // env -> metrics
}

type ServiceMetrics struct {
	Status      string   `json:"status"`
	PID         string   `json:"pid"`
	Service     string   `json:"service"`
	CPU         string   `json:"cpu"`
	Memory      string   `json:"memory"`
	Uptime      string   `json:"uptime"`
	Threads     int      `json:"threads"`
	Ports       []string `json:"ports"`
	StatsPort   string   `json:"stats_port"`
	BinaryMtime int64    `json:"binary_mtime"`
}

type DeployLog struct {
	UserName    string `json:"user_name"`
	Environment string `json:"environment"`
	Branch      string `json:"branch"`
	CreatedAt   string `json:"created_at"`
	Message     string `json:"message"`
	Status      string `json:"status"`
}

var (
	basePath string
	settings Settings

	// Database Persistence
	globalDB      *sql.DB
	globalCleanup func()
	dbMu          sync.Mutex

	// Metrics
	globalMetrics = make(map[string]map[string]ServiceMetrics) // env -> service -> metrics
	metricsMu     sync.RWMutex
)
