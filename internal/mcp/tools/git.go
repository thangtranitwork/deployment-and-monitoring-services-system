package tools

import (
	"context"

	"deploy-tool-go/internal/git"
	"deploy-tool-go/internal/mcp"
)

type GitDirectoryResolver interface {
	GetDirectoryForService(serviceName string) (string, bool)
}

var globalGitResolver GitDirectoryResolver

func SetGitDirectoryResolver(r GitDirectoryResolver) {
	globalGitResolver = r
}

func RegisterGitTools(server interface {
	RegisterTool(tool mcp.MCPTool, handler mcp.ToolHandler)
}) {
	// 1. git_pull
	server.RegisterTool(
		mcp.MCPTool{
			Name:        "git_pull",
			Description: "Kéo / pull mã nguồn mới nhất từ Git repository về cho service",
			Parameters: mcp.ToolParameters{
				Type: "object",
				Properties: map[string]*mcp.ToolParamProperty{
					"service_name": {Type: "string", Description: "Tên microservice cần pull code"},
				},
				Required: []string{"service_name"},
			},
		},
		func(ctx context.Context, args map[string]interface{}) (interface{}, error) {
			svcName, _ := args["service_name"].(string)
			dir := ""
			if globalGitResolver != nil {
				if d, ok := globalGitResolver.GetDirectoryForService(svcName); ok {
					dir = d
				}
			}

			res := git.ExecPull(ctx, dir)
			return map[string]interface{}{
				"success":      res.Success,
				"service_name": svcName,
				"message":      res.Message,
				"output":       res.Output,
			}, nil
		},
	)

	// 2. git_checkout
	server.RegisterTool(
		mcp.MCPTool{
			Name:        "git_checkout",
			Description: "Chuyển sang nhánh (branch) Git được chỉ định cho service",
			Parameters: mcp.ToolParameters{
				Type: "object",
				Properties: map[string]*mcp.ToolParamProperty{
					"service_name": {Type: "string", Description: "Tên microservice"},
					"branch_name":  {Type: "string", Description: "Tên nhánh (branch) cần chuyển (ví dụ: main, dev, feature/auth)"},
				},
				Required: []string{"service_name", "branch_name"},
			},
		},
		func(ctx context.Context, args map[string]interface{}) (interface{}, error) {
			svcName, _ := args["service_name"].(string)
			branchName, _ := args["branch_name"].(string)
			dir := ""
			if globalGitResolver != nil {
				if d, ok := globalGitResolver.GetDirectoryForService(svcName); ok {
					dir = d
				}
			}

			res := git.ExecCheckout(ctx, dir, branchName)
			return map[string]interface{}{
				"success":      res.Success,
				"service_name": svcName,
				"branch_name":  branchName,
				"message":      res.Message,
				"output":       res.Output,
			}, nil
		},
	)

	// 3. git_status
	server.RegisterTool(
		mcp.MCPTool{
			Name:        "git_status",
			Description: "Kiểm tra biến động thay đổi chưa commit/staged của service",
			Parameters: mcp.ToolParameters{
				Type: "object",
				Properties: map[string]*mcp.ToolParamProperty{
					"service_name": {Type: "string", Description: "Tên microservice cần kiểm tra git status"},
				},
				Required: []string{"service_name"},
			},
		},
		func(ctx context.Context, args map[string]interface{}) (interface{}, error) {
			svcName, _ := args["service_name"].(string)
			dir := ""
			if globalGitResolver != nil {
				if d, ok := globalGitResolver.GetDirectoryForService(svcName); ok {
					dir = d
				}
			}

			res := git.ExecStatus(ctx, dir)
			return map[string]interface{}{
				"success":      res.Success,
				"service_name": svcName,
				"message":      res.Message,
				"output":       res.Output,
			}, nil
		},
	)
}
