# 🚀 Internal Deploy System (IDS) - v2.4.0

A high-performance, aesthetic deployment automation, monitoring, and developer utility stack built with **Go** and **React (Vite + TypeScript + Tailwind CSS)**. Features an **AI Voice Command Agent & Model Context Protocol (MCP)** system, an interactive **Tu Tien Cultivation Mascot (BunnyMascot)** with 120 achievements, Pill Crafting Alchemy Altar, 10-level Artifact Forge with 3D Bát Quái glowing auras, 10 Xianxia Spirit Mounts, 64-item Pill Atlas, 64-item Mount Food Atlas, tab search & filter controls, achievement hover popups, and press-and-hold inventory consumption.

---

## 🌟 What's New in v2.4.0

### 🎤 AI Voice Command & MCP Architecture
- **Gemini AI Intent Parser (Brain)**: Gemini 2.5 Flash / Flash Latest acts strictly as a command parser, returning clean **Structured Command JSON** (`DEPLOY_SERVICE`, `GET_SERVICE_STATUS`, `LIST_SERVICES`, `GIT_PULL`, `CHECK_AND_DEPLOY`, `NEED_CLARIFICATION`).
- **🐰 Rabbit UI Controller**: Frontend command dispatcher (`RabbitCommandDispatcher.ts`) handles semantic UI orchestration, modal popups, realtime log streams, and production safety confirmation gates.
- **⚡ Model Fallback Chain**: Automatic fallback chain (`gemini-flash-latest` ➔ `gemini-2.5-flash` ➔ `gemini-3.7-flash`) preventing `429 Rate Limit / Quota Exceeded` disruptions.
- **📊 Live Console Grid View**: Multi-service deploy voice commands automatically launch the `MultiDeployModal` in Live Console Grid View with parallel real-time log streams for each service.
- **🔒 Production Safety Confirmation**: Production deployments trigger an interactive safety confirmation modal before execution.
- **💬 Speech Bubble Lock**: 8-second persistent lock for Thỏ Tiên voice responses, preventing background loops from overwriting mascot messages prematurely.

---

## 💊 Features & Capabilities (v2.3.2 Base)

### 💊 64-Pill Atlas & 🍱 64-Mount Food Atlas
- **Dedicated Pill Sprite Atlas (`public/pills/`)**: 64 pixel-art icons for all 64 Xianxia cultivation pills (`01_tu_linh_dan.png` .. `64_vo_cuc_hong_mong_tien_de_dan.png`).
- **Dedicated Mount Food Atlas (`public/foods/`)**: 64 pixel-art icons for mount food items (`01_pho_bo.png` .. `64_vo_cuc_hong_mong_than_yen.png`).

### 🐴 Mount Feeding & AFK Drops System
- **Mount Leveling**: Feed dishes to Spirit Mounts for +5% XP/level bonuses.
- **AFK / Treo Máy Drops**: Idling, petting Thỏ, and deploying microservices reward food items alongside spirit stones and herbs.
- **Phường Thị Trading**: Buy and sell all 64 food items in the Tu Chân Market.

---

## 🌐 Application Execution Modes (`APP_MODE`)

IDS supports 3 flexible UI execution modes configured via the `APP_MODE` environment variable in `.env`:

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
│   ├── ids-health/         # Health Metrics Agent (Deploys on remote servers)
│   └── ids-mcp/            # Autonomous MCP Server Binary (JSON-RPC 2.0)
├── frontend/               # React SPA Architecture (Vite + TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── rabbit/         # Rabbit UI Controller & Command Schemas
│   │   ├── components/     # UI Components (HeaderBar, ServiceSidebar, DeploymentPanel, TerminalView)
│   │   ├── components/modals/ # Modals (GitModal, MultiDeployModal, CompareModal, VPNModal, HealthMonitorModal, GlobalSettingsModal, ShortcutsModal, ToolsModal)
│   │   ├── components/mascot/ # Tu Tien Mascot Persona & Voice Controller
│   │   ├── pages/          # Standalone Pages (ToolsPage)
│   │   ├── types/          # TypeScript Type Definitions
│   │   └── utils/          # Key-Value & UI Intent Parsers
│   └── dist/               # Production React Build Bundle
├── internal/
│   ├── mcp/                # MCP Server & Tool Registration Suites
│   ├── deployment/         # Stateful Deployment Manager & SSE Streaming Engine
│   ├── service/            # Service Telemetry & Workspace Scanning
│   ├── git/                # Git Operations (Reset, Checkout, Pull, Diff)
│   └── monitoring/         # Infrastructure Metrics & Health Telemetry
├── settings.json           # Application Configuration (Workspaces, Services, Commands)
├── MCP.md                  # Model Context Protocol Specification & Architecture
├── restart.sh              # One-click Rebuild & Restart Script for Dual Stack
├── .env                    # Environment Variables (DB, Agents, SSH)
└── README.md               # System Documentation
```
