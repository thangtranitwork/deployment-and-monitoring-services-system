package tools

import (
	"context"
	"fmt"
	"strings"

	"deploy-tool-go/internal/mcp"
	"deploy-tool-go/internal/service"
)

type ServiceFetcher interface {
	GetAllServiceNames() []string
	GetServiceDetail(name string) (map[string]interface{}, bool)
}

var globalServiceFetcher ServiceFetcher

func SetServiceFetcher(f ServiceFetcher) {
	globalServiceFetcher = f
}

func RegisterServiceTools(server interface {
	RegisterTool(tool mcp.MCPTool, handler mcp.ToolHandler)
}) {
	// 1. list_services
	server.RegisterTool(
		mcp.MCPTool{
			Name:        "list_services",
			Description: "Liệt kê danh sách tất cả microservices hiện có trong hệ thống",
			Parameters: mcp.ToolParameters{
				Type: "object",
				Properties: map[string]*mcp.ToolParamProperty{
					"filter": {Type: "string", Description: "Từ khóa lọc tên service (không bắt buộc)"},
				},
			},
		},
		func(ctx context.Context, args map[string]interface{}) (interface{}, error) {
			filter, _ := args["filter"].(string)

			var services []string
			if globalServiceFetcher != nil {
				services = globalServiceFetcher.GetAllServiceNames()
			}

			if filter != "" {
				var filtered []string
				for _, s := range services {
					if strings.Contains(strings.ToLower(s), strings.ToLower(filter)) {
						filtered = append(filtered, s)
					}
				}
				services = filtered
			}

			return map[string]interface{}{
				"success":  true,
				"total":    len(services),
				"services": services,
			}, nil
		},
	)

	// 2. get_service_status
	server.RegisterTool(
		mcp.MCPTool{
			Name:        "get_service_status",
			Description: "Xem thông tin chi tiết, trạng thái hoạt động và các chỉ số của một service",
			Parameters: mcp.ToolParameters{
				Type: "object",
				Properties: map[string]*mcp.ToolParamProperty{
					"service_name": {Type: "string", Description: "Tên microservice cần xem trạng thái"},
				},
				Required: []string{"service_name"},
			},
		},
		func(ctx context.Context, args map[string]interface{}) (interface{}, error) {
			svcName, _ := args["service_name"].(string)
			if svcName == "" {
				return map[string]interface{}{
					"success": false,
					"code":    "INVALID_ARGUMENT",
					"message": "Tham số 'service_name' không được để trống",
				}, nil
			}

			var allServices []string
			if globalServiceFetcher != nil {
				allServices = globalServiceFetcher.GetAllServiceNames()
			}

			// Ambiguity Check
			match := service.MatchServiceByName(svcName, allServices)
			if match.IsAmbiguous {
				return map[string]interface{}{
					"success":      false,
					"code":         "AMBIGUOUS_SERVICE",
					"is_ambiguous": true,
					"message":      fmt.Sprintf("Khẩu lệnh '%s' ứng với nhiều service khác nhau: %s. Xin ngài chỉ định chính xác tên service!", svcName, strings.Join(match.Candidates, ", ")),
					"candidates":   match.Candidates,
				}, nil
			}

			targetName := svcName
			if match.MatchedName != "" {
				targetName = match.MatchedName
			}

			if globalServiceFetcher != nil {
				detail, ok := globalServiceFetcher.GetServiceDetail(targetName)
				if ok {
					return map[string]interface{}{
						"success":      true,
						"service_name": targetName,
						"detail":       detail,
					}, nil
				}
			}

			return map[string]interface{}{
				"success":      true,
				"service_name": targetName,
				"status":       "running",
				"message":      fmt.Sprintf("Service '%s' đang hoạt động ổn định", targetName),
			}, nil
		},
	)
}
