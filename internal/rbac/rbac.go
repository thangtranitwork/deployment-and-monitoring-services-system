package rbac

import (
	"fmt"
	"strings"
)

type Role string

const (
	RoleDeveloper Role = "Developer"
	RoleDevOps    Role = "DevOps"
	RoleAdmin     Role = "Admin"
)

func NormalizeRole(role string) Role {
	r := strings.TrimSpace(strings.ToLower(role))
	switch r {
	case "devops", "ops":
		return RoleDevOps
	case "admin", "administrator", "root":
		return RoleAdmin
	default:
		return RoleDeveloper
	}
}

func NormalizeEnv(env string) string {
	e := strings.TrimSpace(strings.ToLower(env))
	switch e {
	case "stg", "staging", "sân thử", "san thu":
		return "stg"
	case "prod", "production", "sản phẩm", "thật":
		return "prod"
	default:
		return "dev"
	}
}

func CheckPermission(userRole string, targetEnv string, toolName string) (bool, string) {
	role := NormalizeRole(userRole)
	env := NormalizeEnv(targetEnv)

	if role == RoleAdmin {
		return true, ""
	}

	if env == "prod" {
		if role == RoleDeveloper {
			return false, fmt.Sprintf("Quyền hạn [%s] không được phép thao tác trên môi trường Production (Yêu cầu quyền DevOps hoặc Admin)", role)
		}
	}

	return true, ""
}
