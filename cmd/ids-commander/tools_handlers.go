package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"regexp"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type BcryptHashRequest struct {
	Password string `json:"password"`
	Rounds   int    `json:"rounds"`
}

type BcryptHashResponse struct {
	Hash  string `json:"hash"`
	Error string `json:"error,omitempty"`
}

type BcryptVerifyRequest struct {
	Password string `json:"password"`
	Hash     string `json:"hash"`
}

type BcryptVerifyResponse struct {
	Valid bool   `json:"valid"`
	Error string `json:"error,omitempty"`
}

type ProxyRequest struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers"`
	Body    string            `json:"body"`
}

type ProxyResponse struct {
	Status     int               `json:"status"`
	StatusText string            `json:"status_text"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	IsBase64   bool              `json:"is_base64"`
	TimeMs     int64             `json:"time_ms"`
	Error      string            `json:"error,omitempty"`
}

type DNSLookupRequest struct {
	Domain    string `json:"domain"`
	Type      string `json:"type"`       // A, AAAA, MX, NS, TXT, CNAME, ALL
	DNSServer string `json:"dns_server"` // optional custom IP (e.g. 8.8.8.8)
}

type DNSRecord struct {
	Type  string `json:"type"`
	Value string `json:"value"`
	TTL   uint32 `json:"ttl,omitempty"`
}

type GeoIPInfo struct {
	IP          string  `json:"ip"`
	Country     string  `json:"country"`
	CountryCode string  `json:"country_code"`
	City        string  `json:"city"`
	ISP         string  `json:"isp"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
}

type DNSLookupResponse struct {
	Records []DNSRecord `json:"records"`
	Whois   string      `json:"whois"`
	GeoIP   *GeoIPInfo  `json:"geoip,omitempty"`
	Error   string      `json:"error,omitempty"`
}

func bcryptHashHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req BcryptHashRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	cost := req.Rounds
	if cost < 4 || cost > 31 {
		cost = bcrypt.DefaultCost
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(req.Password), cost)
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		json.NewEncoder(w).Encode(BcryptHashResponse{Error: err.Error()})
		return
	}

	json.NewEncoder(w).Encode(BcryptHashResponse{Hash: string(hashedBytes)})
}

func bcryptVerifyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req BcryptVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	err := bcrypt.CompareHashAndPassword([]byte(req.Hash), []byte(req.Password))
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		json.NewEncoder(w).Encode(BcryptVerifyResponse{Valid: false})
		return
	}

	json.NewEncoder(w).Encode(BcryptVerifyResponse{Valid: true})
}

func curlProxyHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ProxyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Method == "" {
		req.Method = "GET"
	}

	client := &http.Client{
		Timeout: 30 * time.Second,
	}

	var bodyReader io.Reader
	if req.Body != "" {
		bodyReader = bytes.NewReader([]byte(req.Body))
	}

	httpReq, err := http.NewRequest(req.Method, req.URL, bodyReader)
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		json.NewEncoder(w).Encode(ProxyResponse{Error: "Failed to create HTTP request: " + err.Error()})
		return
	}

	for k, v := range req.Headers {
		httpReq.Header.Set(k, v)
	}

	start := time.Now()
	resp, err := client.Do(httpReq)
	duration := time.Since(start)

	if err != nil {
		json.NewEncoder(w).Encode(ProxyResponse{Error: "Failed to execute HTTP request: " + err.Error()})
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		json.NewEncoder(w).Encode(ProxyResponse{Error: "Failed to read response body: " + err.Error()})
		return
	}

	respHeaders := make(map[string]string)
	for k, v := range resp.Header {
		if len(v) > 0 {
			respHeaders[k] = v[0]
		}
	}

	json.NewEncoder(w).Encode(ProxyResponse{
		Status:     resp.StatusCode,
		StatusText: resp.Status,
		Headers:    respHeaders,
		Body:       base64.StdEncoding.EncodeToString(respBody),
		IsBase64:   true,
		TimeMs:     duration.Milliseconds(),
	})
}

// DNS Dig / Lookup handler
func dnsLookupHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req DNSLookupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	records, err := lookupDNSRecords(ctx, req.Domain, req.Type, req.DNSServer)
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		json.NewEncoder(w).Encode(DNSLookupResponse{Error: "DNS Lookup failed: " + err.Error()})
		return
	}

	// WHOIS lookup
	whoisText, _ := queryWhois(req.Domain)

	// GeoIP info from first A record
	var geoIP *GeoIPInfo
	for _, rec := range records {
		if rec.Type == "A" {
			g, err := fetchGeoIP(rec.Value)
			if err == nil {
				geoIP = g
				break
			}
		}
	}

	json.NewEncoder(w).Encode(DNSLookupResponse{
		Records: records,
		Whois:   whoisText,
		GeoIP:   geoIP,
	})
}

func lookupDNSRecords(ctx context.Context, domain string, recordType string, dnsServer string) ([]DNSRecord, error) {
	var resolver *net.Resolver
	if dnsServer != "" {
		resolver = &net.Resolver{
			PreferGo: true,
			Dial: func(ctx context.Context, network, address string) (net.Conn, error) {
				d := net.Dialer{
					Timeout: 3 * time.Second,
				}
				return d.DialContext(ctx, "udp", dnsServer+":53")
			},
		}
	} else {
		resolver = net.DefaultResolver
	}

	var records []DNSRecord
	lookupType := strings.ToUpper(recordType)

	// A records
	if lookupType == "A" || lookupType == "ALL" {
		ips, err := resolver.LookupIP(ctx, "ip4", domain)
		if err == nil {
			for _, ip := range ips {
				records = append(records, DNSRecord{Type: "A", Value: ip.String()})
			}
		}
	}

	// AAAA records
	if lookupType == "AAAA" || lookupType == "ALL" {
		ips, err := resolver.LookupIP(ctx, "ip6", domain)
		if err == nil {
			for _, ip := range ips {
				records = append(records, DNSRecord{Type: "AAAA", Value: ip.String()})
			}
		}
	}

	// MX records
	if lookupType == "MX" || lookupType == "ALL" {
		mxs, err := resolver.LookupMX(ctx, domain)
		if err == nil {
			for _, mx := range mxs {
				records = append(records, DNSRecord{Type: "MX", Value: fmt.Sprintf("%d %s", mx.Pref, mx.Host)})
			}
		}
	}

	// NS records
	if lookupType == "NS" || lookupType == "ALL" {
		nss, err := resolver.LookupNS(ctx, domain)
		if err == nil {
			for _, ns := range nss {
				records = append(records, DNSRecord{Type: "NS", Value: ns.Host})
			}
		}
	}

	// TXT records
	if lookupType == "TXT" || lookupType == "ALL" {
		txts, err := resolver.LookupTXT(ctx, domain)
		if err == nil {
			for _, txt := range txts {
				records = append(records, DNSRecord{Type: "TXT", Value: txt})
			}
		}
	}

	// CNAME records
	if lookupType == "CNAME" || lookupType == "ALL" {
		cname, err := resolver.LookupCNAME(ctx, domain)
		if err == nil && cname != "" && cname != domain+"." {
			records = append(records, DNSRecord{Type: "CNAME", Value: cname})
		}
	}

	return records, nil
}

func queryWhois(domain string) (string, error) {
	domain = strings.Replace(domain, "http://", "", 1)
	domain = strings.Replace(domain, "https://", "", 1)
	domain = strings.Replace(domain, "www.", "", 1)
	domain = strings.Split(domain, "/")[0]
	domain = strings.Split(domain, "?")[0]
	domain = strings.TrimSpace(domain)

	parts := strings.Split(domain, ".")
	if len(parts) < 2 {
		return "", fmt.Errorf("invalid domain format")
	}

	tld := parts[len(parts)-1]
	whoisServer := tld + ".whois-servers.net"
	
	switch tld {
	case "vn":
		whoisServer = "whois.vnnic.vn"
	case "com", "net":
		whoisServer = "whois.verisign-grs.com"
	case "org":
		whoisServer = "whois.pir.org"
	case "io":
		whoisServer = "whois.nic.io"
	case "me":
		whoisServer = "whois.nic.me"
	case "cc":
		whoisServer = "whois.nic.cc"
	case "cn":
		whoisServer = "whois.cnnic.cn"
	}

	conn, err := net.DialTimeout("tcp", whoisServer+":43", 5*time.Second)
	if err != nil {
		whoisServer = "whois.iana.org"
		conn, err = net.DialTimeout("tcp", whoisServer+":43", 5*time.Second)
		if err != nil {
			return "", err
		}
	}
	defer conn.Close()

	conn.Write([]byte(domain + "\r\n"))
	conn.SetReadDeadline(time.Now().Add(10 * time.Second))
	
	var buf bytes.Buffer
	_, err = io.Copy(&buf, conn)
	if err != nil {
		return "", err
	}
	
	return buf.String(), nil
}

type IpApiGeoResponse struct {
	Status      string  `json:"status"`
	Country     string  `json:"country"`
	CountryCode string  `json:"countryCode"`
	City        string  `json:"city"`
	ISP         string  `json:"isp"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
	Message     string  `json:"message"`
}

func fetchGeoIP(ip string) (*GeoIPInfo, error) {
	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Get("http://ip-api.com/json/" + ip)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var ipApiResp IpApiGeoResponse
	if err := json.NewDecoder(resp.Body).Decode(&ipApiResp); err != nil {
		return nil, err
	}

	if ipApiResp.Status == "fail" {
		return nil, fmt.Errorf("ip-api failed: %s", ipApiResp.Message)
	}

	return &GeoIPInfo{
		IP:          ip,
		Country:     ipApiResp.Country,
		CountryCode: ipApiResp.CountryCode,
		City:        ipApiResp.City,
		ISP:         ipApiResp.ISP,
		Lat:         ipApiResp.Lat,
		Lon:         ipApiResp.Lon,
	}, nil
}

// SQL Preview & Schema Tool Handlers

type SQLTableColumn struct {
	Field   string  `json:"field"`
	Type    string  `json:"type"`
	Null    string  `json:"null"`
	Key     string  `json:"key"`
	Default *string `json:"default"`
	Extra   string  `json:"extra"`
}

type SQLPreviewRequest struct {
	SQL   string `json:"sql"`
	Table string `json:"table,omitempty"`
}

type SQLRowDiff struct {
	RowIndex int                    `json:"row_index"`
	Before   map[string]interface{} `json:"before"`
	After    map[string]interface{} `json:"after"`
	Changed  map[string]bool        `json:"changed"`
}

type SQLPreviewResponse struct {
	Success      bool                     `json:"success"`
	Error        string                   `json:"error,omitempty"`
	Operation    string                   `json:"operation"`
	Table        string                   `json:"table,omitempty"`
	TableEngine  string                   `json:"table_engine,omitempty"`
	RowsAffected int64                    `json:"rows_affected"`
	LastInsertID int64                    `json:"last_insert_id"`
	TimeMs       int64                    `json:"time_ms"`
	Columns      []string                 `json:"columns,omitempty"`
	Schema       []SQLTableColumn         `json:"schema,omitempty"`
	BeforeRows   []map[string]interface{} `json:"before_rows,omitempty"`
	AfterRows    []map[string]interface{} `json:"after_rows,omitempty"`
	SelectRows   []map[string]interface{} `json:"select_rows,omitempty"`
	Diff         []SQLRowDiff             `json:"diff,omitempty"`
}

func sqlTablesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	db, err := getDB()
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"error": "Failed to connect DB: " + err.Error()})
		return
	}

	rows, err := db.Query("SHOW TABLES")
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"error": "Failed to fetch tables: " + err.Error()})
		return
	}
	defer rows.Close()

	tables := []string{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil {
			tables = append(tables, name)
		}
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"tables": tables})
}

func sqlSchemaHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	tableName := strings.TrimSpace(r.URL.Query().Get("table"))
	if tableName == "" {
		json.NewEncoder(w).Encode(map[string]interface{}{"error": "Table parameter is required"})
		return
	}

	db, err := getDB()
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"error": "Failed to connect DB: " + err.Error()})
		return
	}

	sanitizedTable := strings.ReplaceAll(tableName, "`", "")
	schema, err := fetchTableSchema(db, sanitizedTable)
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{"error": "Failed to fetch schema: " + err.Error()})
		return
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"table": sanitizedTable, "schema": schema})
}

func fetchTableSchema(db *sql.DB, tableName string) ([]SQLTableColumn, error) {
	rows, err := db.Query(fmt.Sprintf("DESCRIBE `%s`", tableName))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var columns []SQLTableColumn
	for rows.Next() {
		var col SQLTableColumn
		var defVal sql.NullString
		if err := rows.Scan(&col.Field, &col.Type, &col.Null, &col.Key, &defVal, &col.Extra); err == nil {
			if defVal.Valid {
				str := defVal.String
				col.Default = &str
			}
			columns = append(columns, col)
		}
	}
	return columns, nil
}

func queryRowsToMap(rows *sql.Rows) ([]string, []map[string]interface{}, error) {
	cols, err := rows.Columns()
	if err != nil {
		return nil, nil, err
	}

	var results []map[string]interface{}
	for rows.Next() {
		columns := make([]interface{}, len(cols))
		columnPointers := make([]interface{}, len(cols))
		for i := range columns {
			columnPointers[i] = &columns[i]
		}

		if err := rows.Scan(columnPointers...); err != nil {
			return nil, nil, err
		}

		m := make(map[string]interface{})
		for i, colName := range cols {
			val := columnPointers[i].(*interface{})
			if *val == nil {
				m[colName] = nil
			} else if b, ok := (*val).([]byte); ok {
				m[colName] = string(b)
			} else {
				m[colName] = *val
			}
		}
		results = append(results, m)
	}
	return cols, results, nil
}

func extractTableName(sqlQuery string) (string, string) {
	cleanSQL := strings.TrimSpace(sqlQuery)
	upperSQL := strings.ToUpper(cleanSQL)

	var re *regexp.Regexp
	var op string

	if strings.HasPrefix(upperSQL, "UPDATE") {
		op = "UPDATE"
		re = regexp.MustCompile("(?i)^\\s*UPDATE\\s+[`\"]?([a-zA-Z0-9_]+)")
	} else if strings.HasPrefix(upperSQL, "INSERT") {
		op = "INSERT"
		re = regexp.MustCompile("(?i)^\\s*INSERT\\s+(?:INTO\\s+)?[`\"]?([a-zA-Z0-9_]+)")
	} else if strings.HasPrefix(upperSQL, "DELETE") {
		op = "DELETE"
		re = regexp.MustCompile("(?i)^\\s*DELETE\\s+FROM\\s+[`\"]?([a-zA-Z0-9_]+)")
	} else if strings.HasPrefix(upperSQL, "REPLACE") {
		op = "REPLACE"
		re = regexp.MustCompile("(?i)^\\s*REPLACE\\s+(?:INTO\\s+)?[`\"]?([a-zA-Z0-9_]+)")
	} else if strings.HasPrefix(upperSQL, "SELECT") {
		op = "SELECT"
		re = regexp.MustCompile("(?i)\\bFROM\\s+[`\"]?([a-zA-Z0-9_]+)")
	} else {
		op = "UNKNOWN"
	}

	if re != nil {
		matches := re.FindStringSubmatch(cleanSQL)
		if len(matches) > 1 {
			return op, matches[1]
		}
	}

	return op, ""
}

func parseUpdateSetClause(sqlQuery string) map[string]interface{} {
	updates := make(map[string]interface{})
	reSet := regexp.MustCompile(`(?i)\bSET\s+(.*?)(?:\s+WHERE\b|$)`)
	match := reSet.FindStringSubmatch(sqlQuery)
	if len(match) < 2 {
		return updates
	}

	setClause := strings.TrimSpace(match[1])

	var pairs []string
	var current strings.Builder
	inQuote := false
	quoteChar := byte(0)

	for i := 0; i < len(setClause); i++ {
		ch := setClause[i]
		if (ch == '\'' || ch == '"' || ch == '`') && (i == 0 || setClause[i-1] != '\\') {
			if !inQuote {
				inQuote = true
				quoteChar = ch
			} else if quoteChar == ch {
				inQuote = false
				quoteChar = 0
			}
		}
		if ch == ',' && !inQuote {
			pairs = append(pairs, current.String())
			current.Reset()
		} else {
			current.WriteByte(ch)
		}
	}
	if current.Len() > 0 {
		pairs = append(pairs, current.String())
	}

	for _, pair := range pairs {
		parts := strings.SplitN(pair, "=", 2)
		if len(parts) == 2 {
			col := strings.Trim(strings.TrimSpace(parts[0]), "`\" ")
			rawVal := strings.TrimSpace(parts[1])
			valStr := strings.Trim(rawVal, "'\"`")
			if strings.ToUpper(rawVal) == "NULL" {
				updates[col] = nil
			} else {
				updates[col] = valStr
			}
		}
	}
	return updates
}

func parseInsertValues(sqlQuery string, schema []SQLTableColumn) map[string]interface{} {
	row := make(map[string]interface{})
	for _, col := range schema {
		if col.Default != nil {
			row[col.Field] = *col.Default
		} else {
			row[col.Field] = nil
		}
	}

	reSet := regexp.MustCompile(`(?i)\bSET\s+(.*)`)
	if match := reSet.FindStringSubmatch(sqlQuery); len(match) > 1 {
		setUpdates := parseUpdateSetClause(sqlQuery)
		for k, v := range setUpdates {
			row[k] = v
		}
		return row
	}

	reCols := regexp.MustCompile(`(?i)\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)`)
	match := reCols.FindStringSubmatch(sqlQuery)
	if len(match) >= 3 {
		cols := strings.Split(match[1], ",")
		vals := strings.Split(match[2], ",")
		if len(cols) == len(vals) {
			for i := 0; i < len(cols); i++ {
				c := strings.Trim(strings.TrimSpace(cols[i]), "`\" ")
				vStr := strings.Trim(strings.TrimSpace(vals[i]), "'\"` ")
				if strings.ToUpper(vStr) == "NULL" {
					row[c] = nil
				} else {
					row[c] = vStr
				}
			}
		}
	}
	return row
}

func sqlPreviewHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req SQLPreviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		json.NewEncoder(w).Encode(SQLPreviewResponse{Success: false, Error: "Invalid request body: " + err.Error()})
		return
	}

	sqlQuery := strings.TrimRight(strings.TrimSpace(req.SQL), ";")
	if sqlQuery == "" {
		json.NewEncoder(w).Encode(SQLPreviewResponse{Success: false, Error: "SQL query cannot be empty"})
		return
	}

	op, targetTable := extractTableName(sqlQuery)
	if req.Table != "" {
		targetTable = req.Table
	}

	db, err := getDB()
	if err != nil {
		json.NewEncoder(w).Encode(SQLPreviewResponse{Success: false, Error: "Database connection error: " + err.Error()})
		return
	}

	resp := SQLPreviewResponse{
		Operation: op,
		Table:     targetTable,
	}

	if targetTable != "" {
		if schema, err := fetchTableSchema(db, targetTable); err == nil {
			resp.Schema = schema
		}
		var engine string
		if err := db.QueryRow("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", targetTable).Scan(&engine); err == nil {
			resp.TableEngine = engine
		}
	}

	start := time.Now()

	// 100% Safe Read-Only Simulation Handler (No DML is executed on DB)
	if op == "SELECT" {
		rows, err := db.Query(sqlQuery)
		resp.TimeMs = time.Since(start).Milliseconds()
		if err != nil {
			resp.Success = false
			resp.Error = err.Error()
			json.NewEncoder(w).Encode(resp)
			return
		}
		defer rows.Close()

		cols, selectRows, err := queryRowsToMap(rows)
		if err != nil {
			resp.Success = false
			resp.Error = "Error reading rows: " + err.Error()
			json.NewEncoder(w).Encode(resp)
			return
		}

		resp.Success = true
		resp.Columns = cols
		resp.SelectRows = selectRows
		resp.RowsAffected = int64(len(selectRows))
		json.NewEncoder(w).Encode(resp)
		return
	}

	reWhere := regexp.MustCompile(`(?i)\s+WHERE\s+(.*)`)
	whereMatch := reWhere.FindStringSubmatch(sqlQuery)
	whereClause := ""
	if len(whereMatch) > 1 {
		whereClause = whereMatch[1]
	}

	if op == "UPDATE" {
		if targetTable == "" {
			resp.Success = false
			resp.Error = "Could not identify target table name from UPDATE query."
			json.NewEncoder(w).Encode(resp)
			return
		}

		var selectQuery string
		if whereClause != "" {
			selectQuery = fmt.Sprintf("SELECT * FROM `%s` WHERE %s LIMIT 100", targetTable, whereClause)
		} else {
			selectQuery = fmt.Sprintf("SELECT * FROM `%s` LIMIT 100", targetTable)
		}

		rows, err := db.Query(selectQuery)
		resp.TimeMs = time.Since(start).Milliseconds()
		if err != nil {
			resp.Success = false
			resp.Error = "Read-Only SELECT failed: " + err.Error()
			json.NewEncoder(w).Encode(resp)
			return
		}
		defer rows.Close()

		cols, beforeRows, err := queryRowsToMap(rows)
		if err != nil {
			resp.Success = false
			resp.Error = "Error reading rows: " + err.Error()
			json.NewEncoder(w).Encode(resp)
			return
		}

		resp.Columns = cols
		resp.BeforeRows = beforeRows
		resp.RowsAffected = int64(len(beforeRows))

		updates := parseUpdateSetClause(sqlQuery)
		var afterRows []map[string]interface{}
		var diffs []SQLRowDiff

		for idx, bRow := range beforeRows {
			aRow := make(map[string]interface{})
			for k, v := range bRow {
				aRow[k] = v
			}
			changed := make(map[string]bool)
			for col, newVal := range updates {
				oldVal := aRow[col]
				aRow[col] = newVal
				if fmt.Sprintf("%v", oldVal) != fmt.Sprintf("%v", newVal) {
					changed[col] = true
				}
			}
			afterRows = append(afterRows, aRow)

			diffs = append(diffs, SQLRowDiff{
				RowIndex: idx,
				Before:   bRow,
				After:    aRow,
				Changed:  changed,
			})
		}

		resp.Success = true
		resp.AfterRows = afterRows
		resp.Diff = diffs
		json.NewEncoder(w).Encode(resp)
		return
	}

	if op == "DELETE" {
		if targetTable == "" {
			resp.Success = false
			resp.Error = "Could not identify target table name from DELETE query."
			json.NewEncoder(w).Encode(resp)
			return
		}

		var selectQuery string
		if whereClause != "" {
			selectQuery = fmt.Sprintf("SELECT * FROM `%s` WHERE %s LIMIT 100", targetTable, whereClause)
		} else {
			selectQuery = fmt.Sprintf("SELECT * FROM `%s` LIMIT 100", targetTable)
		}

		rows, err := db.Query(selectQuery)
		resp.TimeMs = time.Since(start).Milliseconds()
		if err != nil {
			resp.Success = false
			resp.Error = "Read-Only SELECT failed: " + err.Error()
			json.NewEncoder(w).Encode(resp)
			return
		}
		defer rows.Close()

		cols, beforeRows, err := queryRowsToMap(rows)
		if err != nil {
			resp.Success = false
			resp.Error = "Error reading rows: " + err.Error()
			json.NewEncoder(w).Encode(resp)
			return
		}

		resp.Success = true
		resp.Columns = cols
		resp.BeforeRows = beforeRows
		resp.RowsAffected = int64(len(beforeRows))
		json.NewEncoder(w).Encode(resp)
		return
	}

	if op == "INSERT" || op == "REPLACE" {
		simulatedRow := parseInsertValues(sqlQuery, resp.Schema)
		var cols []string
		if len(resp.Schema) > 0 {
			for _, c := range resp.Schema {
				cols = append(cols, c.Field)
			}
		} else {
			for k := range simulatedRow {
				cols = append(cols, k)
			}
		}

		resp.TimeMs = time.Since(start).Milliseconds()
		resp.Success = true
		resp.Columns = cols
		resp.AfterRows = []map[string]interface{}{simulatedRow}
		resp.RowsAffected = 1
		json.NewEncoder(w).Encode(resp)
		return
	}

	resp.TimeMs = time.Since(start).Milliseconds()
	resp.Success = false
	resp.Error = "Unsupported SQL operation. Supported: SELECT, UPDATE, INSERT, DELETE, REPLACE."
	json.NewEncoder(w).Encode(resp)
}
