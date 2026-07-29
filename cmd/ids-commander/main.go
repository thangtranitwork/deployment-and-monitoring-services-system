package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"os/user"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/joho/godotenv"
)

func init() {
	err := godotenv.Load()
	if err != nil {
		log.Printf("[Init] Warning: .env file not found, using system environment variables")
	} else {
		log.Printf("[Init] Loaded .env file successfully")
	}

	exePath, err := os.Executable()
	if err != nil {
		basePath = "."
	} else {
		basePath = filepath.Dir(exePath)
	}

	// If running with 'go run', use current directory
	if strings.Contains(strings.ToLower(exePath), "go-build") || strings.Contains(strings.ToLower(exePath), "debug") {
		basePath, _ = os.Getwd()
	}
}

func main() {
	s := loadSettings()
	migrateSettings(&s)
	ensureGitInPath(s)
	log.Printf("[Init] DEV_AGENT_URL: %s", os.Getenv("DEV_AGENT_URL"))
	log.Printf("[Init] STG_AGENT_URL: %s", os.Getenv("STG_AGENT_URL"))
	startMetricsCollector()

	u, _ := user.Current()
	h, _ := os.UserHomeDir()
	log.Printf("[Init] Running as user: %s (UID: %s), Home: %s", u.Username, u.Uid, h)

	// Pre-init DB connection to check config
	go func() {
		if _, err := getDB(); err != nil {
			log.Printf("[Init] DB/SSH Warning: %v", err)
		}
	}()

	defer func() {
		dbMu.Lock()
		if globalDB != nil {
			log.Printf("[Main] Closing global DB connection")
			globalDB.Close()
		}
		if globalCleanup != nil {
			globalCleanup()
		}
		dbMu.Unlock()
	}()

	mux := http.NewServeMux()

	mux.HandleFunc("/", indexHandler)
	mux.HandleFunc("/health-monitor", healthMonitorHandler)
	mux.HandleFunc("/api/settings", settingsHandler)
	mux.HandleFunc("/api/workspace-folders", workspaceFoldersHandler)
	mux.HandleFunc("/api/services", servicesHandler)
	mux.HandleFunc("/api/services/{service_name}", serviceHandler)
	mux.HandleFunc("/api/history/{service_name}", historyHandler)
	mux.HandleFunc("/api/stats", statsHandler)
	mux.HandleFunc("/api/agent-metrics", agentMetricsHandler)
	mux.HandleFunc("/api/deploy", deployHandler)

	// New Git features
	mux.HandleFunc("/api/git/stash/{service_name}", gitStashHandler)
	mux.HandleFunc("/api/git/commits/{service_name}", gitCommitsHandler)
	mux.HandleFunc("/api/git/branches/{service_name}", gitBranchesHandler)
	mux.HandleFunc("/api/git/checkout/{service_name}", gitCheckoutHandler)
	mux.HandleFunc("/api/git/stash-push/{service_name}", gitStashPushHandler)
	mux.HandleFunc("/api/git/stash-pop/{service_name}", gitStashPopHandler)
	mux.HandleFunc("/api/git/create-branch/{service_name}", gitCreateBranchHandler)
	mux.HandleFunc("/api/git/merge/{service_name}", gitMergeHandler)
	mux.HandleFunc("/api/git/status/{service_name}", gitStatusHandler)
	mux.HandleFunc("/api/git/rollback/{service_name}", gitRollbackHandler)
	mux.HandleFunc("/api/git/compare/{service_name}", gitCompareHandler)
	mux.HandleFunc("/api/git/compare-all", gitCompareAllHandler)
	mux.HandleFunc("/api/git/fetch/{service_name}", gitFetchHandler)
	mux.HandleFunc("/api/git/push/{service_name}", gitPushHandler)
	mux.HandleFunc("/api/git/pull/{service_name}", gitPullHandler)
	mux.HandleFunc("/api/git/stash-show/{service_name}", gitStashShowHandler)
	mux.HandleFunc("/api/git/stash-diff/{service_name}", gitStashDiffHandler)
	mux.HandleFunc("/api/git/changes/{service_name}", gitChangesHandler)
	mux.HandleFunc("/api/git/diff/{service_name}", gitDiffHandler)
	mux.HandleFunc("/api/git/stage/{service_name}", gitStageHandler)
	mux.HandleFunc("/api/git/unstage/{service_name}", gitUnstageHandler)
	mux.HandleFunc("/api/git/discard/{service_name}", gitDiscardHandler)
	mux.HandleFunc("/api/git/commit/{service_name}", gitCommitHandler)
	mux.HandleFunc("/api/terminal/exec", terminalExecHandler)
	mux.HandleFunc("/api/terminal/ws/{service_name}", terminalWebSocketHandler)
	mux.HandleFunc("/api/terminal/snippets", terminalSnippetsHandler)
	mux.HandleFunc("/api/terminal/cwd/{service_name}", terminalCwdHandler)

	// VPN Integration Routes
	mux.HandleFunc("/api/configs", handleConfigs)
	mux.HandleFunc("/api/status", handleStatus)
	mux.HandleFunc("/api/connect", handleConnect)
	mux.HandleFunc("/api/disconnect", handleDisconnect)
	mux.HandleFunc("/api/logs", handleLogs)
	mux.HandleFunc("/api/accounts", handleAccounts)
	mux.HandleFunc("/api/accounts/delete", handleDeleteAccount)

	// Static files
	mux.Handle("GET /static/", http.StripPrefix("/static/", http.FileServer(http.Dir(filepath.Join(basePath, "static")))))
	mux.HandleFunc("GET /favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, filepath.Join(basePath, "static", "favicon.ico"))
	})

	startVPNMonitor()

	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
	}

	go func() {
		fmt.Printf("Server starting on http://localhost:%s\n", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("[Main] Shutting down server...")

	// Create a context with timeout for the shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("[Main] Server forced to shutdown: %v", err)
	}

	log.Println("[Main] Server exiting")
}
