# 🚀 Internal Deploy System (IDS) - v1.6.2

A high-performance, aesthetic deployment automation and monitoring dashboard built with **Go**. Manage your services, Git operations, and deployments with a premium web interface and real-time health metrics.

## 📁 Project Structure

```text
deploy-tool/
├── cmd/
│   ├── ids-commander/      # Main Management Backend (Standard Library + SSE + DB logs)
│   └── ids-health/         # Health Agent (Deploy on target servers)
├── scripts/                # Automation & Runner scripts
├── templates/              # Web UI templates (HTML + Vanilla JS)
├── static/                 # Static assets (css, js, favicon, etc.)
├── settings.json           # Tool configuration (workspace, user, services, etc.)
├── .env                    # Environment variables (DB, Agents)
└── README.md               # Documentation
```

## 🛠 Features

### 🖥️ Monitoring & Health

- **Real-time Metrics**: Live CPU, Memory, Uptime, and Port status from remote servers via SSE.
- **Excel-like Sorting**: Sort service tables by any metric with a single click.
- **Post-Deploy Verification**: Automatically verifies if a service restarted correctly by comparing binary `Mtime`.

### 🌳 Git Management & Stashes

- **Full Control**: Branch switching, merging, and creation directly from the UI.
- **Commit History**: Browse the last 15 commits with "Use Message" shortcut for deployments.
- **Git Tags**: Current release/git tags are fetched via `git describe --tags --always` and displayed next to the branch name as a badge.
- **Unpushed Highlights**: Commits not yet pushed to the remote are marked with an "UNPUSHED" badge and blue border.
- **Status at a Glance**: Ahead/Behind counts (↑/↓) for **every local branch** are displayed in the branch list.
- **Remote Operations**: Dedicated buttons for **Fetch**, **Pull**, and **Push** with real-time terminal feedback.
- **Safe Stash**: Automatic stashing during checkouts to prevent data loss.
- **Git Stash Manager**: A dedicated tab in the Git management card to view stashed files, create new stashes, pop, apply, or drop stashes directly.
- **Git Staging Reset (Reset Staging)**: Automatically stashes local changes, detaches HEAD, deletes local `staging`, pulls a fresh `origin/staging` to deploy, and automatically restores the original workspace state (checkout branch/pop stash) afterwards.
- **Conflicts & Rollback Manager**: When checkouts or branches conflict with local changes, an interactive modal displays conflicting files, letting users selectively revert/delete untracked files or perform an auto-stash with custom messages.

### 🚀 Deployment Workflow

- **Multi-Environment**: Seamlessly switch between Development, Staging, and Production targets.
- **Per-Service Production**: Toggle the Production environment visibility individually for each service.
- **Production Protection**: Secure modal password verification before triggering any single or multi-service deployment to Production.
- **Message History**: Navigate through previous commit messages using arrows or `Alt + Shift + Left/Right`.
- **History Tracking**: Full SQL-based logging of every deployment (User, Time, Status, Message).

### ⚡ Parallel Service Deployment (Multi-Deploy)

- **Concurrent Execution**: Deploy multiple services at the same time without blocking or waiting for each deployment sequence.
- **Premium Selection Modal**: Open selection dashboard via `Alt + Shift + M`. Select target environment, filter services, and enter a unified deployment message.
- **Card-Style Selection & Clear**: Modern UI cards with active border glow. Includes a dedicated `🗑️ Clear Selection` button to reset choices in one click.
- **Smart Eligibility Filter**: Automatically disables selection for services that lack deployment scripts for the selected environment.
- **"Select All" Toggle**: A single button that toggles select/deselect of all currently filtered eligible services.
- **Choice Persistence**: Automatically saves and reloads your last multi-deployment selections and target environment from `localStorage`.
- **Fast Multi Deploy**: Instantly trigger deployment for saved services via `Ctrl + Alt + Shift + M`.
- **Live Multi-Deploy Console Modal (Auto Grid)**: Displays live terminal logs for all deploying services in an auto-layout matrix grid. Completed services light up with vibrant Emerald/Red glow indicators.

### 🔒 VPN Management

- **OpenVPN Integration**: Toggle VPN connection state on the host directly from the Web interface.
- **Real-time Status**: Displays active tunnel status (connected, disconnected, connecting, disconnecting, or error state) with real-time logs via Server-Sent Events (SSE). Shows active WAN IP address, geo-location, active network interface, and uptime.
- **Config & Account Management**: 
  - Scan for `.ovpn` profiles in custom directories or user folders.
  - Save, edit, and delete multiple VPN credentials/accounts with custom labels.
  - Automatically loads last saved credentials or persistent profiles.
- **Passwordless Integration**: Seamlessly integrates with system OpenVPN using passwordless sudoers configuration.

### 🎨 User Experience & Theme Customization

- **Premium UI**: Modern dark/light modes with glassmorphism, harmony color palettes, and smooth transitions.
- **Theme Factory**: Deep customization of accent colors, terminal text, background theme variables, and text dimensions.
- **Advanced Search**: Filter services and branches with smart query parsing (comma-separated list for **OR** matches, space-separated words for **AND** matches).
- **Formatted Dialogs**: System alerts, confirms, and prompts support HTML formatting natively (e.g., highlighting key names in bold) for a cleaner UX.
- **Resizable Layout**: Drag the split-pane resizer to balance space between terminal logs and Git management.
- **Shortcuts Modal**: Quick-reference guide for all system keyboard shortcuts.

## ⌨️ Keyboard Shortcuts

### 🏠 Management Page

| Action                         | Shortcut                                        |
| :----------------------------- | :---------------------------------------------- |
| **Search Service**             | `/`                                             |
| **Navigate Services**          | `Alt + ↑ / ↓`                                   |
| **Run Deploy**                 | `Ctrl + Enter`                                  |
| **Multi Deploy Modal**         | `Alt + Shift + M`                               |
| **Fast Multi Deploy (Last)**   | `Ctrl + Alt + Shift + M`                        |
| **Cycle Deploy Msg**           | `Alt + Shift + ← / →` (Left=Newer, Right=Older) |
| **Toggle Git Card**            | `Alt + Shift + G`                               |
| **Switch Env (Dev/Stg)**       | `Alt + Shift + 1 / 2`                           |
| **Git Tabs (B/C/S)**           | `Alt + Shift + Q / W / E`                       |
| **View Logs**                  | `Alt + Shift + L`                               |
| **Refresh / Stats / Settings** | `Alt + Shift + R / S / I`                       |
| **Toggle Theme / Help**        | `Alt + Shift + T / H`                           |
| **Toggle VPN Card**            | `Alt + Shift + U`                               |
| **Close Modal**                | `Esc`                                           |

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

### ⚙️ Custom Deployment Commands (Alternative)

If you prefer not to use `.sh` script files in each service subdirectory, or if you have complex deployment flows, you can define custom commands directly in the **Settings** modal (or under `custom_cmds` in `settings.json`).

Format in Settings (one entry per line):

```text
folder-name:environment:command
```

Examples:

- `user-service:dev:go build && systemctl restart user-service`
- `crm-front-end:stg:npm run build && rsync -avz dist/ user@stg-server:/var/www/html/`

During execution, the deployment message is injected into the environment as `$DEPLOY_MSG` and `$DEPLOY_MESSAGE`. You can reference them in your commands:

- `user-service:dev:echo "Deploying with message: $DEPLOY_MESSAGE" && go build && ...`

## ⚙️ Environment Variables (`.env`)

Configure the application by creating a `.env` file in the project root:

```ini
# Application environment: 'local' (uses SSH tunneling if enabled) or 'server' (direct connect)
APP_ENV=local

# MySQL Database Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=deploy_logs

# SSH Tunnel Configuration (Used if APP_ENV=local)
USE_SSH=true
SSH_HOST=your_ssh_ip
SSH_PORT=22
SSH_USER=ubuntu
SSH_KEY_PATH=/path/to/your/private_key  # Must be an absolute path
# SSH_PASSWORD=your_ssh_password       # Alternative if no key is used

# Agent Connections
DEV_AGENT_URL=http://your-dev-agent-ip:8080
STG_AGENT_URL=http://your-stg-agent-ip:8080
PROD_AGENT_URL=http://your-prod-agent-ip:8080
```

## 🚀 Getting Started

1. **Configure Environment**: Copy `.env.example` to `.env` and fill in your database, SSH, and agent URLs.
2. **Configure Agent**: Deploy `ids-health` to your target servers and set agent URLs in `.env`.
2. **Configure OpenVPN Permissions (Required)**:
   Since OpenVPN requires root privileges to manipulate routing tables and create TUN/TAP interfaces, the system service (running as the unprivileged user `thang`) needs a passwordless sudoers exception. Run the following command on the host:
   ```bash
   echo "thang ALL=(ALL) NOPASSWD: /usr/sbin/openvpn" | sudo tee /etc/sudoers.d/openvpn
   ```
3. **Build & Run**:
   ```bash
   # Build ids-commander
   go build -o ids-commander ./cmd/ids-commander
   ./ids-commander
   ```
4. **Configure Services**: Open **Settings > Deployment** to configure folder mappings, service names, custom deployment commands, and production environment flags for each service.

## 📄 License

MIT License.
