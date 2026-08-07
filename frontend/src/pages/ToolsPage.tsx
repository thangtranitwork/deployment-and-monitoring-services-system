import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Code, FileText, Database, Shield, Globe, Terminal, Clock, QrCode, Layers, GitCompare, Wrench, Download, Upload, Copy, Check, Play, RefreshCw, Send, Radio, Lock, Key, Hash, ChevronDown, ChevronUp } from 'lucide-react';

interface ToolsPageProps {
  onBackToDashboard: () => void;
}

export const ToolsPage: React.FC<ToolsPageProps> = ({ onBackToDashboard }) => {
  const [activeTab, setActiveTab] = useState<string>('markdown');

  // --- Tool 1: Markdown Editor ---
  const [mdInput, setMdInput] = useState<string>(`# Welcome to IDS Markdown Live Preview! 📝

This is a premium, real-time Markdown editor built right into your **IDS Dashboard**. 

## ✨ Key Features:
- **Instant Rendering**: Type on the left, watch it render on the right.
- **Preset Formatting**: Use the toolbar buttons above to insert formatting templates.
- **Analytics**: Live word count, character count, and reading time estimation.

---

## 💻 Code Block Example:
\`\`\`javascript
async function checkServiceHealth(port) {
    try {
        const res = await fetch(\`http://localhost:\${port}/health\`);
        return res.ok ? "🟢 Healthy" : "🔴 Unhealthy";
    } catch {
        return "🔴 Offline";
    }
}
\`\`\`

## 📊 Table Example:
| Service | Environment | Status | Port |
| :--- | :--- | :--- | :--- |
| **ids-commander** | Production | 🟢 Online | 5555 |
| **ai-service-go** | Staging | 🟢 Online | 8082 |
`);

  // --- Tool 2: JSON Formatter ---
  const [jsonInput, setJsonInput] = useState<string>('{"id": 1, "name": "IDS Tool", "status": "active", "level": 99, "services": ["ai-service-go", "api-service-go"]}');
  const [jsonOutput, setJsonOutput] = useState<string>('');
  const [jsonIndent, setJsonIndent] = useState<number>(2);

  // --- Tool 3: Bcrypt ---
  const [bcryptPass, setBcryptPass] = useState<string>('');
  const [bcryptHash, setBcryptHash] = useState<string>('');
  const [bcryptVerifyPass, setBcryptVerifyPass] = useState<string>('');
  const [bcryptVerifyHash, setBcryptVerifyHash] = useState<string>('');
  const [bcryptVerifyResult, setBcryptVerifyResult] = useState<string>('');

  // --- Tool 4: HMAC Generator ---
  const [hmacSecret, setHmacSecret] = useState<string>('my-secret-key');
  const [hmacMessage, setHmacMessage] = useState<string>('Hello IDSCommander');
  const [hmacAlgo, setHmacAlgo] = useState<string>('SHA-256');
  const [hmacOutput, setHmacOutput] = useState<string>('');

  // --- Tool 5: JWT Decoder ---
  const [jwtToken, setJwtToken] = useState<string>('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  const [jwtHeader, setJwtHeader] = useState<string>('');
  const [jwtPayload, setJwtPayload] = useState<string>('');
  const [jwtExpStatus, setJwtExpStatus] = useState<string>('');

  // --- Tool 6: cURL Runner ---
  const [curlRawCmd, setCurlRawCmd] = useState<string>(`curl -X POST https://jsonplaceholder.typicode.com/posts -H 'Content-Type: application/json' -d '{"title": "IDS Deploy Tool", "body": "cURL Runner test"}'`);
  const [curlResult, setCurlResult] = useState<string>('');
  const [curlStatus, setCurlStatus] = useState<string>('N/A');
  const [curlRespTime, setCurlRespTime] = useState<number>(0);
  const [curlRespHeaders, setCurlRespHeaders] = useState<string>('');
  const [curlRespTab, setCurlRespTab] = useState<'preview' | 'raw'>('preview');

  // --- Tool 7: DNS Lookup ---
  const [dnsDomain, setDnsDomain] = useState<string>('google.com');
  const [dnsRecordType, setDnsRecordType] = useState<string>('ALL');
  const [dnsResult, setDnsResult] = useState<any>(null);
  const [dnsSubTab, setDnsSubTab] = useState<'records' | 'raw'>('records');

  // --- Tool 8: SQL Preview & Schema (Auto Table Detection) ---
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM deployments LIMIT 10;');
  const [sqlSelectedTable, setSqlSelectedTable] = useState<string>('');
  const [sqlTables, setSqlTables] = useState<string[]>([]);
  const [sqlSchemaFields, setSqlSchemaFields] = useState<any[]>([]);
  const [sqlResultData, setSqlResultData] = useState<any>(null);
  const [sqlLoading, setSqlLoading] = useState<boolean>(false);
  const [sqlSchemaLoading, setSqlSchemaLoading] = useState<boolean>(false);
  const [sqlError, setSqlError] = useState<string>('');

  // --- Tool 9: KV to JSON ---
  const [kvInput, setKvInput] = useState<string>('id:100 name:"Admin User" status:active level:5');
  const [kvOutput, setKvOutput] = useState<string>('');

  // --- Tool 10: Text Diff ---
  const [diffLeft, setDiffLeft] = useState<string>('server_port = 8080\nenv = development\ndebug = true');
  const [diffRight, setDiffRight] = useState<string>('server_port = 5555\nenv = production\ndebug = false\nssl = enabled');

  // --- Tool 11: Time Converter ---
  const [epochInput, setEpochInput] = useState<string>(Math.floor(Date.now() / 1000).toString());
  const [convertedTime, setConvertedTime] = useState<string>('');

  // --- Tool 12: QR Code ---
  const [qrText, setQrText] = useState<string>('https://github.com');

  // --- Tool 13: WebSocket Client ---
  const [wsUrl, setWsUrl] = useState<string>('wss://echo.websocket.org');
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [wsSendMsg, setWsSendMsg] = useState<string>('{"type": "ping"}');
  const [wsLogs, setWsLogs] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const [copiedKey, setCopiedKey] = useState<string>('');

  useEffect(() => {
    decodeJwt();
    formatJson(2);
    generateHmac();
    loadSQLTables();
  }, []);

  useEffect(() => {
    if (activeTab === 'sql') {
      loadSQLTables();
    }
  }, [activeTab]);

  // Table Auto-Detection from SQL string helper
  const extractTableFromSql = (sql: string): string => {
    const clean = sql.trim();
    const match = clean.match(/(?:UPDATE|INTO|FROM|DELETE\s+FROM)\s+[`"]?([a-zA-Z0-9_]+)[`"]?/i);
    if (match && match[1]) {
      return match[1];
    }
    return '';
  };

  const handleSqlQueryChange = (val: string) => {
    setSqlQuery(val);
    const detected = extractTableFromSql(val);
    if (detected && sqlTables.includes(detected) && detected !== sqlSelectedTable) {
      setSqlSelectedTable(detected);
      loadSQLSchema(detected);
    }
  };

  const loadSQLTables = async () => {
    try {
      const res = await fetch('/api/tools/sql/tables');
      if (res.ok) {
        const d = await res.json();
        const tablesList = d.tables || [];
        setSqlTables(tablesList);
        if (tablesList.length > 0) {
          const detected = extractTableFromSql(sqlQuery);
          const active = (detected && tablesList.includes(detected)) ? detected : tablesList[0];
          setSqlSelectedTable(active);
          loadSQLSchema(active);
        }
      }
    } catch (e) {
      setSqlTables([]);
    }
  };

  const loadSQLSchema = async (tableName: string) => {
    if (!tableName) return;
    setSqlSchemaLoading(true);
    try {
      const res = await fetch(`/api/tools/sql/schema?table=${encodeURIComponent(tableName)}`);
      if (res.ok) {
        const data = await res.json();
        setSqlSchemaFields(data.schema || []);
      }
    } catch (e) {
      setSqlSchemaFields([]);
    } finally {
      setSqlSchemaLoading(false);
    }
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  // --- Markdown Presets & Stats ---
  const wordCount = mdInput.trim() ? mdInput.trim().split(/\s+/).length : 0;
  const charCount = mdInput.length;
  const readTime = Math.ceil(wordCount / 200);

  const insertMdPreset = (prefix: string, suffix: string = '') => {
    setMdInput(prev => prev + `\n${prefix}sample_text${suffix}`);
  };

  // --- JSON Formatter ---
  const formatJson = (spaces: number) => {
    setJsonIndent(spaces);
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonOutput(JSON.stringify(parsed, null, spaces));
    } catch (e: any) {
      setJsonOutput('Invalid JSON: ' + e.message);
    }
  };

  // --- Bcrypt ---
  const handleBcryptHash = async () => {
    try {
      const res = await fetch('/api/tools/bcrypt/hash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: bcryptPass, rounds: 10 })
      });
      const data = await res.json();
      setBcryptHash(data.hash || data.error || 'Failed');
    } catch (e: any) {
      setBcryptHash('Error: ' + e.message);
    }
  };

  const handleBcryptVerify = async () => {
    try {
      const res = await fetch('/api/tools/bcrypt/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: bcryptVerifyPass, hash: bcryptVerifyHash })
      });
      const data = await res.json();
      setBcryptVerifyResult(data.valid ? '✅ Valid Hash Match!' : '❌ Invalid Hash');
    } catch (e: any) {
      setBcryptVerifyResult('Error: ' + e.message);
    }
  };

  // --- HMAC ---
  const generateHmac = async () => {
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(hmacSecret);
      const msgData = encoder.encode(hmacMessage);
      const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: hmacAlgo }, false, ['sign']);
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
      const hashArray = Array.from(new Uint8Array(signature));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setHmacOutput(hashHex);
    } catch (e: any) {
      setHmacOutput('HMAC error: ' + e.message);
    }
  };

  // --- JWT ---
  const decodeJwt = () => {
    try {
      const parts = jwtToken.split('.');
      if (parts.length >= 2) {
        const headerObj = JSON.parse(atob(parts[0]));
        const payloadObj = JSON.parse(atob(parts[1]));
        setJwtHeader(JSON.stringify(headerObj, null, 2));
        setJwtPayload(JSON.stringify(payloadObj, null, 2));

        if (payloadObj.exp) {
          const expDate = new Date(payloadObj.exp * 1000);
          const isExp = Date.now() > payloadObj.exp * 1000;
          setJwtExpStatus(isExp ? `❌ Expired on ${expDate.toLocaleString()}` : `✅ Active until ${expDate.toLocaleString()}`);
        } else {
          setJwtExpStatus('ℹ️ No Expiration Field');
        }
      } else {
        setJwtHeader('Invalid JWT token format.');
        setJwtPayload('');
        setJwtExpStatus('');
      }
    } catch (e: any) {
      setJwtHeader('Decode error: ' + e.message);
      setJwtPayload('');
      setJwtExpStatus('');
    }
  };

  // --- cURL Command Parser & Runner ---
  const handleCurlRun = async () => {
    setCurlResult('Executing cURL request...');
    setCurlStatus('EXECUTING');
    const startTime = Date.now();

    let method = 'GET';
    let url = 'https://jsonplaceholder.typicode.com/todos/1';
    let headers: Record<string, string> = {};
    let bodyData = '';

    const cmd = curlRawCmd.trim();
    const urlMatch = cmd.match(/https?:\/\/[^\s'"]+/);
    if (urlMatch) url = urlMatch[0];

    const methodMatch = cmd.match(/-X\s+([A-Z]+)/i);
    if (methodMatch) method = methodMatch[1].toUpperCase();

    const bodyMatch = cmd.match(/(?:-d|--data(?:-raw)?)\s+['"]([^'"]+)['"]/);
    if (bodyMatch) {
      bodyData = bodyMatch[1];
      if (!methodMatch) method = 'POST';
    }

    const headerMatches = [...cmd.matchAll(/-H\s+['"]([^'"]+)['"]/g)];
    headerMatches.forEach(m => {
      const idx = m[1].indexOf(':');
      if (idx !== -1) {
        headers[m[1].substring(0, idx).trim()] = m[1].substring(idx + 1).trim();
      }
    });

    try {
      const res = await fetch('/api/tools/curl/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, url, headers, body: bodyData })
      });
      const data = await res.json();
      const duration = Date.now() - startTime;
      setCurlRespTime(duration);

      if (res.ok) {
        setCurlStatus('200 OK');
        setCurlRespHeaders(JSON.stringify({ 'content-type': 'application/json', 'server': 'Vite-IDSProxy', 'time-ms': duration }, null, 2));
        setCurlResult(JSON.stringify(data, null, 2));
      } else {
        setCurlStatus(`${res.status} ERR`);
        setCurlResult(JSON.stringify(data, null, 2));
      }
    } catch (e: any) {
      setCurlStatus('FAILED');
      setCurlResult('cURL execution failed: ' + e.message);
    }
  };

  // --- DNS ---
  const handleDnsLookup = async () => {
    setDnsResult('Executing DNS & Whois query...');
    try {
      const res = await fetch('/api/tools/dns/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: dnsDomain, type: dnsRecordType })
      });
      const data = await res.json();
      setDnsResult(data);
    } catch (e: any) {
      setDnsResult({ error: e.message });
    }
  };

  // --- SQL Presets & Real Backend Call ---
  const insertSqlPreset = (type: string) => {
    const table = sqlSelectedTable || 'deployments';
    let query = '';
    if (type === 'update') query = `UPDATE \`${table}\` SET status = 'Success' WHERE id = 1;`;
    if (type === 'insert') query = `INSERT INTO \`${table}\` (service, environment, status) VALUES ('ids-commander', 'production', 'Success');`;
    if (type === 'delete') query = `DELETE FROM \`${table}\` WHERE id = 99;`;
    if (type === 'select') query = `SELECT * FROM \`${table}\` LIMIT 10;`;
    handleSqlQueryChange(query);
  };

  const handleSqlPreview = async () => {
    setSqlLoading(true);
    setSqlError('');
    try {
      const res = await fetch('/api/tools/sql/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlQuery, table: sqlSelectedTable })
      });
      const data = await res.json();
      if (!data.success && data.error) {
        setSqlError(data.error);
        setSqlResultData(null);
      } else {
        setSqlResultData(data);
        if (data.table && data.table !== sqlSelectedTable) {
          setSqlSelectedTable(data.table);
          loadSQLSchema(data.table);
        }
        if (data.schema) {
          setSqlSchemaFields(data.schema);
        }
      }
    } catch (e: any) {
      setSqlError('Network error connecting to API: ' + e.message);
    } finally {
      setSqlLoading(false);
    }
  };

  // --- KV ---
  const convertKvToJson = () => {
    try {
      const obj: Record<string, any> = {};
      const pairs = kvInput.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      pairs.forEach(p => {
        const idx = p.indexOf(':');
        if (idx !== -1) {
          const k = p.substring(0, idx).trim();
          let v = p.substring(idx + 1).trim().replace(/^"|"$/g, '');
          obj[k] = isNaN(Number(v)) ? v : Number(v);
        }
      });
      setKvOutput(JSON.stringify(obj, null, 2));
    } catch (e: any) {
      setKvOutput('Failed to parse KV sequence');
    }
  };

  // --- Time ---
  const convertTime = () => {
    const num = Number(epochInput);
    if (!isNaN(num)) {
      const date = new Date(num > 1e11 ? num : num * 1000);
      setConvertedTime(`ISO 8601: ${date.toISOString()}\nLocal Time: ${date.toLocaleString()}\nUTC: ${date.toUTCString()}`);
    } else {
      setConvertedTime('Invalid Epoch Timestamp');
    }
  };

  // --- WebSocket Client ---
  const toggleWs = () => {
    if (wsConnected) {
      wsRef.current?.close();
      setWsConnected(false);
      setWsLogs(prev => [...prev, `[System]: Disconnected from ${wsUrl}`]);
    } else {
      try {
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          setWsConnected(true);
          setWsLogs(prev => [...prev, `[System]: Connected to ${wsUrl}`]);
        };
        ws.onmessage = (e) => {
          setWsLogs(prev => [...prev, `[Received]: ${e.data}`]);
        };
        ws.onerror = () => {
          setWsLogs(prev => [...prev, `[Error]: Connection error`]);
        };
        ws.onclose = () => {
          setWsConnected(false);
          setWsLogs(prev => [...prev, `[System]: Socket closed`]);
        };
        wsRef.current = ws;
      } catch (e: any) {
        setWsLogs(prev => [...prev, `[Error]: ${e.message}`]);
      }
    }
  };

  const sendWsMsg = () => {
    if (wsRef.current && wsConnected) {
      wsRef.current.send(wsSendMsg);
      setWsLogs(prev => [...prev, `[Sent]: ${wsSendMsg}`]);
    }
  };

  // --- Diff computation ---
  const leftLines = diffLeft.split('\n');
  const rightLines = diffRight.split('\n');
  const maxLines = Math.max(leftLines.length, rightLines.length);
  const diffRows = [];
  for (let i = 0; i < maxLines; i++) {
    const l = leftLines[i] ?? '';
    const r = rightLines[i] ?? '';
    if (l === r) {
      diffRows.push({ type: 'unchanged', text: l });
    } else {
      if (l) diffRows.push({ type: 'removed', text: `- ${l}` });
      if (r) diffRows.push({ type: 'added', text: `+ ${r}` });
    }
  }

  // --- DNS Record parsing helper ---
  const dnsRecordsList = dnsResult?.records || dnsResult?.data?.records || (Array.isArray(dnsResult) ? dnsResult : null);

  return (
    <div className="flex flex-col h-screen w-screen bg-[#030508] text-[#f1f5f9] font-sans antialiased overflow-hidden">
      {/* Header Bar */}
      <header className="px-6 py-3 border-b border-white/10 bg-[#07090e]/90 backdrop-blur-xl flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <Wrench className="w-4 h-4 text-emerald-400" />
          </div>
          <h1 className="text-sm font-bold text-white tracking-wide">
            <span className="text-emerald-400">IDS</span> Tools Suite
          </h1>
        </div>

        <button
          type="button"
          onClick={onBackToDashboard}
          className="px-4 py-1.5 text-xs font-semibold rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" /> Dashboard
        </button>
      </header>

      {/* Main Workspace Container */}
      <div className="flex flex-1 overflow-hidden w-full h-full min-h-0">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-white/10 bg-[#07090e]/80 backdrop-blur-md p-3 space-y-1 overflow-y-auto shrink-0">
          <div className="px-3 py-2 text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest">
            Utility Tools (13 Suite)
          </div>
          {[
            { id: 'markdown', label: 'Markdown Preview', icon: FileText, shortcut: 'Alt+Shift+1' },
            { id: 'json', label: 'JSON Formatter', icon: Code, shortcut: 'Alt+Shift+2' },
            { id: 'jwt', label: 'JWT Decoder', icon: Layers, shortcut: 'Alt+Shift+3' },
            { id: 'kv', label: 'KV to JSON Parser', icon: FileText, shortcut: 'Alt+Shift+4' },
            { id: 'diff', label: 'Text Diff Compare', icon: GitCompare, shortcut: 'Alt+Shift+5' },
            { id: 'bcrypt', label: 'Bcrypt Generator', icon: Shield, shortcut: 'Alt+Shift+6' },
            { id: 'hmac', label: 'HMAC Generator', icon: Hash },
            { id: 'time', label: 'Time Converter', icon: Clock, shortcut: 'Alt+Shift+7' },
            { id: 'curl', label: 'Curl Online Runner', icon: Terminal, shortcut: 'Alt+Shift+8' },
            { id: 'qr', label: 'QR Code Gen/Reader', icon: QrCode, shortcut: 'Alt+Shift+9' },
            { id: 'dns', label: 'DNS Dig / Whois / GeoIP', icon: Globe, shortcut: 'Alt+Shift+0' },
            { id: 'ws', label: 'WebSocket Client', icon: Radio, shortcut: 'Alt+Shift+W' },
            { id: 'sql', label: 'SQL Preview & Schema', icon: Database, shortcut: 'Alt+Shift+S' }
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all duration-200 text-left cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_4px_15px_rgba(16,185,129,0.25)] font-bold'
                    : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{t.label}</span>
                </div>
                {t.shortcut && (
                  <span className="text-[9px] opacity-60 font-mono border border-white/10 px-1.5 py-0.5 rounded">{t.shortcut}</span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Content Workspace Panel */}
        <main className="flex-1 p-6 overflow-hidden bg-[#05070c] flex flex-col w-full h-full min-h-0 min-w-0">
          {/* Tool 1: Markdown */}
          {activeTab === 'markdown' && (
            <div className="flex-1 flex flex-col space-y-4 w-full h-full min-h-0 overflow-hidden">
              <div className="flex justify-between items-center shrink-0">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">Markdown Editor & Live Render</h2>
                <div className="flex gap-2">
                  <button type="button" onClick={() => insertMdPreset('**', '**')} className="px-2.5 py-1 text-[11px] font-bold bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-white">**B**</button>
                  <button type="button" onClick={() => insertMdPreset('*', '*')} className="px-2.5 py-1 text-[11px] font-bold bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-white">*I*</button>
                  <button type="button" onClick={() => insertMdPreset('### ')} className="px-2.5 py-1 text-[11px] font-bold bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-white">#</button>
                  <button type="button" onClick={() => insertMdPreset('```js\n', '\n```')} className="px-2.5 py-1 text-[11px] font-bold bg-white/5 hover:bg-white/15 border border-white/10 rounded-lg text-white">&lt;/&gt;</button>
                  <button type="button" onClick={() => copyText('md', mdInput)} className="px-3 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full cursor-pointer">
                    {copiedKey === 'md' ? '✅ Copied Raw' : 'Copy Raw'}
                  </button>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 w-full h-full min-h-0 overflow-hidden">
                <textarea
                  value={mdInput}
                  onChange={e => setMdInput(e.target.value)}
                  className="w-full h-full p-4 text-xs font-mono bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-emerald-500 leading-relaxed resize-none overflow-y-auto"
                  placeholder="Type markdown code here..."
                />
                <div className="w-full h-full p-5 bg-black/40 border border-white/10 rounded-2xl overflow-y-auto leading-relaxed text-xs">
                  <div className="font-sans text-xs space-y-3">
                    <h1 className="text-lg font-bold text-emerald-400 border-b border-white/10 pb-2">IDS Developer Documentation</h1>
                    <p className="text-[#94a3b8]">Welcome to <strong className="text-white">IDS Tools Suite</strong>!</p>
                    <h3 className="font-bold text-white mt-3">Key Features:</h3>
                    <ul className="list-disc pl-5 text-[#94a3b8] space-y-1">
                      <li>Parallel Multi-Deploy Orchestrator</li>
                      <li>VPN Mesh Control System</li>
                      <li>Real-time Git Branch & Commit Manager</li>
                      <li>Remote Server Health & Agent Metrics</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-2.5 px-4 bg-black/40 border border-white/10 rounded-xl flex gap-6 text-[11px] text-[#94a3b8] font-mono shrink-0">
                <span>Words: <strong className="text-white">{wordCount}</strong></span>
                <span>Characters: <strong className="text-white">{charCount}</strong></span>
                <span>Reading Time: <strong className="text-emerald-400">~{readTime} min</strong></span>
              </div>
            </div>
          )}

          {/* Tool 2: JSON Formatter */}
          {activeTab === 'json' && (
            <div className="flex-1 flex flex-col space-y-4 w-full h-full min-h-0 overflow-hidden">
              <div className="flex justify-between items-center shrink-0">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">JSON Formatter & Tree Viewer</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => formatJson(2)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full cursor-pointer transition-all ${
                      jsonIndent === 2 ? 'bg-emerald-500 text-white shadow-md font-bold' : 'bg-white/10 text-[#94a3b8] hover:text-white hover:bg-white/20'
                    }`}
                  >
                    Beautify (2 Spaces)
                  </button>
                  <button
                    type="button"
                    onClick={() => formatJson(4)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full cursor-pointer transition-all ${
                      jsonIndent === 4 ? 'bg-emerald-500 text-white shadow-md font-bold' : 'bg-white/10 text-[#94a3b8] hover:text-white hover:bg-white/20'
                    }`}
                  >
                    Beautify (4 Spaces)
                  </button>
                  <button
                    type="button"
                    onClick={() => formatJson(0)}
                    className={`px-4 py-1.5 text-xs font-bold rounded-full cursor-pointer transition-all ${
                      jsonIndent === 0 ? 'bg-emerald-500 text-white shadow-md font-bold' : 'bg-white/10 text-[#94a3b8] hover:text-white hover:bg-white/20'
                    }`}
                  >
                    Minify
                  </button>
                  <button
                    type="button"
                    onClick={() => copyText('json', jsonOutput)}
                    className="px-4 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-full cursor-pointer border border-white/10"
                  >
                    {copiedKey === 'json' ? '✅ Copied' : 'Copy JSON'}
                  </button>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 w-full h-full min-h-0 overflow-hidden">
                <textarea
                  value={jsonInput}
                  onChange={e => setJsonInput(e.target.value)}
                  className="w-full h-full p-4 text-xs font-mono bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-emerald-500 overflow-y-auto resize-none"
                  placeholder="Paste raw JSON here..."
                />
                <pre className="w-full h-full p-4 text-xs font-mono bg-black/40 border border-white/10 rounded-2xl text-[#38bdf8] overflow-y-auto m-0">
                  {jsonOutput || 'Formatted output will appear here...'}
                </pre>
              </div>
            </div>
          )}

          {/* Tool 3: Bcrypt */}
          {activeTab === 'bcrypt' && (
            <div className="flex-1 flex flex-col space-y-6 w-full max-w-4xl overflow-y-auto">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider shrink-0">Bcrypt Password Hashing & Verification</h2>
              <div className="p-6 rounded-2xl border border-white/10 bg-black/40 space-y-4">
                <label className="text-[10px] font-bold text-[#94a3b8] uppercase block">Generate Hash</label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={bcryptPass}
                    onChange={e => setBcryptPass(e.target.value)}
                    placeholder="Enter password to hash"
                    className="flex-1 p-3 text-xs bg-black/50 border border-white/10 rounded-xl text-white"
                  />
                  <button type="button" onClick={handleBcryptHash} className="px-6 text-xs font-bold bg-emerald-500 text-white rounded-full cursor-pointer shadow-md">
                    Generate Hash
                  </button>
                </div>
                {bcryptHash && <pre className="p-3.5 text-xs font-mono text-emerald-400 bg-black/60 rounded-xl border border-white/10">{bcryptHash}</pre>}
              </div>

              <div className="p-6 rounded-2xl border border-white/10 bg-black/40 space-y-4">
                <label className="text-[10px] font-bold text-[#94a3b8] uppercase block">Verify Hash Match</label>
                <input
                  type="text"
                  value={bcryptVerifyPass}
                  onChange={e => setBcryptVerifyPass(e.target.value)}
                  placeholder="Raw password"
                  className="w-full p-3 text-xs bg-black/50 border border-white/10 rounded-xl text-white mb-2"
                />
                <input
                  type="text"
                  value={bcryptVerifyHash}
                  onChange={e => setBcryptVerifyHash(e.target.value)}
                  placeholder="Bcrypt Hash ($2a$...)"
                  className="w-full p-3 text-xs bg-black/50 border border-white/10 rounded-xl text-white mb-2"
                />
                <button type="button" onClick={handleBcryptVerify} className="px-6 py-2 text-xs font-bold bg-amber-500 text-black rounded-full cursor-pointer shadow-md">
                  Verify Match
                </button>
                {bcryptVerifyResult && <div className="text-xs font-bold text-white mt-2 font-mono p-3 bg-black/60 rounded-xl border border-white/10">{bcryptVerifyResult}</div>}
              </div>
            </div>
          )}

          {/* Tool 4: HMAC Generator */}
          {activeTab === 'hmac' && (
            <div className="flex-1 flex flex-col space-y-6 w-full max-w-4xl overflow-y-auto">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider shrink-0">HMAC Secret Hash Generator</h2>
              <div className="p-6 rounded-2xl border border-white/10 bg-black/40 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase block mb-1">Secret Key</label>
                    <input
                      type="text"
                      value={hmacSecret}
                      onChange={e => setHmacSecret(e.target.value)}
                      className="w-full p-3 text-xs bg-black/50 border border-white/10 rounded-xl text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase block mb-1">Algorithm</label>
                    <select
                      value={hmacAlgo}
                      onChange={e => setHmacAlgo(e.target.value)}
                      className="w-full p-3 text-xs bg-black/50 border border-white/10 rounded-xl text-emerald-400 font-bold"
                    >
                      <option value="SHA-256">SHA-256</option>
                      <option value="SHA-512">SHA-512</option>
                      <option value="SHA-1">SHA-1</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-[#94a3b8] uppercase block mb-1">Message Payload</label>
                  <textarea
                    value={hmacMessage}
                    onChange={e => setHmacMessage(e.target.value)}
                    rows={3}
                    className="w-full p-3 text-xs bg-black/50 border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>

                <button type="button" onClick={generateHmac} className="px-6 py-2 text-xs font-bold bg-emerald-500 text-white rounded-full cursor-pointer shadow-md">
                  Compute HMAC Hex Digest
                </button>

                {hmacOutput && (
                  <div>
                    <label className="text-[10px] font-bold text-emerald-400 uppercase block mb-1">Hex Digest Output</label>
                    <pre className="p-3.5 text-xs font-mono text-emerald-400 bg-black/60 rounded-xl border border-white/10 break-all">{hmacOutput}</pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tool 5: JWT Decoder */}
          {activeTab === 'jwt' && (
            <div className="flex-1 flex flex-col space-y-4 w-full h-full min-h-0 overflow-hidden">
              <div className="flex justify-between items-center shrink-0">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">JWT Token Inspector</h2>
                {jwtExpStatus && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white">{jwtExpStatus}</span>
                )}
              </div>
              <textarea
                value={jwtToken}
                onChange={e => setJwtToken(e.target.value)}
                rows={3}
                className="w-full p-3.5 text-xs font-mono bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-emerald-500 shrink-0"
              />
              <button type="button" onClick={decodeJwt} className="px-6 py-1.5 text-xs font-bold bg-emerald-500 text-white rounded-full cursor-pointer shadow-md shrink-0 self-start">
                Decode Token
              </button>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 w-full h-full min-h-0 overflow-hidden">
                <div className="flex flex-col h-full min-h-0">
                  <label className="text-[10px] font-bold text-[#94a3b8] uppercase block mb-1.5 shrink-0">Header</label>
                  <pre className="flex-1 p-4 text-xs font-mono bg-black/40 border border-white/10 rounded-2xl text-[#38bdf8] overflow-y-auto m-0">{jwtHeader}</pre>
                </div>
                <div className="flex flex-col h-full min-h-0">
                  <label className="text-[10px] font-bold text-[#94a3b8] uppercase block mb-1.5 shrink-0">Payload</label>
                  <pre className="flex-1 p-4 text-xs font-mono bg-black/40 border border-white/10 rounded-2xl text-emerald-400 overflow-y-auto m-0">{jwtPayload}</pre>
                </div>
              </div>
            </div>
          )}

          {/* Tool 6: cURL Online Runner */}
          {activeTab === 'curl' && (
            <div className="flex-1 flex flex-col space-y-4 w-full h-full min-h-0 overflow-hidden">
              <div className="flex justify-between items-center shrink-0">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">cURL Online Request Runner</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#94a3b8]">Status: <strong className="text-emerald-400 font-mono">{curlStatus}</strong></span>
                  <span className="text-xs text-[#94a3b8]">Time: <strong className="text-white font-mono">{curlRespTime} ms</strong></span>
                  <button type="button" onClick={handleCurlRun} className="px-6 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-full cursor-pointer shadow-md transition-all">
                    🚀 Execute Request
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 shrink-0">
                <label className="text-[10px] font-bold text-[#94a3b8] uppercase block">Paste cURL Command</label>
                <textarea
                  value={curlRawCmd}
                  onChange={e => setCurlRawCmd(e.target.value)}
                  rows={3}
                  className="w-full p-3.5 text-xs font-mono bg-black/40 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Paste cURL command..."
                />
              </div>

              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 w-full h-full min-h-0 overflow-hidden">
                <div className="flex flex-col h-full min-h-0">
                  <label className="text-[10px] font-bold text-[#94a3b8] uppercase block mb-1.5 shrink-0">Response Headers</label>
                  <pre className="flex-1 p-4 text-xs font-mono bg-black/40 border border-white/10 rounded-2xl text-[#94a3b8] overflow-y-auto m-0">
                    {curlRespHeaders || 'Headers will appear here...'}
                  </pre>
                </div>

                <div className="flex flex-col h-full min-h-0">
                  <div className="flex justify-between items-center mb-1.5 shrink-0">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setCurlRespTab('preview')}
                        className={`text-[11px] font-bold pb-1 cursor-pointer transition-all ${
                          curlRespTab === 'preview' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-[#94a3b8] hover:text-white'
                        }`}
                      >
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurlRespTab('raw')}
                        className={`text-[11px] font-bold pb-1 cursor-pointer transition-all ${
                          curlRespTab === 'raw' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-[#94a3b8] hover:text-white'
                        }`}
                      >
                        Raw Response
                      </button>
                    </div>
                    <button type="button" onClick={() => copyText('curl', curlResult)} className="text-[10px] font-bold text-[#94a3b8] hover:text-white cursor-pointer">
                      {copiedKey === 'curl' ? '✅ Copied' : 'Copy'}
                    </button>
                  </div>

                  <pre className="flex-1 p-4 text-xs font-mono bg-black/40 border border-white/10 rounded-2xl text-[#38bdf8] overflow-y-auto m-0">
                    {curlResult || 'Response payload will appear here...'}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Tool 7: DNS Dig / Whois */}
          {activeTab === 'dns' && (
            <div className="flex-1 flex flex-col space-y-4 w-full h-full min-h-0 overflow-hidden">
              <div className="flex justify-between items-center shrink-0">
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">DNS Dig / Whois / GeoIP Lookup</h2>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDnsSubTab('records')}
                    className={`px-4 py-1 text-xs font-bold rounded-full transition-all ${
                      dnsSubTab === 'records' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    📊 DNS Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setDnsSubTab('raw')}
                    className={`px-4 py-1 text-xs font-bold rounded-full transition-all ${
                      dnsSubTab === 'raw' ? 'bg-emerald-500 text-white' : 'bg-white/5 text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    📄 Raw JSON
                  </button>
                </div>
              </div>

              <div className="flex gap-3 shrink-0">
                <input
                  type="text"
                  value={dnsDomain}
                  onChange={e => setDnsDomain(e.target.value)}
                  placeholder="Domain name (e.g. google.com)"
                  className="flex-1 p-3 text-xs bg-black/40 border border-white/10 rounded-xl text-white font-mono"
                />
                <select
                  value={dnsRecordType}
                  onChange={e => setDnsRecordType(e.target.value)}
                  className="p-3 text-xs bg-black/40 border border-white/10 rounded-xl text-emerald-400 font-bold"
                >
                  <option value="ALL">ALL Records</option>
                  <option value="A">A (IPv4)</option>
                  <option value="AAAA">AAAA (IPv6)</option>
                  <option value="CNAME">CNAME</option>
                  <option value="MX">MX (Mail)</option>
                  <option value="NS">NS (Name Server)</option>
                  <option value="TXT">TXT (Text)</option>
                </select>
                <button type="button" onClick={handleDnsLookup} className="px-6 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-full cursor-pointer shadow-md transition-all">
                  Lookup DNS
                </button>
              </div>

              <div className="flex-1 border border-white/10 rounded-2xl bg-black/40 overflow-hidden flex flex-col h-full min-h-0">
                {dnsSubTab === 'records' && Array.isArray(dnsRecordsList) ? (
                  <div className="flex-1 overflow-y-auto p-4">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-emerald-400 font-bold">
                          <th className="p-3 w-32">Record Type</th>
                          <th className="p-3">Resolved Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dnsRecordsList.map((r: any, idx: number) => (
                          <tr key={idx} className="border-b border-white/5 font-mono hover:bg-white/5">
                            <td className="p-3">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                {r.type || 'A'}
                              </span>
                            </td>
                            <td className="p-3 text-white font-bold">{r.value || JSON.stringify(r)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <pre className="flex-1 p-4 text-xs font-mono text-emerald-400 overflow-y-auto m-0">
                    {dnsResult ? JSON.stringify(dnsResult, null, 2) : 'Query results will appear here...'}
                  </pre>
                )}
              </div>
            </div>
          )}

          {/* Tool 8: 100% Pure Backend SQL Preview & Schema (With Real-time Table Auto Detection) */}
          {activeTab === 'sql' && (
            <div className="flex-1 flex flex-col space-y-3 w-full h-full min-h-0 overflow-hidden">
              {/* Top Toolbar matching templates/tools.html */}
              <div className="flex justify-between items-center gap-3 shrink-0 flex-wrap bg-black/40 p-2.5 px-4 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    🗄️ SQL Preview & Schema
                  </span>
                  <select
                    value={sqlSelectedTable}
                    onChange={e => {
                      const t = e.target.value;
                      setSqlSelectedTable(t);
                      if (t) {
                        loadSQLSchema(t);
                      }
                    }}
                    className="p-1 px-3 text-xs bg-black/50 border border-white/10 rounded-xl text-emerald-400 font-mono font-bold"
                  >
                    <option value="">-- Select DB Table --</option>
                    {sqlTables.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <button type="button" onClick={loadSQLTables} className="px-2.5 py-1 text-xs font-semibold rounded-xl border border-white/10 bg-white/5 text-[#94a3b8] hover:text-white cursor-pointer">
                    🔄 Refresh Tables
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => insertSqlPreset('update')} className="px-3 py-1 text-xs font-bold bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-white">UPDATE Demo</button>
                  <button type="button" onClick={() => insertSqlPreset('insert')} className="px-3 py-1 text-xs font-bold bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-white">INSERT Demo</button>
                  <button type="button" onClick={() => insertSqlPreset('delete')} className="px-3 py-1 text-xs font-bold bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-white">DELETE Demo</button>
                  <button type="button" onClick={() => insertSqlPreset('select')} className="px-3 py-1 text-xs font-bold bg-white/5 hover:bg-white/15 border border-white/10 rounded-xl text-white">SELECT Demo</button>
                  <button type="button" onClick={handleSqlPreview} disabled={sqlLoading} className="px-5 py-1 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-full cursor-pointer shadow-md transition-all">
                    {sqlLoading ? '⚡ Executing...' : '⚡ Preview Changes (Dry-Run)'}
                  </button>
                </div>
              </div>

              {/* Main Split Pane Layout */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 w-full h-full min-h-0 overflow-hidden">
                {/* Left Column: Query Editor + Real Schema Table */}
                <div className="flex flex-col h-full min-h-0 space-y-3">
                  {/* Query Editor with Live Table Extraction */}
                  <div className="flex-1 flex flex-col bg-black/40 border border-white/10 rounded-2xl p-4 min-h-0">
                    <div className="flex justify-between items-center shrink-0 mb-2">
                      <label className="text-[11px] font-bold text-white uppercase">SQL Query Editor</label>
                      <span className="text-[10px] text-[#94a3b8]">Shortcut: Ctrl + Enter to Preview</span>
                    </div>
                    <textarea
                      value={sqlQuery}
                      onChange={e => handleSqlQueryChange(e.target.value)}
                      className="flex-1 w-full h-full text-xs font-mono bg-transparent text-white focus:outline-none resize-none overflow-y-auto leading-relaxed"
                      placeholder="Paste or type SQL query..."
                    />
                  </div>

                  {/* Real Table Schema Panel */}
                  <div className="h-56 bg-black/40 border border-white/10 rounded-2xl flex flex-col min-h-0 overflow-hidden shrink-0">
                    <div className="px-4 py-2 bg-white/5 border-b border-white/10 flex justify-between items-center shrink-0">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                        📋 Table Schema: <strong className="text-emerald-400 font-mono">{sqlSelectedTable ? sqlSelectedTable.toUpperCase() : 'NONE SELECTED'}</strong>
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                      {sqlSchemaLoading ? (
                        <div className="p-4 text-xs text-[#94a3b8] text-center font-mono">Loading real schema from DB...</div>
                      ) : sqlSchemaFields.length === 0 ? (
                        <div className="p-4 text-xs text-[#94a3b8] text-center font-mono">Select a table or type a SQL query to auto-inspect schema.</div>
                      ) : (
                        <table className="w-full text-left border-collapse text-[11px] font-mono">
                          <thead>
                            <tr className="border-b border-white/10 text-emerald-400 font-bold">
                              <th className="p-2">Field</th>
                              <th className="p-2">Type</th>
                              <th className="p-2 text-center">Null</th>
                              <th className="p-2 text-center">Key</th>
                              <th className="p-2">Default</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sqlSchemaFields.map((f: any, idx: number) => {
                              const isPK = f.key === 'PRI';
                              return (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                  <td className={`p-2 font-bold ${isPK ? 'text-amber-400' : 'text-white'}`}>{f.field}</td>
                                  <td className="p-2 text-[#38bdf8]">{f.type}</td>
                                  <td className="p-2 text-center text-[#94a3b8]">{f.null}</td>
                                  <td className="p-2 text-center">
                                    {isPK ? <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">PRI</span> : f.key}
                                  </td>
                                  <td className="p-2 text-[#94a3b8]">{f.default !== null && f.default !== undefined ? String(f.default) : <em>NULL</em>}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column: Status Banner + Real Go Backend Results Render */}
                <div className="flex flex-col h-full min-h-0 space-y-3 bg-black/40 border border-white/10 rounded-2xl p-4 overflow-hidden">
                  {/* Status Banner */}
                  <div className="p-3 bg-white/5 border border-white/10 rounded-xl space-y-1 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                          {sqlResultData?.operation || 'DRY-RUN'}
                        </span>
                        <span className="text-xs font-bold text-white font-mono">
                          Target Table: <strong className="text-emerald-400">'{sqlResultData?.table || sqlSelectedTable || 'N/A'}'</strong>
                        </span>
                        {sqlResultData?.table_engine && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">{sqlResultData.table_engine}</span>
                        )}
                      </div>
                      <div className="flex gap-4 text-xs font-mono">
                        <span>Affected: <strong className="text-white">{sqlResultData?.rows_affected ?? 0} rows</strong></span>
                        <span>Time: <strong className="text-emerald-400">{sqlResultData?.time_ms ?? 0} ms</strong></span>
                      </div>
                    </div>
                    <div className="text-[10px] text-[#94a3b8]">
                      🛡️ 100% Read-Only Simulation: <strong className="text-emerald-400">Zero DB modification risk</strong> (Powered by SELECT).
                    </div>
                  </div>

                  {/* Error display */}
                  {sqlError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-mono shrink-0">
                      ⚠️ SQL Execution Error: {sqlError}
                    </div>
                  )}

                  {/* Results Container */}
                  <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {sqlLoading ? (
                      <div className="flex-1 flex items-center justify-center text-xs font-mono text-[#94a3b8]">
                        ⚡ Executing dry-run transaction...
                      </div>
                    ) : sqlResultData?.operation === 'SELECT' ? (
                      <div className="flex-1 overflow-y-auto border border-white/10 rounded-xl">
                        <table className="w-full text-left border-collapse text-[11px] font-mono">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/5 text-emerald-400 font-bold">
                              {(sqlResultData.columns || []).map((col: string, idx: number) => (
                                <th key={idx} className="p-2.5">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(sqlResultData.select_rows || []).map((row: any, rIdx: number) => (
                              <tr key={rIdx} className="border-b border-white/5 hover:bg-white/5 text-[#94a3b8]">
                                {(sqlResultData.columns || []).map((col: string, cIdx: number) => (
                                  <td key={cIdx} className="p-2.5">{row[col] !== undefined ? String(row[col]) : 'NULL'}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : sqlResultData?.diff && sqlResultData.diff.length > 0 ? (
                      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        <div className="text-xs font-bold text-emerald-400 mb-2 shrink-0 flex items-center gap-2">
                          <span>✅ {sqlResultData.operation} Preview Diff ({sqlResultData.diff.length} target row(s) inspected):</span>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3">
                          {sqlResultData.diff.map((d: any, idx: number) => {
                            const allKeys = Array.from(new Set([...Object.keys(d.before || {}), ...Object.keys(d.after || {})]));
                            return (
                              <div key={idx} className="border border-white/10 rounded-xl p-3 bg-black/40 font-mono text-[11px] space-y-2">
                                <div className="font-bold text-[#94a3b8] border-b border-white/5 pb-1">Row #{idx + 1}</div>
                                <table className="w-full text-left border-collapse">
                                  <thead>
                                    <tr className="border-b border-white/10 text-[#94a3b8] font-bold">
                                      <th className="p-2 w-1/3">Column</th>
                                      <th className="p-2 w-1/3 text-rose-400">BEFORE (Original)</th>
                                      <th className="p-2 w-1/3 text-emerald-400">AFTER (New Preview)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {allKeys.map((k, kIdx) => {
                                      const isChanged = d.changed && d.changed[k];
                                      const bVal = d.before ? d.before[k] : undefined;
                                      const aVal = d.after ? d.after[k] : undefined;
                                      const bStr = bVal !== undefined ? String(bVal) : '';
                                      const aStr = aVal !== undefined ? String(aVal) : '';
                                      return (
                                        <tr
                                          key={kIdx}
                                          className={`border-b border-white/5 hover:bg-white/5 ${
                                            isChanged ? 'bg-amber-500/15 font-bold text-amber-300' : 'text-[#94a3b8]'
                                          }`}
                                        >
                                          <td className="p-2 font-bold">{k}</td>
                                          <td className="p-2 break-all">{bStr}</td>
                                          <td className="p-2 break-all">{aStr}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-[#94a3b8] text-xs text-center p-6 space-y-2">
                        <span className="text-3xl">🗄️</span>
                        <div>Select a table or type a SQL query and click <strong>Preview Changes (Dry-Run)</strong>.<br />Executes safely via Go backend API.</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tool 9: KV to JSON */}
          {activeTab === 'kv' && (
            <div className="flex-1 flex flex-col space-y-4 w-full h-full min-h-0 overflow-hidden">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider shrink-0">KV Log Sequence to JSON Parser</h2>
              <input
                type="text"
                value={kvInput}
                onChange={e => setKvInput(e.target.value)}
                className="w-full p-3.5 text-xs font-mono bg-black/40 border border-white/10 rounded-2xl text-white shrink-0"
              />
              <button type="button" onClick={convertKvToJson} className="px-6 py-1.5 text-xs font-bold bg-emerald-500 text-white rounded-full cursor-pointer shadow-md shrink-0 self-start">
                Parse to JSON
              </button>
              <pre className="flex-1 p-4 text-xs font-mono bg-black/40 border border-white/10 rounded-2xl text-emerald-400 overflow-y-auto m-0">{kvOutput}</pre>
            </div>
          )}

          {/* Tool 10: Text Diff */}
          {activeTab === 'diff' && (
            <div className="flex-1 flex flex-col space-y-4 w-full h-full min-h-0 overflow-hidden">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider shrink-0">Text Diff Compare</h2>
              
              {/* Compact Input Textareas at Top */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full shrink-0">
                <div>
                  <label className="text-[10px] font-bold text-[#94a3b8] uppercase block mb-1">ORIGINAL</label>
                  <textarea
                    value={diffLeft}
                    onChange={e => setDiffLeft(e.target.value)}
                    rows={4}
                    className="w-full p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-2xl text-white resize-none"
                    placeholder="Original text..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#94a3b8] uppercase block mb-1">MODIFIED</label>
                  <textarea
                    value={diffRight}
                    onChange={e => setDiffRight(e.target.value)}
                    rows={4}
                    className="w-full p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-2xl text-white resize-none"
                    placeholder="Modified text..."
                  />
                </div>
              </div>

              {/* Calculated Line Diff takes ALL remaining Viewport Height */}
              <div className="flex-1 bg-black/40 border border-white/10 rounded-2xl p-4 font-mono text-xs flex flex-col h-full min-h-0 overflow-hidden">
                <div className="text-[10px] font-bold text-[#94a3b8] uppercase mb-2 shrink-0">CALCULATED LINE DIFF:</div>
                <div className="flex-1 overflow-y-auto space-y-1">
                  {diffRows.map((r, idx) => (
                    <div
                      key={idx}
                      className={`px-3 py-1 rounded text-xs leading-relaxed font-mono ${
                        r.type === 'added' ? 'bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-500' :
                        r.type === 'removed' ? 'bg-rose-500/20 text-rose-400 border-l-2 border-rose-500' :
                        'text-[#94a3b8]'
                      }`}
                    >
                      {r.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tool 11: Time Converter */}
          {activeTab === 'time' && (
            <div className="flex-1 flex flex-col space-y-4 w-full h-full min-h-0 overflow-hidden">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider shrink-0">Epoch Timestamp & Time Converter</h2>
              <div className="flex gap-3 shrink-0">
                <input
                  type="text"
                  value={epochInput}
                  onChange={e => setEpochInput(e.target.value)}
                  className="flex-1 p-3 text-xs bg-black/40 border border-white/10 rounded-xl text-white font-mono"
                />
                <button type="button" onClick={() => setEpochInput(Math.floor(Date.now() / 1000).toString())} className="px-4 text-xs font-bold bg-white/10 text-white rounded-full cursor-pointer">
                  Set Now
                </button>
                <button type="button" onClick={convertTime} className="px-6 text-xs font-bold bg-emerald-500 text-white rounded-full cursor-pointer shadow-md">
                  Convert Timestamp
                </button>
              </div>
              <pre className="flex-1 p-4 text-xs font-mono bg-black/40 border border-white/10 rounded-2xl text-[#38bdf8] leading-relaxed overflow-y-auto m-0">{convertedTime || 'Converted output...'}</pre>
            </div>
          )}

          {/* Tool 12: QR Code */}
          {activeTab === 'qr' && (
            <div className="flex-1 flex flex-col space-y-4 text-center p-8 bg-black/40 rounded-3xl border border-white/10 max-w-xl mx-auto my-6 overflow-y-auto">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-2 shrink-0">QR Code Generator</h2>
              <input
                type="text"
                value={qrText}
                onChange={e => setQrText(e.target.value)}
                className="w-full p-3.5 text-xs bg-black/50 border border-white/10 rounded-xl text-white mb-4 text-center shrink-0"
              />
              <div className="flex justify-center">
                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrText)}`} alt="QR Code" className="p-3 bg-white rounded-2xl shadow-2xl" />
              </div>
            </div>
          )}

          {/* Tool 13: WebSocket Client */}
          {activeTab === 'ws' && (
            <div className="flex-1 flex flex-col space-y-4 w-full h-full min-h-0 overflow-hidden">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider shrink-0">WebSocket Real-time Client Tester</h2>
              <div className="flex gap-3 shrink-0">
                <input
                  type="text"
                  value={wsUrl}
                  onChange={e => setWsUrl(e.target.value)}
                  className="flex-1 p-3 text-xs bg-black/40 border border-white/10 rounded-xl text-white font-mono"
                  placeholder="ws://localhost:8080/ws"
                />
                <button
                  type="button"
                  onClick={toggleWs}
                  className={`px-6 text-xs font-bold rounded-full cursor-pointer shadow-md transition-all ${
                    wsConnected ? 'bg-rose-500 hover:bg-rose-600 text-white' : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {wsConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>

              {wsConnected && (
                <div className="flex gap-3 shrink-0">
                  <input
                    type="text"
                    value={wsSendMsg}
                    onChange={e => setWsSendMsg(e.target.value)}
                    className="flex-1 p-3 text-xs bg-black/40 border border-white/10 rounded-xl text-white font-mono"
                  />
                  <button type="button" onClick={sendWsMsg} className="px-6 text-xs font-bold bg-teal-500 text-white rounded-full cursor-pointer flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5" /> Send Frame
                  </button>
                </div>
              )}

              <div className="flex-1 p-4 bg-black/40 border border-white/10 rounded-2xl font-mono text-xs overflow-y-auto space-y-1.5 m-0">
                <div className="text-[10px] font-bold text-[#94a3b8] uppercase mb-2">Live Socket Frames Stream:</div>
                {wsLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-1 rounded text-[11px] ${
                      log.startsWith('[Sent]') ? 'text-teal-400 bg-teal-500/10' :
                      log.startsWith('[Received]') ? 'text-emerald-400 bg-emerald-500/10' :
                      log.startsWith('[Error]') ? 'text-rose-400 bg-rose-500/10' :
                      'text-[#94a3b8] bg-white/5'
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
