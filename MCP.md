# 🛠️ MCP System Architecture & Specification (IDS Deployment & Monitoring)

Tài liệu tổng hợp kiến trúc chuẩn **Model Context Protocol (MCP)** và hệ thống **AI Command Parser + Rabbit UI Controller + MCP Capability Layer** trong hệ thống IDS.

---

## 🏛️ 1. Tổng Quan Kiến Trúc (Architecture Overview)

Hệ thống hoạt động theo mô hình **Clean Decoupled Architecture**: Phân tách hoàn toàn giữa lớp trí tuệ AI (Intent Parser), lớp điều khiển giao diện Frontend (Rabbit UI Controller), và lớp năng lực hạ tầng ở Backend (MCP Capability Layer):

```
🎤 User Audio (MediaRecorder - audio/webm) / Text Command
         ↓
Gemini 2.5 Flash / Flash Latest (AI Intent & Command Parser - Brain)
         ↓  Structured Command JSON (type, payload, bunny_message)
🐰 Frontend Rabbit UI Controller (RabbitCommandDispatcher.ts & uiIntentResolver.ts)
  ├── 1. Điều Phối Trạng Thái UI (Modals, Navigation, React State, Sidebar)
  ├── 2. Live Console Grid View (MultiDeployModal stream logs song song)
  ├── 3. Production Safety Gate (WAITING_FOR_CONFIRMATION)
  └── 4. Khóa Bong Bóng Thoại (Speech Bubble Display Lock 8 giây)
         ↓
IDS MCP Server (cmd/ids-mcp & internal/mcp)
         ↓
Domain Layer (internal/deployment, internal/service, internal/git, internal/monitoring)
         ↓
IDS Commander & Remote Health Agents
```

### Nguyên Tắc Thiết Kế Cốt Lõi:
1. **Gemini Là Trí Tuệ Phân Tích Ý Định (Pure Command Parser)**: Gemini không trực tiếp thực thi thao tác DOM hay tool hạ tầng, mà chỉ trả về JSON **Structured Command** chuẩn hóa.
2. **Rabbit UI Controller Điều Phối UI**: Mọi hành vi giao diện (mở Modal, chuyển Tab Terminal, kích hoạt SSE log stream, Prod Pass confirmation) do Frontend Rabbit Dispatcher quản lý thông qua React state/callbacks (tuyệt đối không dùng `querySelector` DOM cứng).
3. **Model Fallback Chain**: Tự động chuyển đổi thông minh giữa các model (`gemini-flash-latest`, `gemini-2.5-flash`, `gemini-3.7-flash`) khi gặp phải lỗi `429 Rate Limit / Quota Exceeded`.
4. **Security & Safety Gate ở Backend MCP**: Cổng kiểm soát Production (`confirm_production`), RBAC, Idempotency và Concurrency được bảo vệ 100% tại MCP Server (`internal/mcp`).
5. **Pure Audio Standard**: Loại bỏ hoàn toàn WebSpeech API. Frontend dùng `MediaRecorder` thu âm chuẩn HTML5 (`audio/webm`).

---

## 📐 2. Gemini Command Schema & Command Types

Gemini trả về duy nhất định dạng JSON Schema **Structured Command**:

```json
{
  "type": "DEPLOY_SERVICE",
  "payload": {
    "service": "payment-service-go",
    "services": ["payment-service-go", "notification-worker-go"],
    "environment": "dev",
    "branch": "develop",
    "question": "câu_hỏi_làm_rõ",
    "candidates": ["service_1", "service_2"]
  },
  "bunny_message": "🚀 Tuân lệnh ngài! Thỏ Tiên tiến hành Deploy các service (DEV) ngay!"
}
```

### Danh Sách Command Types Hợp Lệ:
- **`DEPLOY_SERVICE`**: Deploy 1 hoặc nhiều microservices. Mặc định `environment = "dev"` nếu người dùng không nhắc đến.
- **`GET_SERVICE_STATUS`**: Xem trạng thái chi tiết của microservice.
- **`LIST_SERVICES`**: Liệt kê danh sách microservices.
- **`GIT_PULL` / `GIT_CHECKOUT` / `GIT_STATUS`**: Thao tác Git repository.
- **`GET_SYSTEM_STATS`**: Xem linh lực hạ tầng CPU/RAM.
- **`GET_DEPLOYMENT_LOGS`**: Mở tab log xem chi tiết tiến trình triển khai.
- **`ROLLBACK_DEPLOYMENT`**: Khôi phục phiên bản trước.
- **`CHECK_AND_DEPLOY`**: Điều phối kiểm tra trạng thái ➔ nếu healthy ➔ deploy.
- **`NEED_CLARIFICATION`**: Khi tên service nhập nhằng, Gemini gửi câu hỏi yêu cầu người dùng xác nhận lại.
- **`UNKNOWN`**: Khi không hiểu khẩu lệnh.

---

## 🛠️ 3. Danh Sách Các MCP Tools (MCP Tool Specifications)

MCP Server ở Backend (`cmd/ids-mcp` & `internal/mcp`) chịu trách nhiệm cung cấp các Backend Capabilities:

### 🚀 Deployment Suite (`internal/mcp/tools/deployment.go`)
- **`deploy_service`**: Khởi tạo tiến trình triển khai stateful (`service_name`, `environment`, `confirm_production`).
- **`get_deployment_status`**: Kiểm tra tiến trình deployment (`deployment_id`).

### 📦 Service Suite (`internal/mcp/tools/service.go`)
- **`list_services`**: Liệt kê các microservices hiện có.
- **`get_service_status`**: Kiểm tra trạng thái và telemetry của service (`service_name`).

### 🔀 Git Suite (`internal/mcp/tools/git.go`)
- **`git_pull`**: Kéo mã nguồn mới nhất (`service_name`).
- **`git_checkout`**: Chuyển nhánh Git (`service_name`, `branch_name`).
- **`git_status`**: Kiểm tra thay đổi chưa commit (`service_name`).

### ⚡ Monitoring Suite (`internal/mcp/tools/monitoring.go`)
- **`get_system_stats`**: Truy xuất chỉ số Linh Lực toàn hệ thống (CPU, RAM, OS, Goroutines).

---

## 🔄 4. Luồng Xử Lý Realtime Deployment & Live Console Grid View

### Realtime SSE Log Streaming:
- Khi `RabbitCommandDispatcher` nhận lệnh deploy, nó gọi `/api/deploy` và lắng nghe luồng SSE stream thời gian thực (`data: ...`).
- Log được render trực tiếp lên tab Terminal Deploy hoặc từng khung Live Console của `MultiDeployModal`.

### Multi-Deploy Live Console Grid View:
- Với câu lệnh deploy hàng loạt (ví dụ *"Deploy recommendation và notification service"*), `MultiDeployModal` tự động bật lên ở dạng **Live Console Grid View** (`showConsoleGrid = true`).
- Màn hình hiển thị lưới ô vuông với ô log stream thời gian thực riêng biệt chạy song song cho từng service.

---

## 📂 5. Cấu Trúc File Hệ Thống AI & MCP

```
cmd/
├── ids-commander/
│   └── voice_handler.go        # REST API Handler: Gemini Parser + Model Fallback Chain
├── ids-mcp/
│   └── main.go                 # MCP Server Binary độc lập (JSON-RPC 2.0)

frontend/src/
├── rabbit/
│   ├── RabbitCommandTypes.ts   # Command Schema Definitions
│   └── RabbitCommandDispatcher.ts # Rabbit UI Controller & Dispatcher
├── utils/
│   └── uiIntentResolver.ts     # Dịch MCP Response sang UI Intent Actions
├── components/mascot/
│   ├── BunnyMascot.tsx         # Mascot Persona & Speech Bubble Lock (8s)
│   └── hooks/useVoiceCommand.ts # MediaRecorder HTML5 Audio Processing
```
