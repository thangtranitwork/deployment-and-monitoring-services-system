package tools

import (
	"context"
	"fmt"
	"strings"

	"deploy-tool-go/internal/deployment"
	"deploy-tool-go/internal/mcp"
	"deploy-tool-go/internal/rbac"
)

func RegisterDeploymentTools(server interface {
	RegisterTool(tool mcp.MCPTool, handler mcp.ToolHandler)
}) {
	// 1. deploy_service (Supports single service or multiple services separated by comma)
	server.RegisterTool(
		mcp.MCPTool{
			Name:        "deploy_service",
			Description: "Triển khai / deploy một hoặc nhiều microservices (phân cách bằng dấu phẩy) lên môi trường DEV, STG hoặc PROD. Đổ về danh sách stateful deployment ID & status.",
			Parameters: mcp.ToolParameters{
				Type: "object",
				Properties: map[string]*mcp.ToolParamProperty{
					"service_name":       {Type: "string", Description: "Tên microservice cần deploy (có thể truyền nhiều service cách nhau bởi dấu phẩy, ví dụ: 'payment-service-go, api-service-go')"},
					"environment":        {Type: "string", Description: "Môi trường triển khai: dev, stg, hoặc prod", Enum: []string{"dev", "stg", "prod"}},
					"confirm_production": {Type: "boolean", Description: "Xác nhận triển khai môi trường Production (Chỉ dùng khi người dùng đã xác nhận)"},
				},
				Required: []string{"service_name"},
			},
		},
		func(ctx context.Context, args map[string]interface{}) (interface{}, error) {
			svcInput, _ := args["service_name"].(string)
			envInput, _ := args["environment"].(string)
			confirmProd, _ := args["confirm_production"].(bool)

			if strings.TrimSpace(svcInput) == "" {
				return deployment.StructuredError{
					Success: false,
					Code:    "INVALID_ARGUMENT",
					Message: "Tham số 'service_name' không được để trống",
				}, nil
			}

			// Support comma-separated multiple services
			rawList := strings.Split(svcInput, ",")
			var svcNames []string
			for _, item := range rawList {
				trimmed := strings.TrimSpace(item)
				if trimmed != "" {
					svcNames = append(svcNames, trimmed)
				}
			}

			env := rbac.NormalizeEnv(envInput)

			// Production Safety Gate
			if env == "prod" && !confirmProd {
				return deployment.StructuredError{
					Success: false,
					Code:    "CONFIRMATION_REQUIRED",
					Message: fmt.Sprintf("Bẩm ngài, ngài đang yêu cầu triển khai các dịch vụ [%s] lên môi trường Production (Sản Phẩm). Xin ngài xác nhận trước khi tiến hành.", strings.Join(svcNames, ", ")),
					Details: fmt.Sprintf("Vui lòng truyền confirm_production=true để xác nhận triển khai [%s] lên Production.", strings.Join(svcNames, ", ")),
				}, nil
			}

			mgr := deployment.GetManager()

			// Single service deployment
			if len(svcNames) == 1 {
				svcName := svcNames[0]
				active := mgr.GetActiveDeployment(svcName, env)
				if active != nil {
					return map[string]interface{}{
						"success":       true,
						"service_name":  svcName,
						"is_idempotent": true,
						"message":       fmt.Sprintf("Tiến trình deploy cho service '%s' (%s) đang được chạy sẵn.", svcName, env),
						"deployment":    active,
					}, nil
				}

				dep, err := mgr.CreateDeployment(ctx, svcName, env, "HEAD", false)
				if err != nil {
					return deployment.StructuredError{
						Success: false,
						Code:    "CREATE_FAILED",
						Message: err.Error(),
					}, nil
				}

				return map[string]interface{}{
					"success":      true,
					"service_name": svcName,
					"message":      fmt.Sprintf("Đã khởi tạo tiến trình deploy cho '%s' (%s)", svcName, env),
					"deployment":   dep,
				}, nil
			}

			// Multi-service deployment execution
			var deps []*deployment.Deployment
			var deployedNames []string

			for _, svcName := range svcNames {
				active := mgr.GetActiveDeployment(svcName, env)
				if active != nil {
					deps = append(deps, active)
				} else {
					dep, err := mgr.CreateDeployment(ctx, svcName, env, "HEAD", false)
					if err == nil {
						deps = append(deps, dep)
					}
				}
				deployedNames = append(deployedNames, svcName)
			}

			return map[string]interface{}{
				"success":        true,
				"is_multi":       true,
				"services_count": len(deployedNames),
				"services":       deployedNames,
				"message":        fmt.Sprintf("Đã khởi tạo triển khai Multi-Deploy cho %d services (%s) lên môi trường %s!", len(deployedNames), strings.Join(deployedNames, ", "), env),
				"deployments":    deps,
			}, nil
		},
	)

	// 2. get_deployment_status
	server.RegisterTool(
		mcp.MCPTool{
			Name:        "get_deployment_status",
			Description: "Xem trạng thái chi tiết của tiến trình triển khai theo deployment_id",
			Parameters: mcp.ToolParameters{
				Type: "object",
				Properties: map[string]*mcp.ToolParamProperty{
					"deployment_id": {Type: "string", Description: "ID duy nhất của tiến trình deployment (ví dụ dep_171829381)"},
				},
				Required: []string{"deployment_id"},
			},
		},
		func(ctx context.Context, args map[string]interface{}) (interface{}, error) {
			depID, _ := args["deployment_id"].(string)
			mgr := deployment.GetManager()
			dep, ok := mgr.GetDeployment(depID)
			if !ok {
				return deployment.StructuredError{
					Success: false,
					Code:    "NOT_FOUND",
					Message: fmt.Sprintf("Không tìm thấy tiến trình deployment với ID: '%s'", depID),
				}, nil
			}

			return map[string]interface{}{
				"success":    true,
				"deployment": dep,
			}, nil
		},
	)
}
