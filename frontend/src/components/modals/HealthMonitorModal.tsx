import React, { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink, Activity } from 'lucide-react';

interface HealthMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ServiceMetric {
  status?: string;
  pid?: string;
  service: string;
  cpu?: string;
  memory?: string;
  uptime?: string;
  threads?: number;
  ports?: string[];
  stats_port?: string;
  binary_mtime?: number;
}

export const HealthMonitorModal: React.FC<HealthMonitorModalProps> = ({ isOpen, onClose }) => {
  const [env, setEnv] = useState<string>('Development');
  const [metrics, setMetrics] = useState<ServiceMetric[]>([]);
  const [sortCol, setSortCol] = useState<keyof ServiceMetric>('service');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`/api/agent-metrics?env=${encodeURIComponent(env)}`);
      if (res.ok) {
        const raw = await res.json();
        let list: ServiceMetric[] = [];

        if (Array.isArray(raw)) {
          list = raw;
        } else if (raw && typeof raw === 'object') {
          if (Array.isArray(raw.metrics)) {
            list = raw.metrics;
          } else {
            list = Object.keys(raw).map(key => ({
              service: key,
              ...raw[key]
            }));
          }
        }

        setMetrics(list);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (e) {
      setMetrics([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen, env]);

  if (!isOpen) return null;

  const safeMetrics = Array.isArray(metrics) ? metrics : [];

  const parseMemMb = (memStr?: string): number => {
    if (!memStr || memStr === '-' || memStr === 'N/A') return 0;
    const parts = memStr.toLowerCase().split(' ');
    let val = parseFloat(parts[0]) || 0;
    if (parts[1] === 'gib' || parts[1] === 'gb') val *= 1024;
    if (parts[1] === 'kib' || parts[1] === 'kb') val /= 1024;
    return val;
  };

  const totalCount = safeMetrics.length;
  const runningMetrics = safeMetrics.filter(m => m.status === 'RUNNING');
  const runningCount = runningMetrics.length;

  let totalCpu = 0;
  let totalMemMb = 0;
  runningMetrics.forEach(m => {
    totalCpu += parseFloat(m.cpu || '0') || 0;
    totalMemMb += parseMemMb(m.memory);
  });

  const avgCpu = runningCount > 0 ? (totalCpu / runningCount).toFixed(1) : '0.0';
  const memFormatted = totalMemMb >= 1024 ? `${(totalMemMb / 1024).toFixed(2)} GB` : `${totalMemMb.toFixed(0)} MB`;

  const sortedMetrics = [...safeMetrics].sort((a, b) => {
    let valA: any = a[sortCol] ?? '';
    let valB: any = b[sortCol] ?? '';

    if (sortCol === 'cpu') {
      valA = parseFloat(valA) || 0;
      valB = parseFloat(valB) || 0;
    } else if (sortCol === 'memory') {
      valA = parseMemMb(valA);
      valB = parseMemMb(valB);
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const handleSort = (col: keyof ServiceMetric) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const handleOpenLogs = (statsPort?: string) => {
    if (!statsPort || statsPort === 'N/A') return;
    const hostname = window.location.hostname || 'localhost';
    window.open(`http://${hostname}:${statsPort}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#030508]/85 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="relative w-[95vw] max-w-6xl h-[92vh] max-h-[92vh] bg-[#07090e]/90 border border-white/10 rounded-[1.75rem] shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col overflow-hidden text-[#f1f5f9]">
        {/* Header */}
        <div className="px-6 py-3 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <h2 className="text-sm font-bold text-white tracking-wide">
              🖥️ Real-time Server Health & Service Metrics Agent
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

        {/* Top Summary Widgets Row */}
        <div className="p-4 px-6 border-b border-white/10 bg-black/20 grid grid-cols-4 gap-4">
          <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/10">
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Target Environment</div>
            <div className="text-sm font-bold text-emerald-400 mt-1">{env}</div>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/10">
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Running Services</div>
            <div className="text-sm font-bold text-white mt-1 font-mono">{runningCount} / {totalCount}</div>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/10">
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Avg CPU Usage</div>
            <div className="text-sm font-bold text-emerald-400 mt-1 font-mono">{avgCpu}%</div>
          </div>
          <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/10">
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Total Memory</div>
            <div className="text-sm font-bold text-amber-400 mt-1 font-mono">{memFormatted}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-white/10 bg-black/40 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#94a3b8] uppercase mr-2">Switch Env:</span>
            {['Development', 'Staging', 'Production'].map(target => (
              <button
                key={target}
                type="button"
                onClick={() => setEnv(target)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  env === target ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md' : 'bg-white/5 text-[#94a3b8] hover:text-white'
                }`}
              >
                {target}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs text-[#94a3b8]">
            <span>Last Updated: <strong className="text-white font-mono">{lastUpdated || 'Connecting...'}</strong></span>
            <button type="button" onClick={fetchMetrics} className="p-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white cursor-pointer transition-all">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metrics Table */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#05070c]">
          <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-[#94a3b8] font-bold">
                  <th className="p-3 cursor-pointer" onClick={() => handleSort('status')}>Status</th>
                  <th className="p-3 cursor-pointer" onClick={() => handleSort('service')}>Service Name</th>
                  <th className="p-3 cursor-pointer" onClick={() => handleSort('pid')}>PID</th>
                  <th className="p-3 cursor-pointer" onClick={() => handleSort('cpu')}>CPU %</th>
                  <th className="p-3 cursor-pointer" onClick={() => handleSort('memory')}>Memory</th>
                  <th className="p-3 cursor-pointer" onClick={() => handleSort('uptime')}>Uptime</th>
                  <th className="p-3">Ports</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedMetrics.map((m) => {
                  const hasStats = m.stats_port && m.stats_port !== 'N/A';
                  return (
                    <tr key={m.service} className="border-b border-white/5 hover:bg-white/5 font-mono">
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === 'RUNNING' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {m.status || 'STOPPED'}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-white font-sans">{m.service}</td>
                      <td className="p-3 text-[#38bdf8]">{m.pid || 'N/A'}</td>
                      <td className="p-3 text-emerald-400 font-bold">{m.cpu || '0%'}</td>
                      <td className="p-3 text-amber-400">{m.memory || '0 MB'}</td>
                      <td className="p-3 text-[#94a3b8]">{m.uptime || 'N/A'}</td>
                      <td className="p-3 text-white">
                        {m.ports && m.ports.length > 0 ? m.ports.join(', ') : 'N/A'}
                      </td>
                      <td className="p-3 text-right">
                        {hasStats ? (
                          <button
                            type="button"
                            onClick={() => handleOpenLogs(m.stats_port)}
                            className="px-3 py-1 text-[11px] font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            📄 Logs <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#94a3b8]">No Stats Port</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {sortedMetrics.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-xs text-[#94a3b8]">
                      No metrics available from remote [{env}] health agent.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 flex justify-end bg-black/40">
          <button onClick={onClose} className="px-5 py-1.5 text-xs font-semibold rounded-full border border-white/10 bg-white/5 text-[#94a3b8] hover:text-white cursor-pointer transition-all">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
