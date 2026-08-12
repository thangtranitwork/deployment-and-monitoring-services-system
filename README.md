# 🚀 Internal Deploy System (IDS) - v2.1.1

A high-performance, aesthetic deployment automation, monitoring, and developer utility stack built with **Go** and **React (Vite + TypeScript + Tailwind CSS)**. Features an interactive **Tu Tien Cultivation Mascot (BunnyMascot)** with 102 achievements, bad luck protection pity breakthrough mechanics, 4-column wide modal layouts, zero pill cooldowns, and real-time multi-deploy reactions.

---

## 🌐 Application Execution Modes (`APP_MODE`)

IDS v2.0 supports 3 flexible UI execution modes configured via the `APP_MODE` environment variable in `.env`:

- `APP_MODE=BOTH` *(Default)*: Runs both the HTML version on port `5555` and React SPA on port `55555` concurrently.
- `APP_MODE=REACT`: Only builds and runs the modern **React SPA** (serves on port `5555` / `55555`).
- `APP_MODE=HTML`: Only runs the standalone **HTML / Go Template Version** on port `5555`.

- 👉 **React SPA Version (Vite + TS)**: [http://localhost:55555](http://localhost:55555)
- 👉 **HTML / Go Template Version**: [http://localhost:5555](http://localhost:5555)

Rebuild and restart instantly using the root script:
```bash
./restart.sh
```

---

## 📁 Project Structure

```text
deploy-tool/
├── cmd/
│   ├── ids-commander/      # Main Go Backend (Standard Library, SSE, PTY, Git & SQL Proxy)
│   └── ids-health/         # Health Metrics Agent (Deploys on remote servers)
├── frontend/               # React SPA Architecture (Vite + TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── components/     # UI Components (HeaderBar, ServiceSidebar, DeploymentPanel, TerminalView)
│   │   ├── components/modals/ # Modals (GitModal, MultiDeployModal, CompareModal, VPNModal, HealthMonitorModal, GlobalSettingsModal, ShortcutsModal, ToolsModal)
│   │   ├── pages/          # Standalone Pages (ToolsPage)
│   │   ├── types/          # TypeScript Type Definitions
│   │   └── utils/          # Key-Value & KV Parsers
│   └── dist/               # Production React Build Bundle
├── scripts/                # Automation & Runner scripts
├── templates/              # HTML Web UI Templates
├── static/                 # Static Assets (CSS, JS, Favicon)
├── settings.json           # Application Configuration (Workspaces, Services, Commands)
├── restart.sh              # One-click Rebuild & Restart Script for Dual Stack
├── .env                    # Environment Variables (DB, Agents, SSH)
└── README.md               # System Documentation
```

---

## 🛠 Features & Capabilities

### ⚡ React SPA & Dual Stack Architecture
- **Dual Port Deployment**: Runs React SPA on port `55555` and HTML version on port `5555` via `./restart.sh`.
- **Pure White Light Mode Redesign**: Pure white `#ffffff` background with crisp dark contrast typography (`#111827`, `#059669`, `#2563eb`), pure white modal cards, and emerald green action buttons matching 100% of the HTML design system.
- **Controlled Terminal & Auto Log Tab Switching**: Triggers auto-tab switching to `Deploy Logs` upon deployment execution, auto-scrolls log output in real-time, and provides `📄 Logs` buttons linking directly to service stats ports.

### 🔍 Workspace Branch Comparison (Compare Source Suite)
- **Service Diff Accordion Cards**: Bento-style expandable cards displaying local branch, target branch, un-deployed commit count, and changed file count.
- **Live Search Filter**: Filter services in real-time by service name or branch.
- **Staging Synchronization**: Single-click bulk or per-service staging update with auto-stash, `git checkout staging`, `git pull origin/staging`, and automatic restoration back to your original branch (`restoreOriginalBranch`).
- **Direct Multi Deploy Access**: Integrated `⚡ Go to Multi Deploy` action button to immediately jump into parallel multi-service deployments.

### 📁 Multi-Workspace Management
- **Nested Workspace Data Architecture**: Services are grouped neatly per workspace in `settings.json`, preventing flat array clutter.
- **Instant Workspace Switcher**: Switch active workspaces in ~100ms from the header bar without full page reloads.
- **Dynamic Workspace Settings**: Single-click workspace table selector with dynamic binding of `DevAgentURL`, `StgAgentURL`, and `ProdAgentURL`.
- **Automatic Service Rescan**: Dynamically scans microservice directories and deployment scripts scoped strictly to the active workspace path.

### 🖥️ Monitoring & Server Health
- **Real-time Metrics Agent**: Live CPU %, Memory usage, Uptime, and Port bindings fetched from remote servers via SSE.
- **Excel-like Metric Sorting**: Sort health metrics by any column with a single click.
- **Post-Deploy Verification**: Verifies if a service restarted correctly by comparing binary `Mtime`.

### 🌳 Source Control & Git Management
- **Full Control**: Branch switching, merging, and creation directly from the UI.
- **Commit History**: Browse the last 15 commits with "Use Message" shortcut for deployments.
- **Unpushed Highlights**: Commits not yet pushed to the remote are marked with an "UNPUSHED" badge.
- **Remote Operations**: Dedicated buttons for **Fetch**, **Pull**, and **Push** with real-time terminal log feedback.
- **Git Staging & Commit**: VS-Code-like staging panel that lists staged/unstaged changes, displays line-by-line diffs, allows discarding changes, and committing directly from the UI.

### 🚀 Parallel Service Deployment (Multi-Deploy)
- **Concurrent Execution**: Deploy multiple services concurrently without blocking thread loops.
- **Card-Style Selection**: Selection dashboard (`Alt + Shift + M`) with active border glow, `Select All Eligible`, and `Clear Selection` controls.
- **Live Multi-Deploy Console Matrix**: Auto-layout grid displaying live log streams for all deploying services in parallel.
- **Master & Single Retry**: Retry failed deployments with a single click.

### 🔒 OpenVPN Management
- **OpenVPN Control**: Toggle host VPN connections directly from the Web interface.
- **Socket Disconnect Fallback**: Resilient connection handling that catches Linux `tun0` interface routing drops without resetting state to disconnected.
- **SSE Log Streaming**: Real-time `.ovpn` output log console with auto-reconnection on network route changes.

### 🛠️ Developer Utility Tools (IDS Tools Suite - `/tools`)
A comprehensive suite of 13 local developer utility tools:
- **Markdown Live Preview**: Real-time Markdown rendering with export and raw copy.
- **JSON Formatter**: Beautify, compact, and validate JSON strings in real-time.
- **JWT Decoder & Editor**: Parse token segments, sign/verify HMAC-SHA256 signatures, and edit payloads/headers.
- **KV to JSON Parser**: Convert key-value logging sequences (`id:1 name:user`) into structured JSON.
- **Text Diff Compare**: Line-by-line diffing with color-coded additions/deletions.
- **Bcrypt Generator**: Backend-powered password hashing and validation via native Go bcrypt.
- **Time Converter**: Multi-format time conversions (ISO 8601, Local, Epoch, UTC).
- **Curl Online Runner**: Execute HTTP requests from raw cURL commands using a backend proxy.
- **QR Code Gen/Reader**: Local QR Code generation, file drag-and-drop reading, and webcam scanner.
- **DNS Dig / Whois / GeoIP**: Run DNS record queries (A, AAAA, MX, CNAME), TCP WHOIS port 43 lookup, and GeoIP location checks.
- **WebSocket Client**: Test ws/wss connections, filter console message logs, and send custom payloads.
- **SQL Preview & Schema**: Auto-fetch database table schema with a **100% Read-Only Simulation Engine** that parses `UPDATE`, `INSERT`, `DELETE` queries in memory to display row diffs (`BEFORE` vs `AFTER`) with **zero risk of mutating database data**.

---

## 🌟 What's New in v2.1.0

### 🐰 Immortal Bunny Mascot — Cultivation & Customization System

The corner mascot has been upgraded into a full **Tu Tiên (Cultivation) progression system** featuring 17 cultivation realms spanning the mortal world (`Qi Condensation` → `Tribulation Crossing`) and the immortal realm (`True Immortal` → `Immortal Emperor`), accompanied by independent skin & artifact customization.

**✨ Visual & Mascot Highlights:**
- **80px HD Display Size**: The bunny mascot is rendered at a crisp 80px HD size with detailed pixel art and autonomous animations (running, hopping, meditating, flying sword hovering, consuming pills, dancing...).
- **17 Realm Appearances (Skins)**: 17 dedicated transparent 10x10 spritesheets corresponding to the 17 cultivation realms.
- **17 Guardian Artifacts (Treasures)**: 17 unique 3D orbiting artifacts revolving around the mascot with dynamic illumination during deployments.
- **Independent Customization**: Fully independent customization of **🥋 Appearance (Skin)** and **🔮 Guardian Artifact (Treasure)** across dedicated modal tabs.

**Realm Progression:**
- **17 Cultivation Realms** from Mortal to Immortal Emperor, each featuring unique lore, appearances, and guardian artifacts.
- **Tribulation (天劫 / Độ Kiếp)**: Manual breakthrough & tribulation system powered by a procedural full-screen lightning canvas animation.
- **Dynamic Tribulation Success Rates**: Success rate scales with higher realms (85% → 20%); failures penalize XP by 10% of the realm gap.

**Item & Storage System (Storage Bag):**
| Item | Effect | How to Earn |
|---|---|---|
| 💊 **Spirit Gathering Pill** | +8 XP | 1/minute on page, every 5 mascot drags |
| 🍃 **Recovery Pill** | +20 XP | Each successful deploy, re-open after 4h idle |
| 🌸 **Great Rejuvenation Pill** | +50 XP | Tribulation success, 100-min & 50-deploy milestones |
| 🔱 **Tribulation Talisman** | +25% tribulation success rate for 5 min | Deploy milestones 10/25/50, 500-min milestone |

- **30-second cooldown** between pill consumption
- **Max 999 per item** type
- **Inventory popup** renders above the mascot bubble in-context
- Full **dark/light mode** compatibility via inline styles

**🏆 Achievement System:**
- **16 Achievements** categorized into *Cultivation*, *DevOps*, *Activity*, and *Secret Realms*
- **Secret Achievements**: Hidden conditions with enigmatic hints (*Heavenly Lightning Body Tempering*, *Defying the Heavens*, *Night Owl Immortal*, *Ancient God Power*)
- **Instant Rewards**: Unlocking achievements auto-grants items/pills with an animated celebration toast
- **Interactive Modal Tabs**: Seamlessly switch between *🥋 Appearance*, *🔮 Artifacts*, and *🏆 Achievements*

**💬 Deployment Commentary Engine:**
- Dynamic lore-rich reactions tailored to each microservice (`trip-*`, `auth-*`, `order/payment`, `notification/worker`, `report/analytics`, `open-api`)
- Contextual voice lines merging ancient cultivation lore with modern DevOps operations

---

## ⌨️ Keyboard Shortcuts

### 🏠 Management Page

| Action | Shortcut |
| :--- | :--- |
| **Search Service** | `/` |
| **Navigate Services** | `Alt + ↑ / ↓` |
| **Run Single Deploy** | `Ctrl + Enter` |
| **Multi Deploy Modal** | `Alt + Shift + M` |
| **Fast Multi Deploy** | `Ctrl + Alt + Shift + M` |
| **Cycle Deploy Message** | `Alt + Shift + ← / →` |
| **Workspace Compare** | `Alt + Shift + C` |
| **Toggle Git Modal** | `Alt + Shift + G` |
| **Toggle Theme** | `Alt + Shift + T` |
| **Toggle VPN Modal** | `Alt + Shift + U` |
| **Global Settings** | `Alt + Shift + I` |
| **Refresh Data** | `Alt + Shift + R` |
| **Shortcuts Help** | `Alt + Shift + H` |
| **Close Modal** | `Esc` |

---

## 🚀 Getting Started

### 1. Configure Environment (`.env`)
Copy `.env.example` to `.env` and set your MySQL database, SSH credentials, and agent URLs:
```ini
APP_ENV=local
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DB=deploy_logs

DEV_AGENT_URL=http://14.225.249.148:55555
STG_AGENT_URL=http://171.244.204.148:55555
PROD_AGENT_URL=http://localhost:8555
```

### 2. Configure OpenVPN Privileges (Required on Host)
Add passwordless sudoers permission for OpenVPN:
```bash
echo "thang ALL=(ALL) NOPASSWD: /usr/sbin/openvpn" | sudo tee /etc/sudoers.d/openvpn
```

### 3. Build & Launch Application Stack
Run the restart script to build the React SPA frontend and compile the Go backend:
```bash
./restart.sh
```

Access the interfaces:
- **React SPA**: [http://localhost:55555](http://localhost:55555)
- **HTML Version**: [http://localhost:5555](http://localhost:5555)

---

## 📄 License

MIT License.
