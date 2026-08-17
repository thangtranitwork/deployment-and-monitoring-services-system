package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"deploy-tool-go/internal/mcp"
	mcptools "deploy-tool-go/internal/mcp/tools"
)

// CommanderServiceFetcher implements tools.ServiceFetcher
type CommanderServiceFetcher struct{}

func (f *CommanderServiceFetcher) GetAllServiceNames() []string {
	s := loadSettings()
	svcs := scanServices(s)
	var names []string
	for _, sv := range svcs {
		names = append(names, sv.Name)
	}
	return names
}

func (f *CommanderServiceFetcher) GetServiceDetail(name string) (map[string]interface{}, bool) {
	s := loadSettings()
	svcs := scanServices(s)
	for _, sv := range svcs {
		if strings.EqualFold(sv.Name, name) {
			return map[string]interface{}{
				"name":        sv.Name,
				"branch":      sv.Branch,
				"last_commit": sv.LastCommit,
				"has_dev":     sv.HasDev,
				"has_stg":     sv.HasStg,
				"has_prod":    sv.HasProd,
				"ahead":       sv.Ahead,
				"behind":      sv.Behind,
				"staged":      sv.StagedChanges,
			}, true
		}
	}
	return nil, false
}

// CommanderGitResolver implements tools.GitDirectoryResolver
type CommanderGitResolver struct{}

func (r *CommanderGitResolver) GetDirectoryForService(serviceName string) (string, bool) {
	s := loadSettings()
	ws := s.GetActiveWorkspace()
	if ws == nil || ws.Path == "" {
		return "", false
	}
	dir := filepath.Join(ws.Path, serviceName)
	if _, err := os.Stat(dir); err == nil {
		return dir, true
	}
	return ws.Path, true
}

func initMCPTools() {
	server := mcp.GetServer()
	mcptools.SetServiceFetcher(&CommanderServiceFetcher{})
	mcptools.SetGitDirectoryResolver(&CommanderGitResolver{})

	mcptools.RegisterDeploymentTools(server)
	mcptools.RegisterServiceTools(server)
	mcptools.RegisterGitTools(server)
	mcptools.RegisterMonitoringTools(server)

	log.Printf("[Voice-MCP] Registered %d MCP tools in Commander Engine", len(server.GetTools()))
}

type VoiceHistoryTurn struct {
	Role string `json:"role"` // "user" or "model"
	Text string `json:"text"`
}

type VoiceCommandRequest struct {
	Text              string             `json:"text,omitempty"`
	AudioBase64       string             `json:"audio_base64,omitempty"`
	MimeType          string             `json:"mime_type,omitempty"`
	Services          []string           `json:"services"`
	UserRole          string             `json:"user_role,omitempty"`
	ConfirmProduction bool               `json:"confirm_production,omitempty"`
	History           []VoiceHistoryTurn `json:"history,omitempty"`
}

// Structured Command Schema (Target Architecture)
type StructuredCommandPayload struct {
	Service           string   `json:"service,omitempty"`
	Services          []string `json:"services,omitempty"`
	Environment       string   `json:"environment,omitempty"`
	Branch            string   `json:"branch,omitempty"`
	DeploymentID      string   `json:"deployment_id,omitempty"`
	Question          string   `json:"question,omitempty"`
	Candidates        []string `json:"candidates,omitempty"`
	Reason            string   `json:"reason,omitempty"`
	ConfirmProduction bool     `json:"confirm_production,omitempty"`
}

type StructuredCommand struct {
	Type         string                   `json:"type"`
	Payload      StructuredCommandPayload `json:"payload"`
	BunnyMessage string                   `json:"bunny_message"`
}

type VoiceCommandResponse struct {
	Success         bool               `json:"success"`
	Command         *StructuredCommand `json:"command"`
	BunnyMessage    string             `json:"bunny_message"`
	ActionType      string             `json:"action_type"`
	Result          interface{}        `json:"result,omitempty"`
	RequiresConfirm bool               `json:"requires_confirmation,omitempty"`
}

// Gemini API structures
type GeminiContent struct {
	Role  string       `json:"role,omitempty"`
	Parts []GeminiPart `json:"parts"`
}

type GeminiInlineData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type GeminiPart struct {
	Text       string            `json:"text,omitempty"`
	InlineData *GeminiInlineData `json:"inlineData,omitempty"`
}

type GeminiRequestBody struct {
	Contents          []GeminiContent  `json:"contents"`
	SystemInstruction *GeminiContent   `json:"systemInstruction,omitempty"`
	GenerationConfig  *GeminiGenConfig `json:"generationConfig,omitempty"`
}

type GeminiGenConfig struct {
	ResponseMIMEType string `json:"responseMimeType,omitempty"`
}

type GeminiResponseBody struct {
	Candidates []struct {
		Content struct {
			Parts []GeminiPart `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
	Error *struct {
		Message string `json:"message"`
		Code    int    `json:"code"`
	} `json:"error,omitempty"`
}

func voiceCommandHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req VoiceCommandRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		json.NewEncoder(w).Encode(VoiceCommandResponse{
			Success:      false,
			BunnyMessage: "⚠️ Chưa cấu hình GEMINI_API_KEY trong file .env!",
			ActionType:   "error",
		})
		return
	}

	// Prepare user parts
	parts := []GeminiPart{}
	if req.AudioBase64 != "" {
		mime := req.MimeType
		if mime == "" {
			mime = "audio/webm"
		}
		if idx := strings.Index(mime, ";"); idx != -1 {
			mime = mime[:idx]
		}

		base64Data := req.AudioBase64
		if idx := strings.Index(base64Data, ","); idx != -1 {
			base64Data = base64Data[idx+1:]
		}

		parts = append(parts, GeminiPart{
			InlineData: &GeminiInlineData{
				MimeType: mime,
				Data:     base64Data,
			},
		})
		parts = append(parts, GeminiPart{
			Text: "Hãy nghe tệp âm thanh này, hiểu ý định người dùng và trả về một Structured Command JSON duy nhất theo đúng schema.",
		})
	} else if strings.TrimSpace(req.Text) != "" {
		parts = append(parts, GeminiPart{
			Text: fmt.Sprintf("Khẩu lệnh người dùng: \"%s\". Hãy trả về Structured Command JSON.", strings.TrimSpace(req.Text)),
		})
	} else {
		json.NewEncoder(w).Encode(VoiceCommandResponse{
			Success:      false,
			BunnyMessage: "🐰 Bổn Thỏ chưa nhận được dữ liệu âm thanh hay văn bản nào!",
			ActionType:   "unknown",
		})
		return
	}

	allWorkspaceServices := (&CommanderServiceFetcher{}).GetAllServiceNames()

	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	// Prepend history
	currentContents := []GeminiContent{}
	for _, turn := range req.History {
		if strings.TrimSpace(turn.Text) != "" {
			role := turn.Role
			if role == "" {
				role = "user"
			}
			currentContents = append(currentContents, GeminiContent{
				Role: role,
				Parts: []GeminiPart{
					{Text: turn.Text},
				},
			})
		}
	}
	currentContents = append(currentContents, GeminiContent{
		Role:  "user",
		Parts: parts,
	})

	sysInstructionText := fmt.Sprintf(
		"Bạn là Thỏ Tiên (trợ lý DevOps tu tiên gia cho IDS Deployment Tool). Bạn xưng 'Bổn Thỏ' và gọi người dùng là 'ngài' hoặc 'đại nhân'.\n"+
			"Danh sách TẤT CẢ microservices hiện có: %s.\n"+
			"NHIỆM VỤ: Phân tích khẩu lệnh và lịch sử trò chuyện để TRẢ VỀ DẠNG JSON DUY NHẤT (Structured Command) với cấu trúc:\n"+
			"{\n"+
			"  \"type\": \"COMMAND_TYPE\",\n"+
			"  \"payload\": {\n"+
			"    \"service\": \"tên_service_chuẩn\",\n"+
			"    \"services\": [\"service_1\", \"service_2\"],\n"+
			"    \"environment\": \"dev|stg|prod\",\n"+
			"    \"branch\": \"tên_branch\",\n"+
			"    \"question\": \"câu_hỏi_làm_rõ\",\n"+
			"    \"candidates\": [\"service_1\", \"service_2\"]\n"+
			"  },\n"+
			"  \"bunny_message\": \"Câu thoại tiên gia của Thỏ Tiên (ví dụ: '🚀 Tuân lệnh ngài! Thỏ Tiên tiến hành Deploy service auth-service (STG) ngay!')\"\n"+
			"}\n\n"+
			"CÁC TYPE HỢP LỆ:\n"+
			"- DEPLOY_SERVICE: Khi cần deploy 1 hoặc nhiều service (Ví dụ: 'daily server' -> service: 'daily-server-go'). NẾU NGƯỜI DÙNG KHÔNG NÓI RÕ MÔI TRƯỜNG, MẶC ĐỊNH environment LÀ 'dev'.\n"+
			"- GET_SERVICE_STATUS: Khi hỏi trạng thái service.\n"+
			"- LIST_SERVICES: Khi hỏi danh sách service.\n"+
			"- GIT_PULL: Khi muốn pull code git.\n"+
			"- GIT_CHECKOUT: Khi muốn chuyển branch git.\n"+
			"- GIT_STATUS: Khi muốn xem git status.\n"+
			"- GET_SYSTEM_STATS: Khi hỏi linh lực CPU/RAM.\n"+
			"- CHECK_AND_DEPLOY: Khi muốn kiểm tra rồi deploy. NẾU KHÔNG NÓI MÔI TRƯỜNG, MẶC ĐỊNH LÀ 'dev'.\n"+
			"- NEED_CLARIFICATION: Khi có 2 service nhập nhằng cần hỏi lại ngài (trả câu hỏi trong question).\n"+
			"- UNKNOWN: Khi không hiểu khẩu lệnh.\n"+
			"CHỈ TRẢ VỀ JSON DUY NHẤT, KHÔNG THÊM MARKDOWN KHÁC.",
		strings.Join(allWorkspaceServices, ", "),
	)

	geminiReq := GeminiRequestBody{
		Contents: currentContents,
		SystemInstruction: &GeminiContent{
			Parts: []GeminiPart{
				{Text: sysInstructionText},
			},
		},
		GenerationConfig: &GeminiGenConfig{
			ResponseMIMEType: "application/json",
		},
	}

	geminiResp, lastErr := executeGeminiCallWithFallback(apiKey, geminiReq)
	if lastErr != nil || geminiResp == nil || len(geminiResp.Candidates) == 0 {
		errMsg := "Lỗi kết nối Gemini API Parser"
		if lastErr != nil {
			errMsg = lastErr.Error()
		}
		log.Printf("[Voice-Parser] Gemini Call failed: %v", lastErr)

		json.NewEncoder(w).Encode(VoiceCommandResponse{
			Success: false,
			Command: &StructuredCommand{
				Type: "UNKNOWN",
				Payload: StructuredCommandPayload{
					Reason: errMsg,
				},
				BunnyMessage: fmt.Sprintf("🐰 Bổn Thỏ gặp sự cố khi liên kết linh lực Gemini: %s", errMsg),
			},
			BunnyMessage: fmt.Sprintf("🐰 Bổn Thỏ gặp sự cố khi liên kết linh lực Gemini: %s", errMsg),
			ActionType:   "unknown",
		})
		return
	}

	rawJSON := geminiResp.Candidates[0].Content.Parts[0].Text
	log.Printf("[Voice-Parser] Gemini JSON Output: %s", rawJSON)

	var cmd StructuredCommand
	if err := json.Unmarshal([]byte(rawJSON), &cmd); err != nil {
		log.Printf("[Voice-Parser] Error parsing JSON: %v", err)
		cmd = StructuredCommand{
			Type: "UNKNOWN",
			Payload: StructuredCommandPayload{
				Reason: fmt.Sprintf("Không thể parse JSON từ Gemini: %v", err),
			},
			BunnyMessage: "🐰 Bổn Thỏ chưa hiểu rõ khẩu lệnh này của ngài!",
		}
	}

	actionType := "info"
	switch cmd.Type {
	case "DEPLOY_SERVICE", "CHECK_AND_DEPLOY":
		actionType = "deploy"
	case "GIT_PULL", "GIT_CHECKOUT", "GIT_STATUS":
		actionType = "git"
	case "GET_SERVICE_STATUS", "LIST_SERVICES", "GET_SYSTEM_STATS":
		actionType = "status"
	}

	// Also execute backend capability via MCP Server if deployment is single service
	var backendResult interface{}
	if cmd.Type == "DEPLOY_SERVICE" && cmd.Payload.Service != "" && len(cmd.Payload.Services) <= 1 {
		env := cmd.Payload.Environment
		if env == "" {
			env = "dev"
		}
		toolArgs := map[string]interface{}{
			"service_name": cmd.Payload.Service,
			"environment":  env,
		}
		if req.ConfirmProduction {
			toolArgs["confirm_production"] = true
		}
		res, _ := mcp.GetServer().ExecuteTool(ctx, "deploy_service", toolArgs)
		backendResult = res
	}

	json.NewEncoder(w).Encode(VoiceCommandResponse{
		Success:      cmd.Type != "UNKNOWN",
		Command:      &cmd,
		BunnyMessage: cmd.BunnyMessage,
		ActionType:   actionType,
		Result:       backendResult,
	})
}

// executeGeminiCallWithFallback tries models in sequence if rate limited / 429 hit
func executeGeminiCallWithFallback(apiKey string, geminiReq GeminiRequestBody) (*GeminiResponseBody, error) {
	modelsToTry := []string{
		"gemini-flash-latest",
		"gemini-2.5-flash",
		"gemini-3.7-flash",
	}

	reqBytes, err := json.Marshal(geminiReq)
	if err != nil {
		return nil, err
	}

	client := &http.Client{Timeout: 25 * time.Second}
	var lastErr error

	for _, model := range modelsToTry {
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, apiKey)
		log.Printf("[Voice-Parser] Attempting Gemini Call using model: %s...", model)

		resp, err := client.Post(url, "application/json", bytes.NewBuffer(reqBytes))
		if err != nil {
			log.Printf("[Voice-Parser] Network error for model %s: %v", model, err)
			lastErr = err
			continue
		}

		bodyBytes, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			log.Printf("[Voice-Parser] Read error for model %s: %v", model, err)
			lastErr = err
			continue
		}

		var geminiResp GeminiResponseBody
		if err := json.Unmarshal(bodyBytes, &geminiResp); err != nil {
			log.Printf("[Voice-Parser] Unmarshal error for model %s: %v", model, err)
			lastErr = fmt.Errorf("model %s unmarshal error: %v", model, err)
			continue
		}

		if geminiResp.Error != nil {
			log.Printf("[Voice-Parser] API Error for model %s (code %d): %s", model, geminiResp.Error.Code, geminiResp.Error.Message)
			lastErr = fmt.Errorf("API Error (%d): %s", geminiResp.Error.Code, geminiResp.Error.Message)

			// If rate limited or quota exceeded (429 / 404), fall back to next model!
			if geminiResp.Error.Code == 429 || geminiResp.Error.Code == 404 {
				continue
			}
			return nil, lastErr
		}

		if len(geminiResp.Candidates) > 0 {
			log.Printf("[Voice-Parser] Successfully received response from model: %s", model)
			return &geminiResp, nil
		}
	}

	return nil, fmt.Errorf("Tất cả mô hình Gemini đều bận hoặc hết Quota: %v", lastErr)
}

func ttsHandler(w http.ResponseWriter, r *http.Request) {
	text := strings.TrimSpace(r.URL.Query().Get("text"))
	if text == "" {
		http.Error(w, "text parameter required", http.StatusBadRequest)
		return
	}

	if len(text) > 200 {
		text = text[:200]
	}

	ttsURL := fmt.Sprintf("https://translate.google.com/translate_tts?ie=UTF-8&tl=vi&client=tw-ob&q=%s", url.QueryEscape(text))

	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, ttsURL, nil)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("TTS upstream status: %d", resp.StatusCode), http.StatusBadGateway)
		return
	}

	w.Header().Set("Content-Type", "audio/mpeg")
	w.Header().Set("Cache-Control", "public, max-age=86400")
	io.Copy(w, resp.Body)
}
