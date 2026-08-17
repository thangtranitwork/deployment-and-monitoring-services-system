package tools

import (
	"context"

	"deploy-tool-go/internal/mcp"
	"deploy-tool-go/internal/monitoring"
)

func RegisterMonitoringTools(server interface {
	RegisterTool(tool mcp.MCPTool, handler mcp.ToolHandler)
}) {
	server.RegisterTool(
		mcp.MCPTool{
			Name:        "get_system_stats",
			Description: "Truy xuất chỉ số Linh Lực (thống kê CPU, RAM, OS, số lượng goroutines) toàn hệ thống",
			Parameters: mcp.ToolParameters{
				Type: "object",
				Properties: map[string]*mcp.ToolParamProperty{
					"environment": {Type: "string", Description: "Môi trường kiểm tra (dev, stg, prod)"},
				},
			},
		},
		func(ctx context.Context, args map[string]interface{}) (interface{}, error) {
			stats := monitoring.GetSystemStats(ctx)
			return map[string]interface{}{
				"success": true,
				"stats":   stats,
			}, nil
		},
	)
}
