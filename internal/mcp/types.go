package mcp

import (
	"context"
)

type ToolParamProperty struct {
	Type        string               `json:"type"`
	Description string               `json:"description,omitempty"`
	Enum        []string             `json:"enum,omitempty"`
}

type ToolParameters struct {
	Type       string                        `json:"type"`
	Properties map[string]*ToolParamProperty `json:"properties"`
	Required   []string                      `json:"required,omitempty"`
}

type MCPTool struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	Parameters  ToolParameters `json:"inputSchema"` // MCP Standard uses inputSchema
}

type ToolHandler func(ctx context.Context, args map[string]interface{}) (interface{}, error)

type RegisteredTool struct {
	Tool    MCPTool
	Handler ToolHandler
}

// JSON-RPC 2.0 Protocol Structs for MCP Standard
type JSONRPCRequest struct {
	JSONRPC string                 `json:"jsonrpc"`
	ID      interface{}            `json:"id,omitempty"`
	Method  string                 `json:"method"`
	Params  map[string]interface{} `json:"params,omitempty"`
}

type JSONRPCResponse struct {
	JSONRPC string      `json:"jsonrpc"`
	ID      interface{} `json:"id"`
	Result  interface{} `json:"result,omitempty"`
	Error   *RPCError   `json:"error,omitempty"`
}

type RPCError struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}
