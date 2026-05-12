# 🚀 Internal Deploy System (IDS) - v1.2.0

A high-performance, aesthetic deployment automation and monitoring dashboard built with **Go**. Manage your services, Git operations, and deployments with a premium web interface and real-time health monitoring.

## 📁 Project Structure

```text
deploy-tool/
├── main.go             # Main Management Backend (Standard Library)
├── main-health.go      # Health Agent (Deploy on target servers)
├── scripts/            # Automation & Runner scripts
├── templates/          # Web UI templates (HTML + Vanilla JS)
├── static/             # Static assets (favicon, etc.)
├── settings.json       # Tool configuration (workspace, user, aliases, etc.)
├── .env                # Environment variables (DB, Agents)
└── README.md           # Documentation
```

## 🛠 Features (v1.2.0)

- **Native Performance**: Built entirely with Go's standard library for maximum speed and stability.
- **Safe Deployment**: Post-deployment verification using binary `Mtime` comparison to ensure the new version is correctly started.
- **Remote Health Monitor**:
    - Real-time CPU, Memory, and Uptime metrics from multiple environments.
    - **Excel-like Sorting**: Sort services by Name, Status, CPU, or RAM with a single click.
- **Premium Resizable UI**:
    - Modern dark-mode interface with glassmorphism effects.
    - **Flexible Split-Pane**: Drag the resizer to balance space between Logs and Git Management.
- **Git Management**:
    - Branch/Commit/Stash management.
    - Safe rollback & checkout with automatic stashing.
- **Folder Aliases**: Map local folder names to remote service names to ensure accurate monitoring status.
- **Deployment History**: SQL-based tracking with success/failure status and color-coded results.

## ⌨️ Keyboard Shortcuts

### 🏠 Management Page
| Action | Shortcut |
| :--- | :--- |
| **Search Service** | `/` |
| **Navigate Services** | `Alt + ↑ / ↓` |
| **Run Deploy** | `Ctrl + Enter` |
| **Switch Env (Dev/Stg)** | `Alt + Shift + 1 / 2` |
| **Git Tabs (B/C/S)** | `Alt + Shift + Q / W / E` |
| **View Logs** | `Alt + Shift + L` |
| **Go to Monitor** | `Alt + Shift + M` |
| **Refresh / Stats / Settings** | `Alt + Shift + R / S / I` |
| **Toggle Theme / Help** | `Alt + Shift + T / H` |
| **Close Modal** | `Esc` |

### 🖥️ Health Monitor Page
| Action | Shortcut |
| :--- | :--- |
| **Select Service** | `Alt + ↑ / ↓` |
| **View Logs (Selected)** | `Alt + Shift + L` |
| **Switch Env (Dev/Stg)** | `Alt + Shift + 1 / 2` |
| **Back to Management** | `Alt + Shift + M` (or `Esc`) |
| **Refresh Data** | `Alt + Shift + R` |

## 🚀 Getting Started

1. **Configure Agent**: Deploy `main-health.go` to your target servers and set `DEV_AGENT_URL` / `STG_AGENT_URL` in `.env`.
2. **Build & Run**:
   ```bash
   go build -o ids-commander main.go
   ./ids-commander
   ```
3. **Set Aliases**: If local folder names differ from server service names, add them in **Settings > Folder Aliases** (e.g., `user-service-go:auth-service`).

## 📄 License
MIT License.
