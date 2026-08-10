import React, { useState, useEffect } from 'react';
import { Code, FileText, Database, Shield, Globe, Terminal, Clock, QrCode, Layers, GitCompare, Wrench } from 'lucide-react';
import { parseKVString } from '@/utils/kvParser';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ToolsModal: React.FC<ToolsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<string>('json');

  // Tool 1: JSON Formatter
  const [jsonInput, setJsonInput] = useState<string>('{"id": 1, "name": "IDS Tool", "enabled": true}');
  const [jsonOutput, setJsonOutput] = useState<string>('');

  // Tool 2: Bcrypt
  const [bcryptPass, setBcryptPass] = useState<string>('');
  const [bcryptHash, setBcryptHash] = useState<string>('');
  const [bcryptVerifyPass, setBcryptVerifyPass] = useState<string>('');
  const [bcryptVerifyHash, setBcryptVerifyHash] = useState<string>('');
  const [bcryptVerifyResult, setBcryptVerifyResult] = useState<string>('');

  // Tool 3: JWT
  const [jwtToken, setJwtToken] = useState<string>('');
  const [jwtHeader, setJwtHeader] = useState<string>('');
  const [jwtPayload, setJwtPayload] = useState<string>('');

  // Tool 4: Curl Runner
  const [curlUrl, setCurlUrl] = useState<string>('https://jsonplaceholder.typicode.com/todos/1');
  const [curlMethod, setCurlMethod] = useState<string>('GET');
  const [curlResult, setCurlResult] = useState<string>('');

  // Tool 5: DNS & Whois
  const [dnsDomain, setDnsDomain] = useState<string>('google.com');
  const [dnsResult, setDnsResult] = useState<any>(null);

  // Tool 6: SQL Preview
  const [sqlQuery, setSqlQuery] = useState<string>('UPDATE users SET name = "Updated Name" WHERE id = 1');
  const [sqlTables, setSqlTables] = useState<string[]>([]);
  const [sqlResult, setSqlResult] = useState<any>(null);

  // Tool 7: KV to JSON
  const [kvInput, setKvInput] = useState<string>('id:100 name:"Admin User" status:active level:5');
  const [kvOutput, setKvOutput] = useState<string>('');

  // Tool 9: Time Converter
  const [epochInput, setEpochInput] = useState<string>(Math.floor(Date.now() / 1000).toString());
  const [convertedTime, setConvertedTime] = useState<string>('');

  // Tool 10: QR Code
  const [qrText, setQrText] = useState<string>('https://github.com');

  useEffect(() => {
    if (activeTab === 'sql' && isOpen) {
      fetch('/api/tools/sql/tables')
        .then(r => r.json())
        .then(d => setSqlTables(d.tables || []))
        .catch(() => {});
    }
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  const formatJson = (pretty: boolean) => {
    try {
      const parsed = JSON.parse(jsonInput);
      setJsonOutput(JSON.stringify(parsed, null, pretty ? 2 : 0));
    } catch (e: any) {
      setJsonOutput('Invalid JSON: ' + e.message);
    }
  };

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

  const decodeJwt = () => {
    try {
      const parts = jwtToken.split('.');
      if (parts.length >= 2) {
        setJwtHeader(atob(parts[0]));
        setJwtPayload(atob(parts[1]));
      } else {
        setJwtHeader('Invalid JWT token format.');
        setJwtPayload('');
      }
    } catch (e: any) {
      setJwtHeader('Decode error: ' + e.message);
    }
  };

  const handleCurlRun = async () => {
    setCurlResult('Executing cURL request...');
    try {
      const res = await fetch('/api/tools/curl/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: curlMethod, url: curlUrl, headers: {}, body: '' })
      });
      const data = await res.json();
      setCurlResult(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setCurlResult('Curl failed: ' + e.message);
    }
  };

  const handleDnsLookup = async () => {
    setDnsResult('Executing DNS & Whois query...');
    try {
      const res = await fetch('/api/tools/dns/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: dnsDomain, type: 'ALL' })
      });
      const data = await res.json();
      setDnsResult(data);
    } catch (e: any) {
      setDnsResult({ error: e.message });
    }
  };

  const handleSqlPreview = async () => {
    setSqlResult('Executing 100% Read-Only SQL Simulation Engine...');
    try {
      const res = await fetch('/api/tools/sql/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlQuery })
      });
      const data = await res.json();
      setSqlResult(data);
    } catch (e: any) {
      setSqlResult({ error: e.message });
    }
  };

  const convertKvToJson = () => {
    try {
      const parsedObj = parseKVString(kvInput);
      setKvOutput(JSON.stringify(parsedObj, null, 2));
    } catch (e: any) {
      setKvOutput('Failed to parse KV sequence: ' + e.message);
    }
  };

  const convertTime = () => {
    const num = Number(epochInput);
    if (!isNaN(num)) {
      const date = new Date(num > 1e11 ? num : num * 1000);
      setConvertedTime(`ISO: ${date.toISOString()}\nLocal: ${date.toLocaleString()}`);
    } else {
      setConvertedTime('Invalid Epoch Timestamp');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#030508]/85 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="relative w-[95vw] max-w-6xl h-[90vh] max-h-[90vh] bg-[#07090e]/90 border border-white/10 rounded-[1.75rem] shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col overflow-hidden text-[#f1f5f9]">
        {/* Header */}
        <div className="px-6 py-3 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Wrench className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              🛠️ Developer Tools Suite
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-[#94a3b8] hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Close Modal"
          >
            ✕
          </button>
        </div>

        {/* Sidebar Nav + Content Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Tool Navigation Sidebar */}
          <div className="w-56 border-r border-white/10 bg-black/30 p-3 space-y-1.5 overflow-y-auto">
            {[
              { id: 'json', label: 'JSON Formatter', icon: Code },
              { id: 'bcrypt', label: 'Bcrypt Generator', icon: Shield },
              { id: 'jwt', label: 'JWT Decoder', icon: Layers },
              { id: 'curl', label: 'cURL Runner', icon: Terminal },
              { id: 'dns', label: 'DNS Dig / Whois', icon: Globe },
              { id: 'sql', label: 'SQL Preview', icon: Database },
              { id: 'kv', label: 'KV to JSON', icon: FileText },
              { id: 'time', label: 'Time Converter', icon: Clock },
              { id: 'qr', label: 'QR Code Gen', icon: QrCode }
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-2.5 transition-all text-left cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.35)] font-bold'
                      : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Main Tool Content Area */}
          <div className="flex-1 p-6 overflow-y-auto bg-[#05070c]">
            {activeTab === 'json' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">JSON Formatter & Beautifier</h3>
                <div className="grid grid-cols-2 gap-4">
                  <textarea
                    value={jsonInput}
                    onChange={e => setJsonInput(e.target.value)}
                    rows={12}
                    className="p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Paste raw JSON string..."
                  />
                  <pre className="p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-[#38bdf8] overflow-auto">
                    {jsonOutput || 'Formatted output will appear here...'}
                  </pre>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => formatJson(true)} className="px-4 py-1.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-full cursor-pointer shadow-md transition-all">
                    Beautify
                  </button>
                  <button type="button" onClick={() => formatJson(false)} className="px-4 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-full cursor-pointer transition-all">
                    Minify
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'bcrypt' && (
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Bcrypt Password Hashing & Verification</h3>
                <div className="p-4 rounded-xl border border-white/10 bg-black/30 space-y-3">
                  <label className="text-[10px] font-bold text-[#94a3b8] uppercase block">Generate Hash</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={bcryptPass}
                      onChange={e => setBcryptPass(e.target.value)}
                      placeholder="Enter raw password"
                      className="flex-1 p-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white"
                    />
                    <button type="button" onClick={handleBcryptHash} className="px-4 text-xs font-bold bg-emerald-500 text-white rounded-full cursor-pointer">
                      Generate Hash
                    </button>
                  </div>
                  {bcryptHash && <pre className="p-2 text-xs font-mono text-emerald-400 bg-black/50 rounded-lg">{bcryptHash}</pre>}
                </div>

                <div className="p-4 rounded-xl border border-white/10 bg-black/30 space-y-3">
                  <label className="text-[10px] font-bold text-[#94a3b8] uppercase block">Verify Hash</label>
                  <input
                    type="text"
                    value={bcryptVerifyPass}
                    onChange={e => setBcryptVerifyPass(e.target.value)}
                    placeholder="Raw password"
                    className="w-full p-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white mb-2"
                  />
                  <input
                    type="text"
                    value={bcryptVerifyHash}
                    onChange={e => setBcryptVerifyHash(e.target.value)}
                    placeholder="Bcrypt Hash ($2a$...)"
                    className="w-full p-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white mb-2"
                  />
                  <button type="button" onClick={handleBcryptVerify} className="px-4 py-1.5 text-xs font-bold bg-amber-500 text-black rounded-full cursor-pointer">
                    Verify Match
                  </button>
                  {bcryptVerifyResult && <div className="text-xs font-bold text-white mt-2">{bcryptVerifyResult}</div>}
                </div>
              </div>
            )}

            {activeTab === 'jwt' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">JWT Decoder & Inspector</h3>
                <textarea
                  value={jwtToken}
                  onChange={e => setJwtToken(e.target.value)}
                  placeholder="Paste JWT token (ey...)"
                  rows={3}
                  className="w-full p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
                <button type="button" onClick={decodeJwt} className="px-4 py-1.5 text-xs font-bold bg-emerald-500 text-white rounded-full cursor-pointer">
                  Decode Token
                </button>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase block mb-1">Header</label>
                    <pre className="p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-[#38bdf8] overflow-auto h-44">{jwtHeader}</pre>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#94a3b8] uppercase block mb-1">Payload</label>
                    <pre className="p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-emerald-400 overflow-auto h-44">{jwtPayload}</pre>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'curl' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">cURL Request Runner</h3>
                <div className="flex gap-2">
                  <select value={curlMethod} onChange={e => setCurlMethod(e.target.value)} className="p-2 text-xs bg-black/40 border border-white/10 rounded-xl text-emerald-400 font-bold">
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <input
                    type="text"
                    value={curlUrl}
                    onChange={e => setCurlUrl(e.target.value)}
                    placeholder="https://api.example.com"
                    className="flex-1 p-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white"
                  />
                  <button type="button" onClick={handleCurlRun} className="px-4 text-xs font-bold bg-emerald-500 text-white rounded-full cursor-pointer">
                    Execute
                  </button>
                </div>
                <pre className="p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-[#38bdf8] overflow-auto h-64">{curlResult}</pre>
              </div>
            )}

            {activeTab === 'dns' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">DNS & Whois Lookup</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={dnsDomain}
                    onChange={e => setDnsDomain(e.target.value)}
                    placeholder="Domain name (e.g. google.com)"
                    className="flex-1 p-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white"
                  />
                  <button type="button" onClick={handleDnsLookup} className="px-4 text-xs font-bold bg-emerald-500 text-white rounded-full cursor-pointer">
                    Lookup DNS
                  </button>
                </div>
                <pre className="p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-emerald-400 overflow-auto h-64">
                  {dnsResult ? JSON.stringify(dnsResult, null, 2) : 'Results will appear here...'}
                </pre>
              </div>
            )}

            {activeTab === 'sql' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">SQL Simulation Engine (100% Read-Only)</h3>
                <textarea
                  value={sqlQuery}
                  onChange={e => setSqlQuery(e.target.value)}
                  rows={3}
                  className="w-full p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
                <div className="flex justify-between items-center">
                  <button type="button" onClick={handleSqlPreview} className="px-4 py-1.5 text-xs font-bold bg-emerald-500 text-white rounded-full cursor-pointer">
                    Simulate Query
                  </button>
                  <span className="text-xs text-[#94a3b8]">Tables: {sqlTables.join(', ')}</span>
                </div>
                <pre className="p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-[#38bdf8] overflow-auto h-52">
                  {sqlResult ? JSON.stringify(sqlResult, null, 2) : 'Simulation diff output will appear here...'}
                </pre>
              </div>
            )}

            {activeTab === 'kv' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">KV Log Sequence to JSON</h3>
                <input
                  type="text"
                  value={kvInput}
                  onChange={e => setKvInput(e.target.value)}
                  className="w-full p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-white"
                />
                <button type="button" onClick={convertKvToJson} className="px-4 py-1.5 text-xs font-bold bg-emerald-500 text-white rounded-full cursor-pointer">
                  Parse to JSON
                </button>
                <pre className="p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-emerald-400 overflow-auto h-52">{kvOutput}</pre>
              </div>
            )}

            {activeTab === 'time' && (
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Epoch & Time Converter</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={epochInput}
                    onChange={e => setEpochInput(e.target.value)}
                    placeholder="Epoch timestamp (seconds/ms)"
                    className="flex-1 p-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white"
                  />
                  <button type="button" onClick={convertTime} className="px-4 text-xs font-bold bg-emerald-500 text-white rounded-full cursor-pointer">
                    Convert
                  </button>
                </div>
                <pre className="p-3 text-xs font-mono bg-black/40 border border-white/10 rounded-xl text-[#38bdf8]">{convertedTime || 'Result...'}</pre>
              </div>
            )}

            {activeTab === 'qr' && (
              <div className="space-y-4 text-center p-6 bg-black/30 rounded-2xl border border-white/10">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-2">QR Code Generator</h3>
                <input
                  type="text"
                  value={qrText}
                  onChange={e => setQrText(e.target.value)}
                  className="w-full max-w-md p-2 text-xs bg-black/40 border border-white/10 rounded-xl text-white mb-4 text-center"
                />
                <div className="flex justify-center">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrText)}`} alt="QR Code" className="p-2 bg-white rounded-2xl shadow-xl" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
