package deployment

import (
	"time"
)

type DeploymentState string

const (
	StateQueued    DeploymentState = "queued"
	StateRunning   DeploymentState = "running"
	StateSuccess   DeploymentState = "success"
	StateFailed    DeploymentState = "failed"
	StateCancelled DeploymentState = "cancelled"
	StateRollback  DeploymentState = "rollback"
)

type StructuredError struct {
	Success      bool   `json:"success"`
	Code         string `json:"code"`
	Message      string `json:"message"`
	DeploymentID string `json:"deployment_id,omitempty"`
	Details      string `json:"details,omitempty"`
}

type Deployment struct {
	ID             string          `json:"deployment_id"`
	Service        string          `json:"service"`
	Environment    string          `json:"environment"`
	Commit         string          `json:"commit"`
	Status         DeploymentState `json:"status"`
	Message        string          `json:"message"`
	Logs           []string        `json:"logs,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
	FinishedAt     *time.Time      `json:"finished_at,omitempty"`
	ErrorCode      string          `json:"error_code,omitempty"`
	ErrorMessage   string          `json:"error_message,omitempty"`
	RequiresConfirm bool           `json:"requires_confirmation,omitempty"`
}
