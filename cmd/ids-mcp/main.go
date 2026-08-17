package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"

	"deploy-tool-go/internal/mcp"
	"deploy-tool-go/internal/mcp/tools"
)

func main() {
	server := mcp.GetServer()

	// Register all MCP Tool Suites
	tools.RegisterDeploymentTools(server)
	tools.RegisterServiceTools(server)
	tools.RegisterGitTools(server)
	tools.RegisterMonitoringTools(server)

	log.Println("[IDS-MCP] MCP Server initialized with tools:", len(server.GetTools()))

	// If run with HTTP server mode flag or env
	if os.Getenv("MCP_MODE") == "HTTP" || len(os.Args) > 1 && os.Args[1] == "--http" {
		port := os.Getenv("MCP_PORT")
		if port == "" {
			port = "5556"
		}
		http.HandleFunc("/mcp", func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			body, err := io.ReadAll(r.Body)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}

			respBytes, err := server.HandleJSONRPC(r.Context(), body)
			if err != nil {
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			w.Write(respBytes)
		})

		log.Printf("[IDS-MCP] MCP HTTP Server starting on :%s/mcp\n", port)
		if err := http.ListenAndServe(":"+port, nil); err != nil {
			log.Fatalf("[IDS-MCP] HTTP listen error: %v", err)
		}
		return
	}

	// Default: Standard Stdio JSON-RPC 2.0 Protocol (Official MCP Stdio Transport)
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}

		respBytes, err := server.HandleJSONRPC(context.Background(), line)
		if err != nil {
			log.Printf("[IDS-MCP] Stdio handle error: %v", err)
			continue
		}

		fmt.Println(string(respBytes))
	}
}
