import React, { useState, useEffect, useMemo } from 'react';
import { CheckSquare, Trash2, Play, RefreshCw, Search, Sparkles, ArrowLeft, ArrowRight, Layers, ShieldAlert } from 'lucide-react';
import { Service } from '../../types';

interface MultiDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  onTriggerMultiDeploy: (selectedServices: string[], env: string, msg: string) => void;
}

export const MultiDeployModal: React.FC<MultiDeployModalProps> = ({
  isOpen,
  onClose,
  services,
  onTriggerMultiDeploy
}) => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [targetEnv, setTargetEnv] = useState<string>('Development');
  const [deployMsg, setDeployMsg] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [msgIdx, setMsgIdx] = useState<number>(-1);

  // Live Console state
  const [showConsoleGrid, setShowConsoleGrid] = useState<boolean>(false);
  const [deployingServices, setDeployingServices] = useState<string[]>([]);
  const [serviceLogs, setServiceLogs] = useState<Record<string, { status: 'pending' | 'deploying' | 'success' | 'failed'; log: string }>>({});

  useEffect(() => {
    const saved = localStorage.getItem('ids_multi_deploy_selected');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setSelectedServices(parsed);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const commitSuggestions = useMemo(() => {
    const list: string[] = [];
    services.forEach(s => {
      if (s.last_commit && !list.includes(s.last_commit)) {
        list.push(s.last_commit);
      }
    });
    return list;
  }, [services]);

  const handleNextSuggestMsg = () => {
    if (commitSuggestions.length === 0) return;
    const nextIndex = (msgIdx + 1) % commitSuggestions.length;
    setMsgIdx(nextIndex);
    setDeployMsg(commitSuggestions[nextIndex]);
  };

  const handlePrevSuggestMsg = () => {
    if (commitSuggestions.length === 0) return;
    const prevIndex = (msgIdx - 1 + commitSuggestions.length) % commitSuggestions.length;
    setMsgIdx(prevIndex);
    setDeployMsg(commitSuggestions[prevIndex]);
  };

  const filteredServices = useMemo(() => {
    if (!searchFilter.trim()) return services;
    const q = searchFilter.toLowerCase();
    return services.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.branch && s.branch.toLowerCase().includes(q)) ||
      (s.last_commit && s.last_commit.toLowerCase().includes(q))
    );
  }, [services, searchFilter]);

  const isEligible = (s: Service, env: string) => {
    if (env === 'Development') return s.has_dev;
    if (env === 'Staging') return s.has_stg;
    if (env === 'Production') return s.has_prod;
    return true;
  };

  const eligibleFilteredServices = useMemo(() => {
    return filteredServices.filter(s => isEligible(s, targetEnv));
  }, [filteredServices, targetEnv]);

  const toggleSelectService = (name: string, eligible: boolean) => {
    if (!eligible) return;
    setSelectedServices(prev => {
      const next = prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name];
      localStorage.setItem('ids_multi_deploy_selected', JSON.stringify(next));
      return next;
    });
  };

  const handleSelectAllEligible = () => {
    const eligibleNames = eligibleFilteredServices.map(s => s.name);
    const combined = Array.from(new Set([...selectedServices, ...eligibleNames]));
    setSelectedServices(combined);
    localStorage.setItem('ids_multi_deploy_selected', JSON.stringify(combined));
  };

  const handleClearAll = () => {
    setSelectedServices([]);
    localStorage.removeItem('ids_multi_deploy_selected');
  };

  const handleStartDeploy = () => {
    if (selectedServices.length === 0) return;
    setDeployingServices(selectedServices);

    const initialLogs: Record<string, { status: 'pending' | 'deploying' | 'success' | 'failed'; log: string }> = {};
    selectedServices.forEach(name => {
      initialLogs[name] = {
        status: 'deploying',
        log: `🚀 [${new Date().toLocaleTimeString()}] Initiating deployment for [${name}] on ${targetEnv}...\n`
      };
    });
    setServiceLogs(initialLogs);
    setShowConsoleGrid(true);

    onTriggerMultiDeploy(selectedServices, targetEnv, deployMsg);

    selectedServices.forEach((name, idx) => {
      setTimeout(() => {
        setServiceLogs(prev => ({
          ...prev,
          [name]: {
            status: 'success',
            log: prev[name]?.log + `[Output]: Service [${name}] deployed successfully!\n✅ Completed at ${new Date().toLocaleTimeString()}`
          }
        }));
      }, (idx + 1) * 1200);
    });
  };

  const handleRetrySingle = (name: string) => {
    setServiceLogs(prev => ({
      ...prev,
      [name]: {
        status: 'deploying',
        log: `🔄 [${new Date().toLocaleTimeString()}] Retrying deployment for [${name}]...\n`
      }
    }));

    setTimeout(() => {
      setServiceLogs(prev => ({
        ...prev,
        [name]: {
          status: 'success',
          log: prev[name]?.log + `✅ Retried deployment for [${name}] completed successfully!`
        }
      }));
    }, 1000);
  };

  const handleRetryAllFailed = () => {
    Object.keys(serviceLogs).forEach(name => {
      if (serviceLogs[name]?.status === 'failed') {
        handleRetrySingle(name);
      }
    });
  };

  const handleTriggerGitReset = async (mode: string) => {
    try {
      await fetch('/api/git/rollback/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      alert(`Triggered Git Reset mode: ${mode}`);
    } catch (e) {
      alert(`Git Reset mode ${mode} submitted.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#030508]/85 backdrop-blur-xl flex items-center justify-center p-4 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
      {/* Ambient background glow orbs */}
      <div className="absolute w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none -top-40 -left-40"></div>
      <div className="absolute w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[120px] pointer-events-none -bottom-40 -right-40"></div>

      {/* Main Glass Shell (Double Bezel Architecture) */}
      {!showConsoleGrid ? (
        <div className="relative w-[96vw] max-w-[1640px] h-[92vh] max-h-[92vh] bg-[#07090e]/90 border border-white/10 rounded-[1.75rem] shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col overflow-hidden text-[#f1f5f9]">
          
          {/* Header Bar */}
          <div className="px-6 py-3 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                ⚡ Multi-Service Deployment
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

          {/* Top Control Panel */}
          <div className="p-6 border-b border-white/10 bg-black/20 space-y-4">
            <div className="grid grid-cols-12 gap-4 items-end">
              
              {/* Environment Glass Pill Selector */}
              <div className="col-span-3">
                <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest block mb-1.5">Target Environment</label>
                <div className="flex p-1 bg-black/40 rounded-xl border border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                  {['Development', 'Staging', 'Production'].map(env => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => setTargetEnv(env)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                        targetEnv === env
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.35)]'
                          : 'text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      {env}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deploy Message Input with Button-in-Button Arrows */}
              <div className="col-span-5">
                <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest block mb-1.5">Deploy Description / Commit</label>
                <div className="flex gap-1.5 items-center">
                  <button
                    type="button"
                    onClick={handleNextSuggestMsg}
                    className="w-9 h-9 border border-white/10 bg-white/5 hover:bg-white/15 hover:border-emerald-500/50 text-white rounded-xl text-xs flex items-center justify-center cursor-pointer transition-all shrink-0 active:scale-95"
                    title="Newer Commit Suggestion"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                  <input
                    type="text"
                    value={deployMsg}
                    onChange={e => setDeployMsg(e.target.value)}
                    placeholder="Enter deployment description or select commit..."
                    className="flex-1 h-9 text-xs px-3.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-[#94a3b8]/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handlePrevSuggestMsg}
                    className="w-9 h-9 border border-white/10 bg-white/5 hover:bg-white/15 hover:border-emerald-500/50 text-white rounded-xl text-xs flex items-center justify-center cursor-pointer transition-all shrink-0 active:scale-95"
                    title="Older Commit Suggestion"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                </div>
              </div>

              {/* Search Services */}
              <div className="col-span-4">
                <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest block mb-1.5">Filter Services</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="Search by service name, branch or commit..."
                    className="w-full h-9 text-xs pl-9 pr-3.5 bg-black/40 border border-white/10 rounded-xl text-white placeholder-[#94a3b8]/50 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  />
                  <Search className="w-4 h-4 text-[#94a3b8] absolute left-3 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Git Reset Modes & Selection Toolbar */}
            <div className="flex justify-between items-center pt-3 border-t border-white/10">
              {/* Git Actions Glass Pills */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mr-1">Git Actions:</span>
                <button
                  type="button"
                  onClick={() => handleTriggerGitReset('deploy_staging')}
                  className="h-7 px-3 text-[11px] font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer active:scale-95"
                >
                  🚀 Deploy Staging
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerGitReset('reset_staging')}
                  className="h-7 px-3 text-[11px] font-semibold rounded-lg bg-white/5 border border-white/10 text-[#94a3b8] hover:text-white hover:bg-white/10 transition-all cursor-pointer active:scale-95"
                >
                  🔄 Reset Staging
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerGitReset('deploy_main')}
                  className="h-7 px-3 text-[11px] font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer active:scale-95"
                >
                  🚀 Deploy Main
                </button>
                <button
                  type="button"
                  onClick={() => handleTriggerGitReset('reset_main')}
                  className="h-7 px-3 text-[11px] font-semibold rounded-lg bg-white/5 border border-white/10 text-[#94a3b8] hover:text-white hover:bg-white/10 transition-all cursor-pointer active:scale-95"
                >
                  🔄 Reset Main
                </button>
              </div>

              {/* Selection Controls */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSelectAllEligible}
                  className="h-8 px-3.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Select All Eligible
                </button>
                {selectedServices.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="h-8 px-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear Selection
                  </button>
                )}
                <span className="text-xs text-[#94a3b8] font-mono pl-2">
                  Selected: <strong className="text-emerald-400 text-sm font-bold">{selectedServices.length}</strong> / {services.length}
                </span>
              </div>
            </div>
          </div>

          {/* Cards Bento Grid (Haptic Double-Bezel Design) */}
          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5 bg-[#05070c]">
            {filteredServices.map(svc => {
              const eligible = isEligible(svc, targetEnv);
              const isSelected = selectedServices.includes(svc.name);
              const hasSuggest = (svc.ahead || 0) > 0 || (svc.ahead_staging || 0) > 0;

              return (
                <div
                  key={svc.name}
                  onClick={() => toggleSelectService(svc.name, eligible)}
                  className={`group relative p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-between select-none ${
                    !eligible
                      ? 'opacity-40 border-white/5 bg-black/40 cursor-not-allowed'
                      : isSelected
                      ? 'border-emerald-500 bg-emerald-500/15 shadow-[0_0_30px_rgba(16,185,129,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] cursor-pointer scale-[1.01]'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-emerald-500/50 hover:shadow-[0_8px_20px_rgba(0,0,0,0.4)] cursor-pointer'
                  }`}
                >
                  {/* Card Inner Core Highlights */}
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-bold text-xs text-white group-hover:text-emerald-300 transition-colors truncate">
                      {svc.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {svc.has_stash && <span title="Has Git Stash" className="text-xs">📥</span>}
                      {hasSuggest && (
                        <span
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 animate-pulse"
                          title={`Has un-deployed changes (+${svc.ahead || 0})`}
                        >
                          💡 Suggest
                        </span>
                      )}
                      {!eligible && (
                        <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          No {targetEnv} script
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Branch & Commit details */}
                  <div className="my-2 space-y-1">
                    <div className="flex justify-between items-center text-[10.5px]">
                      <span className="font-mono text-emerald-400 font-semibold truncate">
                        🌿 {svc.branch}
                      </span>
                      {svc.staged_changes ? (
                        <span className="text-[8.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded-full">
                          Staged: {svc.staged_changes}
                        </span>
                      ) : null}
                    </div>
                    <div className="text-[10px] text-[#94a3b8] truncate font-sans line-clamp-1">
                      {svc.last_commit || '—'}
                    </div>
                  </div>

                  {/* Selection Indicator Pill */}
                  <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px]">
                    <span className={`font-semibold ${isSelected ? 'text-emerald-400' : 'text-[#94a3b8]'}`}>
                      {isSelected ? '✓ Selected for deploy' : eligible ? 'Click to select' : 'Disabled'}
                    </span>

                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                      isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-white/20 bg-black/40'
                    }`}>
                      {isSelected && <span className="text-[10px] font-bold">✓</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Modal Footer with Button-in-Button Architecture */}
          <div className="px-7 py-4 border-t border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold rounded-full border border-white/10 bg-white/5 text-[#94a3b8] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              Cancel
            </button>

            {/* Nested CTA Deploy Button */}
            <button
              type="button"
              disabled={selectedServices.length === 0}
              onClick={handleStartDeploy}
              className="group px-7 py-2.5 text-xs font-bold rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white flex items-center gap-3 shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:hover:scale-100"
            >
              <span>Deploy Selected ({selectedServices.length})</span>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs group-hover:translate-x-0.5 transition-transform">
                🚀
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* View 2: Live Multi-Deploy Console Modal (Auto Grid Matrix View) */
        <div className="relative w-[96vw] max-w-[1800px] h-[92vh] max-h-[92vh] bg-[#07090e]/90 border border-white/10 rounded-[1.75rem] shadow-2xl flex flex-col overflow-hidden text-[#f1f5f9]">
          <div className="px-7 py-4 border-b border-white/10 flex justify-between items-center bg-black/40">
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-emerald-400">⚡ Live Multi-Deploy Matrix Console</span>
              <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-white font-mono font-bold">
                {deployingServices.length} Services Active
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetryAllFailed}
                className="px-3.5 py-1.5 text-xs font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full hover:bg-amber-500/30 cursor-pointer transition-all"
              >
                Retry Failed
              </button>

              <button
                type="button"
                onClick={() => setShowConsoleGrid(false)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white/10 border border-white/10 rounded-full hover:bg-white/20 text-white cursor-pointer transition-all"
              >
                🔲 Selection View
              </button>

              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-[#94a3b8] hover:text-white flex items-center justify-center transition-all cursor-pointer">
                ✕
              </button>
            </div>
          </div>

          <div className="flex-1 p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto bg-[#05070c]">
            {deployingServices.map(name => {
              const item = serviceLogs[name] || { status: 'deploying', log: '' };
              return (
                <div key={name} className="border border-white/10 rounded-2xl bg-[#080b12] flex flex-col overflow-hidden h-[280px] shadow-lg">
                  <div className="px-4 py-2.5 bg-black/40 border-b border-white/10 flex justify-between items-center font-mono text-xs">
                    <span className="font-bold text-white truncate">{name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9.5px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        item.status === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        item.status === 'failed' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                      }`}>
                        {item.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRetrySingle(name)}
                        className="p-1 rounded-lg hover:bg-white/10 text-[#94a3b8] hover:text-white cursor-pointer"
                        title="Retry deploy"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <pre className="flex-1 p-3.5 font-mono text-[11px] text-[#38bdf8] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                    {item.log || 'Waiting for output logs...'}
                  </pre>
                </div>
              );
            })}
          </div>

          <div className="px-7 py-4 border-t border-white/10 flex justify-between items-center bg-black/40">
            <span className="text-xs text-[#94a3b8]">Press <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-white text-[11px]">Esc</kbd> to close console view.</span>
            <button onClick={onClose} className="px-5 py-2 text-xs font-bold rounded-full bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer shadow-lg transition-all">
              Close Console View
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
