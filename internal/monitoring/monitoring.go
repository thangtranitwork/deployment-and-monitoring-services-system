package monitoring

import (
	"context"
	"fmt"
	"os/exec"
	"runtime"
	"strings"
	"time"
)

type SystemStats struct {
	CPUUsage    string `json:"cpu_usage"`
	MemoryUsage string `json:"memory_usage"`
	OS          string `json:"os"`
	GoRoutines  int    `json:"goroutines"`
	Timestamp   string `json:"timestamp"`
}

func GetSystemStats(ctx context.Context) SystemStats {
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
	}

	memStr := "N/A"
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	memStr = fmt.Sprintf("%d MB (Allocated)", m.Alloc/1024/1024)

	cpuStr := "N/A"
	if runtime.GOOS == "linux" {
		cmd := exec.CommandContext(ctx, "top", "-bn1")
		out, err := cmd.Output()
		if err == nil {
			lines := strings.Split(string(out), "\n")
			for _, line := range lines {
				if strings.Contains(line, "Cpu(s)") {
					cpuStr = strings.TrimSpace(line)
					break
				}
			}
		}
	}

	return SystemStats{
		CPUUsage:    cpuStr,
		MemoryUsage: memStr,
		OS:          runtime.GOOS,
		GoRoutines:  runtime.NumGoroutine(),
		Timestamp:   time.Now().Format(time.RFC3339),
	}
}
