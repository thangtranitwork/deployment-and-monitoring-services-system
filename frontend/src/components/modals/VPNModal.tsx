import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, Power, RefreshCw, Trash2, Save, Terminal, Activity, Zap, ShieldAlert, Sparkles } from 'lucide-react';

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

interface VPNProcessInfo {
  pid: string;
  user: string;
  cpu: string;
  mem: string;
  stat: string;
  start: string;
  command: string;
}

interface VPNDiagnostics {
  process_count: number;
  has_conflict: boolean;
  conflict_message?: string;
  processes: VPNProcessInfo[];
  interfaces: string[];
  routes: string[];
  raw_report: string;
  checked_at: string;
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
  const [assignedIp, setAssignedIp] = useState<string>('');
  const [assignedInterface, setAssignedInterface] = useState<string>('');

  // Diagnostics & Process State
  const [diagnostics, setDiagnostics] = useState<VPNDiagnostics | null>(null);
  const [isKilling, setIsKilling] = useState(false);
  const [isActionPending, setIsActionPending] = useState(false);

  const logContainerRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/vpn/diagnostics');
      if (res.ok) {
        const data: VPNDiagnostics = await res.json();
        setDiagnostics(data);
      }
    } catch {
      // ignore
    }
  };

  const handleKillAll = async () => {
    if (!confirm('Bạn có chắc chắn muốn buộc tắt toàn bộ tiến trình OpenVPN để giải phóng xung đột mạng?')) {
      return;
    }

    try {
      setIsKilling(true);
      setLogs(prev => prev + `\n[${new Date().toLocaleTimeString()}] 🧹 Đang dọn sạch toàn bộ tiến trình OpenVPN (killall -9)...\n`);
      const res = await fetch('/api/vpn/killall', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setVpnState('disconnected');
        setAssignedIp('');
        setAssignedInterface('');
        if (data.diagnostics) {
          setDiagnostics(data.diagnostics);
        }
        setLogs(prev => prev + `[${new Date().toLocaleTimeString()}] ✅ Đã dọn sạch toàn bộ tiến trình OpenVPN. Hệ thống sẵn sàng kết nối mới.\n`);
      }
    } catch (e: any) {
      setLogs(prev => prev + `❌ Lỗi khi dọn dẹp tiến trình: ${e.message}\n`);
    } finally {
      setIsKilling(false);
    }
  };

  const loadVPNData = async () => {
    try {
      const savedProfile = localStorage.getItem('vpn_selected_profile');
      const savedAccId = localStorage.getItem('vpn_selected_account_id');

      let loadedConfigs: OVPNConfig[] = [];
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
        }
      }

      const statusRes = await fetch('/api/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.status) {
          setVpnState(statusData.status);
        }
        if (statusData.ip_address) setAssignedIp(statusData.ip_address);
        if (statusData.interface) setAssignedInterface(statusData.interface);
      }

      fetchDiagnostics();
    } catch {
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
            if (data?.ip_address) setAssignedIp(data.ip_address);
            if (data?.interface) setAssignedInterface(data.interface);
          }
          fetchDiagnostics();
        } catch {
          // ignore
        }
      }, 3000);

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
  };

  const handleAccountSelect = (accId: string) => {
    setSelectedAccountId(accId);
    if (!accId) {
      localStorage.setItem('vpn_selected_account_id', '');
      const matchedCfg = configs.find(c => c.name === selectedProfile || c.path === selectedProfile);
      setUsername(matchedCfg?.saved_username || '');
      setPassword(matchedCfg?.saved_password || '');
      localStorage.removeItem('vpn_username');
      return;
    }
    localStorage.setItem('vpn_selected_account_id', accId);
    const acc = accounts.find(a => a.id === accId);
    if (acc) {
      setUsername(acc.username || '');
      setPassword(acc.password || '');
      localStorage.setItem('vpn_username', acc.username || '');
    }
  };

  const handleUsernameChange = (u: string) => {
    setUsername(u);
    localStorage.setItem('vpn_username', u);
  };

  const handlePasswordChange = (p: string) => {
    setPassword(p);
  };

  const handleSaveAccount = async () => {
    if (!username || !password) {
      alert('Vui lòng nhập Username và Password trước khi lưu tài khoản.');
      return;
    }
    const label = prompt('Nhập tên gợi nhớ cho tài khoản này (ví dụ: VPN Dev, VPN Staging):', selectedAccountId ? accounts.find(a => a.id === selectedAccountId)?.label || username : username);
    if (!label) return;

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAccountId || undefined,
          label: label.trim(),
          username: username.trim(),
          password: password.trim()
        })
      });
      if (res.ok) {
        const updatedAccounts: VPNAccount[] = await res.json();
        setAccounts(updatedAccounts);
        const match = updatedAccounts.find(a => a.username === username.trim() && a.label === label.trim());
        if (match) {
          setSelectedAccountId(match.id);
          localStorage.setItem('vpn_selected_account_id', match.id);
        }
        alert('✅ Đã lưu tài khoản vào accounts.json thành công!');
      } else {
        const err = await res.json();
        alert(`❌ Lỗi: ${err.error || 'Không thể lưu tài khoản'}`);
      }
    } catch (e: any) {
      alert(`❌ Lỗi kết nối: ${e.message}`);
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedAccountId) return;
    const acc = accounts.find(a => a.id === selectedAccountId);
    if (!confirm(`Bạn có chắc muốn xóa tài khoản [${acc?.label || acc?.username}]?`)) return;

    try {
      const res = await fetch('/api/accounts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedAccountId })
      });
      if (res.ok) {
        setSelectedAccountId('');
        localStorage.setItem('vpn_selected_account_id', '');
        await loadVPNData();
      }
    } catch {
      // ignore
    }
  };

  const handleConnect = async () => {
    if (isActionPending || vpnState === 'connecting' || vpnState === 'connected') return;
    setIsActionPending(true);
    setVpnState('connecting');
    setLogs(`[${new Date().toLocaleTimeString()}] Khởi tạo tiến trình OpenVPN với cấu hình [${selectedProfile}] cho tài khoản [${username}]...\n`);

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
        setLogs(prev => prev + `[${new Date().toLocaleTimeString()}] Tiến trình OpenVPN đã kích hoạt thành công. Đang lắng nghe luồng log...\n`);
        fetchDiagnostics();
      } else {
        let errText = '';
        try {
          const errData = await res.json();
          errText = errData.error || errData.message || JSON.stringify(errData);
        } catch {
          errText = await res.text();
        }
        setVpnState('disconnected');
        setLogs(prev => prev + `❌ Lỗi kết nối: ${errText}\n`);
      }
    } catch (err: any) {
      setTimeout(async () => {
        try {
          const checkRes = await fetch('/api/status');
          if (checkRes.ok) {
            const st = await checkRes.json();
            if (st && (st.status === 'connecting' || st.status === 'connected')) {
              setVpnState(st.status);
              setLogs(prev => prev + `[${new Date().toLocaleTimeString()}] Trạng thái VPN: ${st.status}\n`);
              return;
            }
          }
        } catch {
          // ignore
        }
        setVpnState('disconnected');
        setLogs(prev => prev + `❌ Exception: ${err.message || 'Không thể thực thi kết nối VPN.'}\n`);
      }, 1500);
    } finally {
      setIsActionPending(false);
    }
  };

  const handleDisconnect = async () => {
    if (isActionPending) return;
    setIsActionPending(true);
    try {
      await fetch('/api/disconnect', { method: 'POST' });
      setVpnState('disconnected');
      setAssignedIp('');
      setAssignedInterface('');
      setLogs(prev => prev + `\n[${new Date().toLocaleTimeString()}] Đã ngắt kết nối VPN tunnel.\n`);
      fetchDiagnostics();
    } catch {
      setVpnState('disconnected');
    } finally {
      setIsActionPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#111520] border border-[#232a3f]/75 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-[#f1f5f9]">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-[#232a3f]/75 flex justify-between items-center bg-[#0d1017]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[#10b981]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#10b981] flex items-center gap-2">
                🔒 VPN Control Suite
              </h2>
              <p className="text-[11px] text-[#94a3b8]">Quản lý kết nối OpenVPN, cấu hình và giám sát tiến trình</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-white/10 text-[#94a3b8] hover:text-white transition-all cursor-pointer text-xl font-bold leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Real-time Conflict Alert Banner */}
        {diagnostics?.has_conflict && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 flex items-center justify-between gap-3 text-xs shadow-lg">
            <div className="flex items-center gap-2.5 font-medium">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="text-rose-200">CẢNH BÁO XUNG ĐỘT TIẾN TRÌNH:</strong> Phát hiện{' '}
                <span className="font-bold underline text-white">{diagnostics.process_count} tiến trình OpenVPN</span> đang chạy đồng thời!
              </div>
            </div>
            <button
              type="button"
              onClick={handleKillAll}
              disabled={isKilling}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg shrink-0 flex items-center gap-1.5 shadow-md cursor-pointer transition-all text-xs"
              title="Dọn sạch toàn bộ tiến trình OpenVPN đang xung đột"
            >
              <Trash2 className="w-3.5 h-3.5" /> {isKilling ? 'Đang dọn...' : 'Dọn Sạch (Kill All)'}
            </button>
          </div>
        )}

        {/* Main Single Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0a0d14]/70">
          {/* Left Column: Config & Saved Accounts */}
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-[#94a3b8] uppercase block mb-1">Custom OVPN Path</label>
              <input
                type="text"
                value={customDir}
                onChange={(e) => handleCustomDirChange(e.target.value)}
                placeholder="e.g. /etc/openvpn (hoặc để trống)"
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
                    <option value="">Không tìm thấy file .ovpn nào</option>
                  )}
                </select>
                <button
                  type="button"
                  onClick={loadVPNData}
                  className="px-3 h-9 text-xs border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 rounded-lg cursor-pointer"
                  title="Quét lại danh sách file profile"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#94a3b8]" />
                </button>
              </div>
            </div>

            {/* Saved Accounts Selection */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[11px] font-bold text-[#94a3b8] uppercase">Tài khoản lưu sẵn (accounts.json)</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleSaveAccount}
                    className="px-2 py-0.5 text-[10px] font-semibold bg-[#10b981]/20 hover:bg-[#10b981]/30 border border-[#10b981]/40 text-[#10b981] rounded flex items-center gap-1 cursor-pointer transition-all"
                    title="Lưu thông tin đăng nhập vào accounts.json"
                  >
                    <Save className="w-3 h-3" /> Lưu
                  </button>
                  {selectedAccountId && (
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      className="px-2 py-0.5 text-[10px] font-semibold bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-400 rounded flex items-center gap-1 cursor-pointer transition-all"
                      title="Xóa tài khoản đã chọn"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa
                    </button>
                  )}
                </div>
              </div>
              <select
                value={selectedAccountId}
                onChange={(e) => handleAccountSelect(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-[#111520] border border-[#232a3f]/75 rounded-lg text-[#10b981] font-bold focus:outline-none focus:border-[#10b981] cursor-pointer mb-2"
              >
                <option value="">-- Nhập thông tin tùy biến --</option>
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
                placeholder="Tên tài khoản VPN"
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
                  placeholder="Mật khẩu VPN"
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
              <label htmlFor="vpn-save-creds" className="cursor-pointer">Lưu thông tin đăng nhập an toàn vào accounts.json</label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleConnect}
                disabled={isActionPending || vpnState === 'connected' || vpnState === 'connecting'}
                className="flex-1 h-10 text-xs font-bold rounded-lg bg-[#10b981] hover:bg-emerald-600 text-white flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer transition-all"
              >
                <Zap className="w-4 h-4" /> {vpnState === 'connecting' ? 'Đang kết nối...' : '⚡ Kết Nối'}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isActionPending || vpnState === 'disconnected'}
                className="flex-1 h-10 text-xs font-bold rounded-lg border border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer transition-all"
              >
                <Power className="w-4 h-4" /> Ngắt Kết Nối
              </button>
              <button
                type="button"
                onClick={handleKillAll}
                disabled={isKilling}
                className="px-3 h-10 text-xs font-bold rounded-lg border border-slate-700 bg-slate-800 hover:bg-rose-600/30 text-slate-300 hover:text-rose-300 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                title="Dọn sạch toàn bộ tiến trình OpenVPN đang chạy"
              >
                <Trash2 className="w-4 h-4" /> Dọn Process
              </button>
            </div>
          </div>

          {/* Right Column: Status Cards & Live Logs */}
          <div className="flex flex-col h-full min-h-0 space-y-4">
            {/* 4 Status Cards */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
              {/* Card 1: VPN State */}
              <div className="p-3 rounded-xl border border-[#232a3f]/75 bg-[#111520]">
                <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Trạng Thái VPN</div>
                <div className="flex items-center gap-2.5 mt-1.5">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${
                    vpnState === 'connected' ? 'bg-[#10b981] shadow-[0_0_8px_#10b981]' :
                    vpnState === 'connecting' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'
                  }`} />
                  <div className="min-w-0">
                    <div className={`font-bold text-xs uppercase tracking-wider truncate ${
                      vpnState === 'connected' ? 'text-[#10b981]' :
                      vpnState === 'connecting' ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {vpnState === 'connected' ? 'Đã Kết Nối' : vpnState === 'connecting' ? 'Đang Kết Nối...' : 'Đã Ngắt'}
                    </div>
                    <div className="text-[10px] text-[#94a3b8] truncate">
                      {vpnState === 'connected' ? 'Tunnel hoạt động' : 'Sẵn sàng kết nối'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Process Monitor */}
              <div className="p-3 rounded-xl border border-[#232a3f]/75 bg-[#111520]">
                <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Tiến Trình (Process)</div>
                <div className="flex items-center justify-between mt-1.5">
                  <div className="min-w-0">
                    <div className={`font-mono font-bold text-xs truncate ${
                      (diagnostics?.process_count || 0) > 1
                        ? 'text-rose-400 font-extrabold animate-pulse'
                        : (diagnostics?.process_count || 0) === 1
                        ? 'text-[#10b981]'
                        : 'text-slate-400'
                    }`}>
                      {diagnostics?.process_count || 0} process {(diagnostics?.process_count || 0) > 1 ? '⚠️' : (diagnostics?.process_count || 0) === 1 ? '✅' : '⚪'}
                    </div>
                    <div className="text-[10px] text-[#94a3b8] truncate">
                      {(diagnostics?.process_count || 0) > 1 ? '⚠️ Xung đột process' : 'Không có xung đột'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={fetchDiagnostics}
                    className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#94a3b8] hover:text-white cursor-pointer transition-all shrink-0 ml-1"
                    title="Quét lại tiến trình"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card 3: Assigned IP */}
              <div className="p-3 rounded-xl border border-[#232a3f]/75 bg-[#111520]">
                <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">IP WAN / Tunnel</div>
                <div className="font-mono font-bold text-xs text-[#38bdf8] mt-1.5 truncate">
                  {assignedIp || (vpnState === 'connected' ? '10.2.x.x (Active)' : 'Chưa cấp')}
                </div>
                <div className="text-[10px] text-[#94a3b8] truncate">
                  {assignedIp ? 'Đã định tuyến WAN' : 'Chưa có IP tunnel'}
                </div>
              </div>

              {/* Card 4: Network Interface */}
              <div className="p-3 rounded-xl border border-[#232a3f]/75 bg-[#111520]">
                <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Interface Giao Diện</div>
                <div className="font-mono font-bold text-xs text-emerald-400 mt-1.5 truncate">
                  {assignedInterface || (diagnostics?.interfaces && diagnostics.interfaces.length > 0 ? 'tun / utun' : (vpnState === 'connected' ? 'tun0' : 'Chưa gán'))}
                </div>
                <div className="text-[10px] text-[#94a3b8] truncate">
                  {vpnState === 'connected' ? 'Tunnel TUN/TAP' : 'Chưa mở interface'}
                </div>
              </div>
            </div>

            {/* Live Logs Terminal Monitor with Fixed Strict Bounds */}
            <div className="border border-[#232a3f]/75 rounded-xl overflow-hidden bg-[#06080d] flex flex-col h-[270px] max-h-[270px] min-h-0">
              <div className="px-3.5 py-2 bg-[#0d1017] border-b border-[#232a3f]/75 flex justify-between items-center text-[10px] text-[#94a3b8] font-mono shrink-0">
                <span className="font-bold text-[#f1f5f9] flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#10b981]" /> openvpn.log
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setLogs(`[${new Date().toLocaleTimeString()}] Logs cleared.\n`)}
                    className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/10 transition-all cursor-pointer"
                  >
                    Xóa log
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live</span>
                  </div>
                </div>
              </div>
              <pre
                ref={logContainerRef}
                className="flex-1 p-3 font-mono text-[11px] text-[#38bdf8] overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-all leading-relaxed select-text min-h-0 bg-[#090d16]"
              >
                {logs}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
