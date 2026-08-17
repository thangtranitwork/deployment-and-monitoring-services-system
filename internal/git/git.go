package git

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"
)

type GitResult struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Output  string `json:"output,omitempty"`
}

func ExecPull(ctx context.Context, dir string) GitResult {
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
	}

	cmd := exec.CommandContext(ctx, "git", "pull")
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	outStr := strings.TrimSpace(string(out))

	if err != nil {
		return GitResult{
			Success: false,
			Message: fmt.Sprintf("Lỗi Git Pull: %v", err),
			Output:  outStr,
		}
	}

	return GitResult{
		Success: true,
		Message: "Đã kéo (pull) mã nguồn mới nhất thành công",
		Output:  outStr,
	}
}

func ExecCheckout(ctx context.Context, dir, branch string) GitResult {
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
	}

	cmd := exec.CommandContext(ctx, "git", "checkout", branch)
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	outStr := strings.TrimSpace(string(out))

	if err != nil {
		return GitResult{
			Success: false,
			Message: fmt.Sprintf("Lỗi Git Checkout sang branch '%s': %v", branch, err),
			Output:  outStr,
		}
	}

	return GitResult{
		Success: true,
		Message: fmt.Sprintf("Đã chuyển thành công sang nhánh '%s'", branch),
		Output:  outStr,
	}
}

func ExecStatus(ctx context.Context, dir string) GitResult {
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
	}

	cmd := exec.CommandContext(ctx, "git", "status", "--short", "--branch")
	cmd.Dir = dir
	out, err := cmd.CombinedOutput()
	outStr := strings.TrimSpace(string(out))

	if err != nil {
		return GitResult{
			Success: false,
			Message: fmt.Sprintf("Lỗi kiểm tra Git Status: %v", err),
			Output:  outStr,
		}
	}

	return GitResult{
		Success: true,
		Message: "Trạng thái mã nguồn Git",
		Output:  outStr,
	}
}
