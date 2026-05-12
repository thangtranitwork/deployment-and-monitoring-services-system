package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"
	"time"
)

const (
	DefaultTeamPath = "/home/"
	Port            = "55555"
)

type ServiceMetrics struct {
	Status      string   `json:"status"`
	PID         string   `json:"pid"`
	Service     string   `json:"service"`
	CPU         string   `json:"cpu"`
	Memory      string   `json:"memory"`
	Uptime      string   `json:"uptime"`
	Threads     int      `json:"threads"`
	Ports       []string `json:"ports"`
	StatsPort   string   `json:"stats_port"`
	BinaryMtime int64    `json:"binary_mtime"`
}

var clkTick float64

func init() {
	clkTick = 100
	if out, err := exec.Command("getconf", "CLK_TCK").Output(); err == nil {
		if val, err := strconv.ParseFloat(strings.TrimSpace(string(out)), 64); err == nil {
			clkTick = val
		}
	}
}

func getSystemUptime() float64 {
	data, err := ioutil.ReadFile("/proc/uptime")
	if err != nil {
		return 0
	}
	fields := strings.Fields(string(data))
	if len(fields) > 0 {
		val, _ := strconv.ParseFloat(fields[0], 64)
		return val
	}
	return 0
}

func collectMetrics() []ServiceMetrics {
	teamPath := os.Getenv("TEAM_PATH")
	if teamPath == "" {
		teamPath = DefaultTeamPath
	}

	pidPortMap := make(map[string][]string)
	if out, err := exec.Command("ss", "-ltnp").CombinedOutput(); err == nil {
		lines := strings.Split(string(out), "\n")
		for _, line := range lines {
			if strings.Contains(line, "pid=") {
				fields := strings.Fields(line)
				if len(fields) < 4 {
					continue
				}
				addrParts := strings.Split(fields[3], ":")
				port := addrParts[len(addrParts)-1]

				pidPart := ""
				idx := strings.Index(line, "pid=")
				if idx != -1 {
					pidPart = strings.Split(line[idx+4:], ",")[0]
				}
				if pidPart != "" {
					pidPortMap[pidPart] = append(pidPortMap[pidPart], port)
				}
			}
		}
	}

	sysUptime := getSystemUptime()
	runningServices := make(map[string]bool)
	var metrics []ServiceMetrics

	files, _ := ioutil.ReadDir("/proc")
	for _, f := range files {
		if !f.IsDir() {
			continue
		}
		pid := f.Name()
		if _, err := strconv.Atoi(pid); err != nil {
			continue
		}

		exe, err := os.Readlink("/proc/" + pid + "/exe")
		if err != nil || !strings.Contains(exe, teamPath) {
			continue
		}

		// Get stats from ps (simpler for CPU %)
		cmd := exec.Command("ps", "-p", pid, "-o", "%cpu,rss,nlwp", "--no-headers")
		out, _ := cmd.Output()
		parts := strings.Fields(string(out))
		cpu := "0.0"
		memMB := "0.00"
		threads := 0
		if len(parts) >= 3 {
			cpu = parts[0]
			rssKb, _ := strconv.ParseFloat(parts[1], 64)
			memMB = fmt.Sprintf("%.2f", rssKb/1024)
			threads, _ = strconv.Atoi(parts[2])
		}

		serviceName := filepath.Base(exe)
		serviceName = strings.TrimSuffix(serviceName, " (deleted)")

		ports := pidPortMap[pid]
		uniquePorts := make(map[string]bool)
		var pList []string
		for _, p := range ports {
			if !uniquePorts[p] {
				uniquePorts[p] = true
				pList = append(pList, p)
			}
		}

		// Stats port from stats.pid
		// Heuristic: service dir is usually 2 levels up or fixed
		// The shell script does: $(echo "$exe" | sed -E "s|($TEAM_PATH/[^/]+).*|\1|")
		statsPort := "N/A"
		parts_path := strings.Split(exe, "/")
		for i, p := range parts_path {
			if p == "bship" || p == filepath.Base(teamPath) {
				if i+1 < len(parts_path) {
					baseDir := "/" + filepath.Join(parts_path[:i+2]...)
					statsFile := filepath.Join(baseDir, "pid/stats.pid")
					if data, err := ioutil.ReadFile(statsFile); err == nil {
						statsPort = strings.TrimSpace(string(data))
					}
				}
				break
			}
		}

		uptime := "N/A"
		statData, err := ioutil.ReadFile("/proc/" + pid + "/stat")
		if err == nil {
			fields := strings.Fields(string(statData))
			if len(fields) > 21 {
				startTime, _ := strconv.ParseFloat(fields[21], 64)
				seconds := sysUptime - (startTime / clkTick)
				uptime = fmt.Sprintf("%02d:%02d:%02d", int(seconds)/3600, (int(seconds)%3600)/60, int(seconds)%60)
			}
		}

		runningServices[serviceName] = true

		var mtime int64 = 0
		if info, err := os.Stat(exe); err == nil {
			mtime = info.ModTime().Unix()
		}

		metrics = append(metrics, ServiceMetrics{
			Status:      "RUNNING",
			PID:         pid,
			Service:     serviceName,
			CPU:         cpu,
			Memory:      memMB + "MB",
			Uptime:      uptime,
			Threads:     threads,
			Ports:       pList,
			StatsPort:   statsPort,
			BinaryMtime: mtime,
		})
	}

	// Stopped services
	dirFiles, _ := ioutil.ReadDir(teamPath)
	for _, df := range dirFiles {
		if !df.IsDir() {
			continue
		}
		if !runningServices[df.Name()] {
			metrics = append(metrics, ServiceMetrics{
				Status:    "STOPPED",
				PID:       "N/A",
				Service:   df.Name(),
				CPU:       "DOWN",
				Memory:    "N/A",
				Uptime:    "N/A",
				Threads:   0,
				Ports:     nil,
				StatsPort: "N/A",
			})
		}
	}

	sort.Slice(metrics, func(i, j int) bool {
		return metrics[i].Service < metrics[j].Service
	})

	return metrics
}

func sseHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	for {
		metrics := collectMetrics()
		jsonData, _ := json.Marshal(metrics)
		fmt.Fprintf(w, "data: %s\n\n", jsonData)
		flusher.Flush()

		select {
		case <-r.Context().Done():
			return
		case <-time.After(2 * time.Second):
			continue
		}
	}
}

func main() {
	if runtime.GOOS != "linux" {
		log.Fatal("This health agent only runs on Linux")
	}

	http.HandleFunc("/metrics", sseHandler)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		metrics := collectMetrics()
		json.NewEncoder(w).Encode(metrics)
	})

	fmt.Printf("IDS Health Agent starting on :%s\n", Port)
	log.Fatal(http.ListenAndServe(":"+Port, nil))
}
