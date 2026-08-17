package deployment

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type Manager struct {
	mu           sync.RWMutex
	deployments  map[string]*Deployment
	activeMap    map[string]*Deployment // key: service:env
	workerSem    chan struct{}          // Concurrency semaphore
}

var globalManager *Manager
var once sync.Once

func GetManager() *Manager {
	once.Do(func() {
		globalManager = NewManager(3) // Max 3 concurrent deployments
	})
	return globalManager
}

func NewManager(maxConcurrency int) *Manager {
	if maxConcurrency <= 0 {
		maxConcurrency = 3
	}
	return &Manager{
		deployments: make(map[string]*Deployment),
		activeMap:   make(map[string]*Deployment),
		workerSem:   make(chan struct{}, maxConcurrency),
	}
}

func activeKey(service, env string) string {
	return fmt.Sprintf("%s:%s", service, env)
}

func (m *Manager) GetActiveDeployment(service, env string) *Deployment {
	m.mu.RLock()
	defer m.mu.RUnlock()
	dep, ok := m.activeMap[activeKey(service, env)]
	if ok && (dep.Status == StateQueued || dep.Status == StateRunning) {
		return dep
	}
	return nil
}

func (m *Manager) CreateDeployment(ctx context.Context, service, env, commit string, requiresConfirm bool) (*Deployment, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	key := activeKey(service, env)
	if existing, ok := m.activeMap[key]; ok && (existing.Status == StateQueued || existing.Status == StateRunning) {
		// Idempotency deduplication: return existing active deployment
		return existing, nil
	}

	depID := fmt.Sprintf("dep_%d", time.Now().UnixNano()/1e6)
	now := time.Now()

	status := StateQueued
	if requiresConfirm {
		status = StateQueued
	}

	dep := &Deployment{
		ID:              depID,
		Service:         service,
		Environment:     env,
		Commit:          commit,
		Status:          status,
		Message:         fmt.Sprintf("Khởi tạo tiến trình triển khai cho service %s trên môi trường %s", service, env),
		Logs:            []string{fmt.Sprintf("[%s] Đã xếp hàng tiến trình deploy %s (%s)", now.Format(time.RFC3339), service, env)},
		CreatedAt:       now,
		UpdatedAt:       now,
		RequiresConfirm: requiresConfirm,
	}

	m.deployments[depID] = dep
	m.activeMap[key] = dep

	return dep, nil
}

func (m *Manager) GetDeployment(id string) (*Deployment, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	dep, ok := m.deployments[id]
	return dep, ok
}

func (m *Manager) GetDeploymentLogs(id string) ([]string, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	dep, ok := m.deployments[id]
	if !ok {
		return nil, false
	}
	return dep.Logs, true
}

func (m *Manager) AppendLog(id string, line string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if dep, ok := m.deployments[id]; ok {
		logLine := fmt.Sprintf("[%s] %s", time.Now().Format("15:04:05"), line)
		dep.Logs = append(dep.Logs, logLine)
		dep.UpdatedAt = time.Now()
	}
}

func (m *Manager) UpdateStatus(id string, status DeploymentState, errCode, errMsg string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if dep, ok := m.deployments[id]; ok {
		dep.Status = status
		dep.UpdatedAt = time.Now()
		if errCode != "" {
			dep.ErrorCode = errCode
			dep.ErrorMessage = errMsg
		}
		if status == StateSuccess || status == StateFailed || status == StateCancelled || status == StateRollback {
			now := time.Now()
			dep.FinishedAt = &now
			delete(m.activeMap, activeKey(dep.Service, dep.Environment))
		}
	}
}

func (m *Manager) AcquireWorker(ctx context.Context) error {
	select {
	case m.workerSem <- struct{}{}:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (m *Manager) ReleaseWorker() {
	select {
	case <-m.workerSem:
	default:
	}
}
