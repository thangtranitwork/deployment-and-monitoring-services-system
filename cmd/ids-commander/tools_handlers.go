package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
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
