# 🚀 Internal Deploy System (IDS) - v1.3.0

A high-performance, aesthetic deployment automation and monitoring dashboard built with **Go**. Manage your services, Git operations, and deployments with a premium web interface and real-time health metrics.

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

## 🛠 Features

### 🖥️ Monitoring & Health
- **Real-time Metrics**: Live CPU, Memory, Uptime, and Port status from remote servers via SSE.
- **Excel-like Sorting**: Sort service tables by any metric with a single click.
- **Post-Deploy Verification**: Automatically verifies if a service restarted correctly by comparing binary `Mtime`.

### 🌳 Git Management
- **Full Control**: Branch switching, merging, and creation directly from the UI.
- **Commit History**: Browse the last 15 commits with "Use Message" shortcut for deployments.
- **Unpushed Highlights**: Commits not yet pushed to the remote are marked with an "UNPUSHED" badge and blue border.
- **Status at a Glance**: Ahead/Behind counts (↑/↓) for **every local branch** are displayed in the branch list.
- **Remote Operations**: Dedicated buttons for **Fetch**, **Pull**, and **Push** with real-time terminal feedback.
- **Safe Stash**: Automatic stashing during checkouts to prevent data loss, with a dedicated Stash management tab.

### 🚀 Deployment Workflow
- **Multi-Environment**: Seamlessly switch between Development and Staging targets.
- **Message History**: Navigate through previous commit messages using arrows or `Alt + Shift + Left/Right`.
- **History Tracking**: Full SQL-based logging of every deployment (User, Time, Status, Message).

### 🎨 User Experience
- **Premium UI**: Modern dark/light modes with glassmorphism and smooth transitions.
- **Resizable Layout**: Drag the split-pane resizer to balance space between terminal logs and Git management.
- **Theme Factory**: Deep customization of accent colors, terminal text, and background themes.

## ⌨️ Keyboard Shortcuts

### 🏠 Management Page
| Action | Shortcut |
| :--- | :--- |
| **Search Service** | `/` |
| **Navigate Services** | `Alt + ↑ / ↓` |
| **Run Deploy** | `Ctrl + Enter` |
| **Cycle Deploy Msg** | `Alt + Shift + ← / →` (Left=Newer, Right=Older) |
| **Toggle Git Card** | `Alt + Shift + G` |
| **Switch Env (Dev/Stg)** | `Alt + Shift + 1 / 2` |
| **Git Tabs (B/C/S)** | `Alt + Shift + Q / W / E` |
| **View Logs** | `Alt + Shift + L` |
| **Go to Monitor** | `Alt + Shift + M` |
| **Refresh / Stats / Settings** | `Alt + Shift + R / S / I` |
| **Toggle Theme / Help** | `Alt + Shift + T / H` |
| **Toggle VPN Card** | `Alt + Shift + U` |
| **Close Modal** | `Esc` |

## 📐 Usage: Sample Project Structure

To use IDS effectively, your workspace should follow a consistent structure. IDS looks for deployment scripts in a specific subdirectory within each service folder.

### Recommended Workspace Layout
```text
/home/user/work/projects/
├── service-auth/
│   ├── .git/
│   ├── main.go
│   └── deploy/          <-- IDS looks here
│       ├── dev.sh       # Script to deploy to Development
│       └── stg.sh       # Script to deploy to Staging
├── service-payment/
│   ├── .git/
│   ├── package.json
│   └── deploy/
│       ├── dev.sh
│       └── stg.sh
└── service-inventory/
    └── deploy/
        ├── dev.sh
        └── stg.sh
```

### Sample `dev.sh`
```bash
#!/bin/bash
# IDS passes the deployment message as the first argument
MESSAGE=$1
echo "Deploying with message: $MESSAGE"

# 1. Build
go build -o auth-server main.go

# 2. Sync to remote
rsync -avz auth-server user@remote-dev:/opt/services/auth/

# 3. Restart remote service
ssh user@remote-dev "sudo systemctl restart auth.service"
```

## 🚀 Getting Started

1. **Configure Agent**: Deploy `main-health.go` to your target servers and set `DEV_AGENT_URL` / `STG_AGENT_URL` in `.env`.
2. **Configure OpenVPN Permissions (Required)**:
   Since OpenVPN requires root privileges to manipulate routing tables and create TUN/TAP interfaces, the system service (running as the unprivileged user `thang`) needs a passwordless sudoers exception. Run the following command on the host:
   ```bash
   echo "thang ALL=(ALL) NOPASSWD: /usr/sbin/openvpn" | sudo tee /etc/sudoers.d/openvpn
   ```
3. **Build & Run**:
   ```bash
   go build -o ids-commander main.go
   ./ids-commander
   ```
4. **Set Aliases**: If local folder names differ from server service names, add them in **Settings > Folder Aliases** (e.g., `user-service-go:auth-service`).

## 📄 License
MIT License.
