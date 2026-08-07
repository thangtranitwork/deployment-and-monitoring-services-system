import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Power, RefreshCw, Trash2, Save } from 'lucide-react';

interface VPNAccount {
  id: string;
  label: string;
  username: string;
  password?: string;
}

interface OVPNConfig {
  name: string;
  path: string;
}

interface VPNModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VPNModal: React.FC<VPNModalProps> = ({ isOpen, onClose }) => {
  const [vpnState, setVpnState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [configs, setConfigs] = useState<OVPNConfig[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [accounts, setAccounts] = useState<VPNAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [saveCreds, setSaveCreds] = useState<boolean>(true);
  const [logs, setLogs] = useState<string>('Waiting for connection logs...');
  const [customDir, setCustomDir] = useState<string>('');

  const loadVPNData = async () => {
    try {
      // 1. Load OVPN Configs
      const cfgRes = await fetch(`/api/configs${customDir ? `?custom_dir=${encodeURIComponent(customDir)}` : ''}`);
      if (cfgRes.ok) {
        const cfgData: OVPNConfig[] = await cfgRes.json();
        setConfigs(cfgData || []);
        if (cfgData && cfgData.length > 0 && !selectedProfile) {
          setSelectedProfile(cfgData[0].name);
        }
      }

      // 2. Load Saved Accounts from accounts.json
      const accRes = await fetch('/api/accounts');
      if (accRes.ok) {
        const accData: VPNAccount[] = await accRes.json();
        setAccounts(accData || []);
        if (accData && accData.length > 0) {
          setSelectedAccountId(accData[0].id);
          setUsername(accData[0].username || '');
          setPassword(accData[0].password || '');
        }
      }

      // 3. Load Current VPN Status
      const statusRes = await fetch('/api/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.status) {
          setVpnState(statusData.status);
        }
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadVPNData();

      // SSE connection for VPN logs
      const evtSource = new EventSource('/api/logs');
      evtSource.onmessage = (e) => {
        if (e.data) {
          setLogs(prev => prev + '\n' + e.data);
        }
      };
      return () => {
        evtSource.close();
      };
    }
  }, [isOpen, customDir]);

  if (!isOpen) return null;

  const handleAccountSelect = (accId: string) => {
    setSelectedAccountId(accId);
    if (!accId) {
      setUsername('');
      setPassword('');
      return;
    }
    const acc = accounts.find(a => a.id === accId);
    if (acc) {
      setUsername(acc.username || '');
      setPassword(acc.password || '');
    }
  };

  const handleConnect = async () => {
    setVpnState('connecting');
    setLogs(`[${new Date().toLocaleTimeString()}] Initializing OpenVPN process with profile [${selectedProfile}] for account [${username}]...\n`);

    try {
      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config_name: selectedProfile,
          username,
          password,
          save_credentials: saveCreds
        })
      });

      if (res.ok) {
        setVpnState('connected');
        setLogs(prev => prev + `[${new Date().toLocaleTimeString()}] ✅ OpenVPN Tunnel Connected Successfully!\nInterface tun0 assigned.\n`);
      } else {
        const err = await res.text();
        setVpnState('disconnected');
        setLogs(prev => prev + `❌ Connection Error: ${err}\n`);
      }
    } catch (err: any) {
      setVpnState('disconnected');
      setLogs(prev => prev + `❌ Exception: ${err.message}\n`);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/disconnect', { method: 'POST' });
      setVpnState('disconnected');
      setLogs(prev => prev + `\n[${new Date().toLocaleTimeString()}] Disconnected VPN tunnel.`);
    } catch (e) {
      setVpnState('disconnected');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#111520] border border-[#232a3f]/75 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[#f1f5f9]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232a3f]/75 flex justify-between items-center bg-[#0d1017]">
          <h2 className="text-base font-bold text-[#10b981] flex items-center gap-2">
            🔒 VPN Connection Control Suite
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 text-[#94a3b8] hover:text-white transition-all cursor-pointer text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0a0d14]/70">
          {/* Left Column: Config & Saved Accounts */}
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-[#94a3b8] uppercase block mb-1">Custom OVPN Path</label>
              <input
                type="text"
                value={customDir}
                onChange={(e) => setCustomDir(e.target.value)}
                placeholder="e.g. /etc/openvpn (or leave blank)"
                className="w-full text-xs py-2 px-3 bg-[#111520] border border-[#232a3f]/75 rounded-lg text-white focus:outline-none focus:border-[#10b981]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#94a3b8] uppercase block mb-1">OVPN Profile</label>
              <div className="flex gap-2">
                <select
                  value={selectedProfile}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="flex-1 text-xs py-2 px-3 bg-[#111520] border border-[#232a3f]/75 rounded-lg text-white focus:outline-none focus:border-[#10b981] cursor-pointer"
                >
                  {configs.length > 0 ? (
                    configs.map(cfg => (
                      <option key={cfg.name} value={cfg.name}>{cfg.name}</option>
                    ))
                  ) : (
                    <option value="">No .ovpn profiles found</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={loadVPNData}
                  className="px-3 h-9 text-xs border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 rounded-lg cursor-pointer"
                  title="Refresh profiles"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#94a3b8]" />
                </button>
              </div>
            </div>

            {/* Saved Accounts Selection */}
            <div>
              <label className="text-[11px] font-bold text-[#94a3b8] uppercase block mb-1">Saved Accounts (accounts.json)</label>
              <select
                value={selectedAccountId}
                onChange={(e) => handleAccountSelect(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-[#111520] border border-[#232a3f]/75 rounded-lg text-[#10b981] font-bold focus:outline-none focus:border-[#10b981] cursor-pointer mb-2"
              >
                <option value="">-- Enter custom credentials --</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    🔑 {acc.label || acc.username} ({acc.username})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#94a3b8] uppercase block mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="VPN Username"
                className="w-full text-xs py-2 px-3 bg-[#111520] border border-[#232a3f]/75 rounded-lg text-white focus:outline-none focus:border-[#10b981]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#94a3b8] uppercase block mb-1">Password</label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="VPN Password"
                  className="w-full text-xs py-2 px-3 pr-10 bg-[#111520] border border-[#232a3f]/75 rounded-lg text-white focus:outline-none focus:border-[#10b981]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  className="absolute right-2 text-[#94a3b8] hover:text-white p-1 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
              <input
                type="checkbox"
                id="vpn-save-creds"
                checked={saveCreds}
                onChange={(e) => setSaveCreds(e.target.checked)}
                className="rounded border-[#232a3f]/75 bg-[#111520] text-[#10b981] cursor-pointer"
              />
              <label htmlFor="vpn-save-creds" className="cursor-pointer">Save credentials securely in accounts.json</label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConnect}
                disabled={vpnState === 'connected' || vpnState === 'connecting'}
                className="flex-1 h-10 text-xs font-bold rounded-lg bg-[#10b981] hover:bg-emerald-600 text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer"
              >
                ⚡ Connect
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={vpnState === 'disconnected'}
                className="flex-1 h-10 text-xs font-bold rounded-lg border border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <Power className="w-4 h-4" /> Disconnect
              </button>
            </div>
          </div>

          {/* Right Column: Status & Live Logs */}
          <div className="space-y-4 flex flex-col">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-[#232a3f]/75 bg-[#111520]">
                <div className="text-[10px] font-bold text-[#94a3b8] uppercase">VPN State</div>
                <div className="flex items-center gap-3 mt-2">
                  <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                    vpnState === 'connected' ? 'bg-[#10b981] shadow-[0_0_10px_#10b981]' :
                    vpnState === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'
                  }`} />
                  <div>
                    <div className="font-bold text-xs uppercase tracking-wider">
                      {vpnState}
                    </div>
                    <div className="text-[10px] text-[#94a3b8]">
                      {vpnState === 'connected' ? 'Tunnel active' : 'Select profile & connect'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[#232a3f]/75 bg-[#111520]">
                <div className="text-[10px] font-bold text-[#94a3b8] uppercase">Connection Info</div>
                <div className="space-y-1 text-[11px] mt-1.5">
                  <div className="flex justify-between">
                    <span className="text-[#94a3b8]">Interface:</span>
                    <span className="font-mono font-bold text-white">{vpnState === 'connected' ? 'tun0' : 'none'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94a3b8]">Accounts:</span>
                    <span className="font-mono font-bold text-[#10b981]">{accounts.length} saved</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Logs Monitor */}
            <div className="flex-1 border border-[#232a3f]/75 rounded-xl overflow-hidden bg-[#06080d] flex flex-col min-h-[180px]">
              <div className="px-3 py-1.5 bg-[#0d1017] border-b border-[#232a3f]/75 flex justify-between items-center text-[10px] text-[#94a3b8] font-mono">
                <span className="font-bold text-white">openvpn.log</span>
                <span>Live stream</span>
              </div>
              <pre className="flex-1 p-3 font-mono text-[11px] text-[#38bdf8] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {logs}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#232a3f]/75 flex justify-end bg-[#0d1017]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-[#232a3f]/75 text-[#94a3b8] hover:text-white transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
