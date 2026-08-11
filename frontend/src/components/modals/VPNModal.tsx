import React, { useState, useEffect, useRef } from 'react';
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
  saved_username?: string;
  saved_password?: string;
}

interface VPNModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStateChange?: (status: string) => void;
}

export const VPNModal: React.FC<VPNModalProps> = ({ isOpen, onClose, onStateChange }) => {
  const [vpnState, setVpnStateInternal] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const setVpnState = (val: 'disconnected' | 'connecting' | 'connected') => {
    setVpnStateInternal(val);
    if (onStateChange) {
      onStateChange(val);
    }
  };
  const [configs, setConfigs] = useState<OVPNConfig[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>(() => localStorage.getItem('vpn_selected_profile') || '');
  const [accounts, setAccounts] = useState<VPNAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => localStorage.getItem('vpn_selected_account_id') || '');
  const [username, setUsername] = useState<string>(() => localStorage.getItem('vpn_username') || '');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [saveCreds, setSaveCreds] = useState<boolean>(true);
  const [logs, setLogs] = useState<string>('Waiting for connection logs...');
  const [customDir, setCustomDir] = useState<string>(() => localStorage.getItem('vpn_custom_dir') || '');

  const logContainerRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const loadVPNData = async () => {
    try {
      const savedProfile = localStorage.getItem('vpn_selected_profile');
      const savedAccId = localStorage.getItem('vpn_selected_account_id');

      let loadedConfigs: OVPNConfig[] = [];
      // 1. Load OVPN Configs
      const cfgRes = await fetch(`/api/configs${customDir ? `?custom_dir=${encodeURIComponent(customDir)}` : ''}`);
      if (cfgRes.ok) {
        loadedConfigs = (await cfgRes.json()) || [];
        setConfigs(loadedConfigs);
        if (loadedConfigs.length > 0) {
          const matched = loadedConfigs.find(c => c.name === savedProfile || c.path === savedProfile);
          if (matched) {
            setSelectedProfile(matched.name);
          } else if (!selectedProfile || !loadedConfigs.some(c => c.name === selectedProfile)) {
            setSelectedProfile(loadedConfigs[0].name);
            localStorage.setItem('vpn_selected_profile', loadedConfigs[0].name);
          }
        }
      }

      // 2. Load Saved Accounts from accounts.json
      const accRes = await fetch('/api/accounts');
      if (accRes.ok) {
        const accData: VPNAccount[] = (await accRes.json()) || [];
        setAccounts(accData);
        if (accData.length > 0) {
          const matchedAcc = accData.find(a => a.id === savedAccId);
          if (matchedAcc) {
            setSelectedAccountId(matchedAcc.id);
            setUsername(matchedAcc.username || '');
            setPassword(matchedAcc.password || '');
            localStorage.setItem('vpn_username', matchedAcc.username || '');
          } else if (savedAccId === '') {
            // User explicitly chose custom creds
          } else {
            setSelectedAccountId(accData[0].id);
            setUsername(accData[0].username || '');
            setPassword(accData[0].password || '');
            localStorage.setItem('vpn_selected_account_id', accData[0].id);
            localStorage.setItem('vpn_username', accData[0].username || '');
          }
        } else {
          // If no saved accounts, check if selected profile has saved credentials
          const activeProfName = savedProfile || loadedConfigs[0]?.name;
          const activeProf = loadedConfigs.find(c => c.name === activeProfName || c.path === activeProfName);
          if (activeProf && (activeProf.saved_username || activeProf.saved_password)) {
            setUsername(activeProf.saved_username || '');
            setPassword(activeProf.saved_password || '');
          }
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

      const statusInterval = setInterval(async () => {
        try {
          const res = await fetch('/api/status');
          if (res.ok) {
            const data = await res.json();
            if (data && data.status) {
              setVpnState(data.status);
            }
          }
        } catch {
          // ignore
        }
      }, 2500);

      let evtSource: EventSource | null = new EventSource('/api/logs');
      evtSource.onmessage = (e) => {
        if (e.data) {
          setLogs(prev => prev + '\n' + e.data);
        }
      };
      evtSource.onerror = () => {
        if (evtSource) {
          evtSource.close();
          evtSource = null;
        }
        setTimeout(() => {
          if (isOpen) {
            evtSource = new EventSource('/api/logs');
            evtSource.onmessage = (e) => {
              if (e.data) setLogs(prev => prev + '\n' + e.data);
            };
          }
        }, 2000);
      };

      return () => {
        clearInterval(statusInterval);
        if (evtSource) {
          evtSource.close();
        }
      };
    }
  }, [isOpen, customDir]);

  if (!isOpen) return null;

  const handleCustomDirChange = (val: string) => {
    setCustomDir(val);
    localStorage.setItem('vpn_custom_dir', val);
  };

  const handleProfileSelect = (val: string) => {
    setSelectedProfile(val);
    localStorage.setItem('vpn_selected_profile', val);

    const matchedCfg = configs.find(c => c.name === val || c.path === val);
    if (matchedCfg && (matchedCfg.saved_username || matchedCfg.saved_password)) {
      if (!selectedAccountId) {
        setUsername(matchedCfg.saved_username || '');
        setPassword(matchedCfg.saved_password || '');
      }
    }
  };

  const handleAccountSelect = (accId: string) => {
    setSelectedAccountId(accId);
    if (!accId) {
      localStorage.setItem('vpn_selected_account_id', '');
      setUsername('');
      setPassword('');
      localStorage.removeItem('vpn_username');
      return;
    }
    localStorage.setItem('vpn_selected_account_id', accId);
    const acc = accounts.find(a => a.id === accId);
    if (acc) {
      const u = acc.username || '';
      const p = acc.password || '';
      setUsername(u);
      setPassword(p);
      localStorage.setItem('vpn_username', u);
    }
  };

  const handleUsernameChange = (val: string) => {
    setUsername(val);
    localStorage.setItem('vpn_username', val);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
  };

  const handleSaveAccount = async () => {
    if (!username.trim() || !password) {
      alert('Please enter both username and password first.');
      return;
    }

    let label = '';
    if (selectedAccountId) {
      const existing = accounts.find(a => a.id === selectedAccountId);
      if (existing) {
        if (window.confirm(`Do you want to update credentials for saved account "${existing.label || existing.username}"?`)) {
          label = existing.label || existing.username;
        } else {
          return;
        }
      }
    }

    if (!label) {
      const inputLabel = window.prompt('Enter a display name/label for this account:', username.trim());
      if (!inputLabel || !inputLabel.trim()) return;
      label = inputLabel.trim();
    }

    try {
      const payload: any = { label, username: username.trim(), password };
      if (selectedAccountId) {
        payload.id = selectedAccountId;
      }

      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const updatedAccounts: VPNAccount[] = await res.json();
        setAccounts(updatedAccounts);
        const match = updatedAccounts.find(a => a.username === username.trim() && a.label === label);
        if (match) {
          setSelectedAccountId(match.id);
          localStorage.setItem('vpn_selected_account_id', match.id);
        }
        alert('Account saved successfully!');
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to save account' }));
        alert(err.error || 'Failed to save account');
      }
    } catch (err: any) {
      alert('Failed to save account: ' + err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccountId) return;
    const acc = accounts.find(a => a.id === selectedAccountId);
    if (!acc) return;

    if (!window.confirm(`Are you sure you want to delete saved account "${acc.label || acc.username}"?`)) {
      return;
    }

    try {
      const res = await fetch('/api/accounts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedAccountId })
      });

      if (res.ok) {
        setSelectedAccountId('');
        localStorage.setItem('vpn_selected_account_id', '');
        setUsername('');
        setPassword('');
        await loadVPNData();
        alert('Account deleted successfully!');
      } else {
        const err = await res.json().catch(() => ({ error: 'Failed to delete account' }));
        alert(err.error || 'Failed to delete account');
      }
    } catch (err: any) {
      alert('Failed to delete account: ' + err.message);
    }
  };

  const handleConnect = async () => {
    setVpnState('connecting');
    setLogs(`[${new Date().toLocaleTimeString()}] Initializing OpenVPN process with profile [${selectedProfile}] for account [${username}]...\n`);

    try {
      const selectedCfgObj = configs.find(c => c.name === selectedProfile || c.path === selectedProfile);
      const configPath = selectedCfgObj?.path || selectedProfile;

      const res = await fetch('/api/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config_path: configPath,
          config_name: selectedProfile,
          username,
          password,
          save_credentials: saveCreds
        })
      });

      if (res.ok) {
        setVpnState('connecting');
        setLogs(prev => prev + `[${new Date().toLocaleTimeString()}] OpenVPN process launched successfully. Monitoring tunnel status...\n`);
      } else {
        let errText = '';
        try {
          const errData = await res.json();
          errText = errData.error || errData.message || JSON.stringify(errData);
        } catch {
          errText = await res.text();
        }
        setVpnState('disconnected');
        setLogs(prev => prev + `❌ Connection Error: ${errText}\n`);
      }
    } catch (err: any) {
      // OpenVPN route changes can cause a temporary fetch socket error in browser: verify actual status
      setTimeout(async () => {
        try {
          const checkRes = await fetch('/api/status');
          if (checkRes.ok) {
            const st = await checkRes.json();
            if (st && (st.status === 'connecting' || st.status === 'connected')) {
              setVpnState(st.status);
              setLogs(prev => prev + `[${new Date().toLocaleTimeString()}] VPN Tunnel status: ${st.status}\n`);
              return;
            }
          }
        } catch {
          // ignore
        }
        setVpnState('disconnected');
        setLogs(prev => prev + `❌ Exception: ${err.message || 'Failed to execute VPN connect action.'}\n`);
      }, 1500);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/disconnect', { method: 'POST' });
      setVpnState('disconnected');
      setLogs(prev => prev + `\n[${new Date().toLocaleTimeString()}] Disconnected VPN tunnel.\n`);
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
                onChange={(e) => handleCustomDirChange(e.target.value)}
                placeholder="e.g. /etc/openvpn (or leave blank)"
                className="w-full text-xs py-2 px-3 bg-[#111520] border border-[#232a3f]/75 rounded-lg text-white focus:outline-none focus:border-[#10b981]"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#94a3b8] uppercase block mb-1">OVPN Profile</label>
              <div className="flex gap-2">
                <select
                  value={selectedProfile}
                  onChange={(e) => handleProfileSelect(e.target.value)}
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
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-[#94a3b8] uppercase">Saved Accounts (accounts.json)</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleSaveAccount}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-[#10b981]/20 hover:bg-[#10b981]/30 border border-[#10b981]/40 text-[#10b981] rounded flex items-center gap-1 cursor-pointer transition-all"
                    title="Save current credentials to accounts.json"
                  >
                    <Save className="w-3 h-3" /> Save
                  </button>
                  {selectedAccountId && (
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 rounded flex items-center gap-1 cursor-pointer transition-all"
                      title="Delete selected account"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  )}
                </div>
              </div>
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
                onChange={(e) => handleUsernameChange(e.target.value)}
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
                  onChange={(e) => handlePasswordChange(e.target.value)}
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
                    <div className={`font-bold text-xs uppercase tracking-wider ${
                      vpnState === 'connected' ? 'text-[#10b981]' :
                      vpnState === 'connecting' ? 'text-amber-500' : 'text-rose-500'
                    }`}>
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
                    <span className="font-mono font-bold text-[#f1f5f9]">{vpnState === 'connected' ? 'tun0' : 'none'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#94a3b8]">Accounts:</span>
                    <span className="font-mono font-bold text-[#10b981]">{accounts.length} saved</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Logs Monitor */}
            <div className="flex-1 border border-[#232a3f]/75 rounded-xl overflow-hidden bg-[#06080d] flex flex-col h-[260px] max-h-[300px]">
              <div className="px-3 py-1.5 bg-[#0d1017] border-b border-[#232a3f]/75 flex justify-between items-center text-[10px] text-[#94a3b8] font-mono">
                <span className="font-bold text-[#f1f5f9]">openvpn.log</span>
                <span>Live stream</span>
              </div>
              <pre ref={logContainerRef} className="flex-1 p-3 font-mono text-[11px] text-[#38bdf8] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {logs}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#232a3f]/75 flex justify-end bg-[#0d1017]">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-lg border border-[#232a3f]/75 bg-white/5 hover:bg-white/10 text-[#f1f5f9] transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
