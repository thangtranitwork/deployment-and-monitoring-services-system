package mcp

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
)

type Server struct {
	mu    sync.RWMutex
	tools map[string]*RegisteredTool
}

var defaultServer *Server
var once sync.Once

func GetServer() *Server {
	once.Do(func() {
		defaultServer = NewServer()
	})
	return defaultServer
}

func NewServer() *Server {
	return &Server{
		tools: make(map[string]*RegisteredTool),
	}
}

func (s *Server) RegisterTool(tool MCPTool, handler ToolHandler) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tools[tool.Name] = &RegisteredTool{
		Tool:    tool,
		Handler: handler,
	}
}

func (s *Server) GetTools() []MCPTool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := make([]MCPTool, 0, len(s.tools))
	for _, reg := range s.tools {
		list = append(list, reg.Tool)
	}
	return list
}

func (s *Server) ExecuteTool(ctx context.Context, name string, args map[string]interface{}) (interface{}, error) {
	s.mu.RLock()
	reg, ok := s.tools[name]
	s.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("tool '%s' not registered in MCP Server", name)
	}

	return reg.Handler(ctx, args)
}

func (s *Server) HandleJSONRPC(ctx context.Context, rawRequest []byte) ([]byte, error) {
	var req JSONRPCRequest
	if err := json.Unmarshal(rawRequest, &req); err != nil {
		resp := JSONRPCResponse{
			JSONRPC: "2.0",
			Error: &RPCError{
				Code:    -32700,
				Message: "Parse error",
			},
		}
		return json.Marshal(resp)
	}

	switch req.Method {
	case "tools/list":
		tools := s.GetTools()
		resp := JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Result: map[string]interface{}{
				"tools": tools,
			},
		}
		return json.Marshal(resp)

	case "tools/call":
		name, _ := req.Params["name"].(string)
		args, _ := req.Params["arguments"].(map[string]interface{})
		if args == nil {
			args = make(map[string]interface{})
		}

		res, err := s.ExecuteTool(ctx, name, args)
		if err != nil {
			resp := JSONRPCResponse{
				JSONRPC: "2.0",
				ID:      req.ID,
				Error: &RPCError{
					Code:    -32603,
					Message: err.Error(),
				},
			}
			return json.Marshal(resp)
		}

		resp := JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Result: map[string]interface{}{
				"content": []map[string]interface{}{
					{
						"type": "text",
						"text": res,
					},
				},
			},
		}
		return json.Marshal(resp)

	default:
		resp := JSONRPCResponse{
			JSONRPC: "2.0",
			ID:      req.ID,
			Error: &RPCError{
				Code:    -32601,
				Message: fmt.Sprintf("Method '%s' not found", req.Method),
			},
		}
		return json.Marshal(resp)
	}
}
