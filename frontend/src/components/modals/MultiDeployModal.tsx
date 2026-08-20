import React, { useState, useEffect, useMemo } from 'react';
import { CheckSquare, Trash2, Play, RefreshCw, Search, Sparkles, ArrowLeft, ArrowRight, Layers, ShieldAlert } from 'lucide-react';
import { Service } from '../../types';

interface MultiDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  onTriggerMultiDeploy?: (selectedServices: string[], env: string, msg: string, gitResetMode?: string) => void;
  activeWorkspaceId?: string;
  onDeployComplete?: () => void;
  initialSelectedServices?: string[];
  autoStart?: boolean;
}

export const MultiDeployModal: React.FC<MultiDeployModalProps> = ({
  isOpen,
  onClose,
  services,
  onTriggerMultiDeploy,
  activeWorkspaceId,
  onDeployComplete,
  initialSelectedServices,
  autoStart
}) => {
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [targetEnv, setTargetEnv] = useState<string>('Development');
  const [deployMsg, setDeployMsg] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [msgIdx, setMsgIdx] = useState<number>(-1);
  const [gitResetMode, setGitResetMode] = useState<string>('none');

  // Live Console state - always starts as false (Selection View) when modal is opened
  const [showConsoleGrid, setShowConsoleGrid] = useState<boolean>(false);
  const [deployingServices, setDeployingServices] = useState<string[]>([]);
  const [serviceLogs, setServiceLogs] = useState<Record<string, { status: 'pending' | 'deploying' | 'success' | 'failed'; log: string }>>({});

  // Reset to Selection View whenever modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialSelectedServices && initialSelectedServices.length > 0 && autoStart) {
        console.log('🚀 [MultiDeployModal] Auto-Start triggered with 5-worker pool for:', initialSelectedServices);
        setSelectedServices(initialSelectedServices);
        setDeployingServices(initialSelectedServices);
        const initialLogs: Record<string, { status: 'pending' | 'deploying' | 'success' | 'failed'; log: string }> = {};
        initialSelectedServices.forEach(name => {
          initialLogs[name] = {
            status: 'pending',
            log: `⏳ [${new Date().toLocaleTimeString()}] Batch Queued [${name}] — Waiting for build worker...\n`
          };
        });
        setServiceLogs(initialLogs);
        setShowConsoleGrid(true);

        runBatchDeployWithWorkerLimit(initialSelectedServices, targetEnv, deployMsg, gitResetMode);
      } else {
        setShowConsoleGrid(false);
      }
    }
  }, [isOpen, initialSelectedServices, autoStart]);

  // Load workspace-isolated selection and environment
  useEffect(() => {
    if (!isOpen) return;
    const selectedKey = activeWorkspaceId ? `ids_multi_deploy_selected_${activeWorkspaceId}` : 'ids_multi_deploy_selected';
    const envKey = activeWorkspaceId ? `ids_multi_deploy_env_${activeWorkspaceId}` : 'ids_multi_deploy_env';

    const savedEnv = localStorage.getItem(envKey);
    if (savedEnv) {
      setTargetEnv(savedEnv);
    }

    const saved = localStorage.getItem(selectedKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Only select services that exist in the current workspace
          const valid = parsed.filter(name => services.some(s => s.name === name));
          setSelectedServices(valid);
          return;
        }
      } catch (e) {
        // ignore
      }
    }
    setSelectedServices([]);

    const savedMode = localStorage.getItem('lastGitResetMode');
    if (savedMode) {
      setGitResetMode(savedMode);
    }
  }, [activeWorkspaceId, isOpen, services]);

  const handleTargetEnvChange = (env: string) => {
    setTargetEnv(env);
    const envKey = activeWorkspaceId ? `ids_multi_deploy_env_${activeWorkspaceId}` : 'ids_multi_deploy_env';
    localStorage.setItem(envKey, env);
  };

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
      const selectedKey = activeWorkspaceId ? `ids_multi_deploy_selected_${activeWorkspaceId}` : 'ids_multi_deploy_selected';
      localStorage.setItem(selectedKey, JSON.stringify(next));
      return next;
    });
  };

  const handleSelectAllEligible = () => {
    const eligibleNames = eligibleFilteredServices.map(s => s.name);
    const combined = Array.from(new Set([...selectedServices, ...eligibleNames]));
    setSelectedServices(combined);
    const selectedKey = activeWorkspaceId ? `ids_multi_deploy_selected_${activeWorkspaceId}` : 'ids_multi_deploy_selected';
    localStorage.setItem(selectedKey, JSON.stringify(combined));
  };

  const handleClearAll = () => {
    setSelectedServices([]);
    const selectedKey = activeWorkspaceId ? `ids_multi_deploy_selected_${activeWorkspaceId}` : 'ids_multi_deploy_selected';
    localStorage.removeItem(selectedKey);
  };

  const handleToggleGitResetMode = (mode: string) => {
    const nextMode = gitResetMode === mode ? 'none' : mode;
    setGitResetMode(nextMode);
    localStorage.setItem('lastGitResetMode', nextMode);
  };

  // ── 5-Worker Concurrency Pool Handler ──────────────────────────────────
  const runBatchDeployWithWorkerLimit = async (
    serviceList: string[],
    env: string,
    message: string,
    resetMode: string
  ) => {
    if (serviceList.length === 0) return;

    const MAX_WORKERS = 5;
    const queue = [...serviceList];
    let activeWorkers = 0;

    return new Promise<void>((resolve) => {
      const processNext = () => {
        if (queue.length === 0 && activeWorkers === 0) {
          resolve();
          return;
        }

        while (queue.length > 0 && activeWorkers < MAX_WORKERS) {
          const serviceName = queue.shift()!;
          activeWorkers++;

          let slotReleased = false;
          const releaseSlot = () => {
            if (!slotReleased) {
              slotReleased = true;
              activeWorkers--;
              processNext(); // Immediately trigger next queued service
            }
          };

          deploySingleService(
            serviceName,
            env,
            message,
            resetMode,
            /* onVerificationStarted */ () => {
              releaseSlot();
            }
          ).finally(() => {
            releaseSlot();
          });
        }
      };

      processNext();
    });
  };

  const deploySingleService = async (
    name: string,
    env: string,
    message: string,
    resetMode: string,
    onVerificationStarted?: () => void
  ) => {
    const isNoDeploy = resetMode === 'reset_staging_no_deploy' || resetMode === 'reset_main_no_deploy';
    setServiceLogs(prev => ({
      ...prev,
      [name]: {
        status: 'deploying',
        log: `🚀 [${new Date().toLocaleTimeString()}] Starting ${isNoDeploy ? 'Git Reset' : 'deployment'} for [${name}] on ${env}...\n`
      }
    }));

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: name,
          env: env,
          message: message,
          git_reset_mode: resetMode !== 'none' ? resetMode : undefined,
          reset_staging: resetMode === 'reset_staging_deploy',
          workspace_id: activeWorkspaceId
        })
      });

      if (res.status === 401) {
        setServiceLogs(prev => ({
          ...prev,
          [name]: {
            status: 'failed',
            log: (prev[name]?.log || '') + '\n❌ Access Denied: Invalid production password.\n'
          }
        }));
        return;
      }

      if (!res.ok) {
        const errText = await res.text();
        setServiceLogs(prev => ({
          ...prev,
          [name]: {
            status: 'failed',
            log: (prev[name]?.log || '') + `\n❌ [Error]: ${errText || 'Action failed.'}\n`
          }
        }));
        return;
      }

      if (!res.body) {
        setServiceLogs(prev => ({
          ...prev,
          [name]: {
            status: 'failed',
            log: (prev[name]?.log || '') + '\n❌ Failed to read deployment stream.\n'
          }
        }));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let hasError = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split('\n\n');
        for (const event of events) {
          const trimmed = event.trimStart();
          if (trimmed.startsWith('data: ')) {
            const content = trimmed.slice(6);
            if (content.includes('❌') || content.includes('[ERROR]') || content.includes('Aborting')) {
              hasError = true;
            }

            // If build finished & reached verification / healthcheck step, release build worker slot immediately
            if (
              content.includes('[Deploy script finished') ||
              content.includes('[Verification]') ||
              content.includes('Waiting 5 seconds')
            ) {
              if (onVerificationStarted) {
                onVerificationStarted();
              }
            }

            if (content.trim() !== '[EOF]') {
              setServiceLogs(prev => ({
                ...prev,
                [name]: {
                  status: hasError ? 'failed' : 'deploying',
                  log: (prev[name]?.log || '') + content + '\n'
                }
              }));
            }
          }
        }
      }

      setServiceLogs(prev => ({
        ...prev,
        [name]: {
          status: hasError ? 'failed' : 'success',
          log: (prev[name]?.log || '') + (hasError ? '\n❌ Finished with errors.' : '\n✅ Process completed successfully!')
        }
      }));
    } catch (err: any) {
      setServiceLogs(prev => ({
        ...prev,
        [name]: {
          status: 'failed',
          log: (prev[name]?.log || '') + `\n❌ Network Error: ${err.message || 'Request failed'}\n`
        }
      }));
    } finally {
      onDeployComplete?.();
    }
  };

  const handleStartDeploy = () => {
    if (selectedServices.length === 0) return;
    setDeployingServices(selectedServices);

    const initialLogs: Record<string, { status: 'pending' | 'deploying' | 'success' | 'failed'; log: string }> = {};
    selectedServices.forEach(name => {
      initialLogs[name] = {
        status: 'pending',
        log: `⏳ [${new Date().toLocaleTimeString()}] Queued [${name}] (Git Mode: ${gitResetMode}) — Waiting for build worker...\n`
      };
    });
    setServiceLogs(initialLogs);
    setShowConsoleGrid(true);

    if (onTriggerMultiDeploy) {
      onTriggerMultiDeploy(selectedServices, targetEnv, deployMsg, gitResetMode);
    }

    runBatchDeployWithWorkerLimit(selectedServices, targetEnv, deployMsg, gitResetMode);
  };

  const handleRetrySingle = (name: string) => {
    deploySingleService(name, targetEnv, deployMsg, gitResetMode);
  };

  const handleRetryAllFailed = () => {
    const failedNames = Object.keys(serviceLogs).filter(name => serviceLogs[name]?.status === 'failed');
    if (failedNames.length === 0) return;

    failedNames.forEach(name => {
      setServiceLogs(prev => ({
        ...prev,
        [name]: {
          status: 'pending',
          log: `⏳ [${new Date().toLocaleTimeString()}] Re-queued [${name}] — Waiting for build worker...\n`
        }
      }));
    });

    runBatchDeployWithWorkerLimit(failedNames, targetEnv, deployMsg, gitResetMode);
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
          <div className="multi-deploy-top-panel p-6 border-b border-white/10 bg-black/20 space-y-4">
            <div className="grid grid-cols-12 gap-4 items-end">
              
              {/* Environment Glass Pill Selector */}
              <div className="col-span-3">
                <label className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-widest block mb-1.5">Target Environment</label>
                <div className="multi-deploy-pill-container flex p-1 bg-black/40 rounded-xl border border-white/10 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
                  {['Development', 'Staging', 'Production'].map(env => (
                    <button
                      key={env}
                      type="button"
                      onClick={() => handleTargetEnvChange(env)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 cursor-pointer ${
                        targetEnv === env
                          ? 'bg-emerald-600 text-white shadow-[0_2px_10px_rgba(16,185,129,0.35)]'
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
            <div className="flex justify-between items-center pt-3 border-t border-white/10 flex-wrap gap-2">
              {/* Git Actions Glass Pills - All neutral when inactive, only selected one illuminates */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider mr-1">Git Actions:</span>
                <button
                  type="button"
                  onClick={() => handleToggleGitResetMode('reset_staging_deploy')}
                  className={`git-mode-btn h-7 px-3 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                    gitResetMode === 'reset_staging_deploy'
                      ? 'active bg-emerald-600 text-white border-emerald-500 font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : 'bg-white/5 border-white/10 text-[#94a3b8] hover:text-white hover:bg-white/10'
                  }`}
                  title="Reset Staging branch and deploy"
                >
                  🚀 Deploy Staging
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleGitResetMode('reset_staging_no_deploy')}
                  className={`git-mode-btn h-7 px-3 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                    gitResetMode === 'reset_staging_no_deploy'
                      ? 'active bg-amber-500 text-white border-amber-400 font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                      : 'bg-white/5 border-white/10 text-[#94a3b8] hover:text-white hover:bg-white/10'
                  }`}
                  title="Reset Staging branch without deploying"
                >
                  🔄 Reset Staging
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleGitResetMode('reset_main_deploy')}
                  className={`git-mode-btn h-7 px-3 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                    gitResetMode === 'reset_main_deploy'
                      ? 'active bg-emerald-600 text-white border-emerald-500 font-bold shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                      : 'bg-white/5 border-white/10 text-[#94a3b8] hover:text-white hover:bg-white/10'
                  }`}
                  title="Reset Main branch and deploy"
                >
                  🚀 Deploy Main
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleGitResetMode('reset_main_no_deploy')}
                  className={`git-mode-btn h-7 px-3 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                    gitResetMode === 'reset_main_no_deploy'
                      ? 'active bg-amber-500 text-white border-amber-400 font-bold shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                      : 'bg-white/5 border-white/10 text-[#94a3b8] hover:text-white hover:bg-white/10'
                  }`}
                  title="Reset Main branch without deploying"
                >
                  🔄 Reset Main
                </button>
                {gitResetMode !== 'none' && (
                  <button
                    type="button"
                    onClick={() => handleToggleGitResetMode(gitResetMode)}
                    className="text-[10px] text-rose-400 hover:text-rose-300 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 cursor-pointer"
                    title="Clear Git Mode"
                  >
                    ✕ Clear Mode
                  </button>
                )}
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

          {/* Cards Bento Grid */}
          <div className="multi-deploy-grid-bg flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3.5 bg-[#05070c]">
            {filteredServices.map(svc => {
              const eligible = isEligible(svc, targetEnv);
              const isSelected = selectedServices.includes(svc.name);
              const hasSuggest = (svc.ahead || 0) > 0 || (svc.ahead_staging || 0) > 0;

              return (
                <div
                  key={svc.name}
                  onClick={() => toggleSelectService(svc.name, eligible)}
                  className={`multi-service-card group relative p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between select-none ${
                    !eligible
                      ? 'is-disabled opacity-50 border-white/5 bg-black/40 cursor-not-allowed'
                      : isSelected
                      ? 'is-selected border-emerald-500 bg-emerald-500/15 shadow-[0_0_25px_rgba(16,185,129,0.25)] cursor-pointer scale-[1.01]'
                      : 'is-eligible border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-emerald-500/50 hover:shadow-md cursor-pointer'
                  }`}
                >
                  {/* Card Inner Core Highlights */}
                  <div className="flex justify-between items-start gap-1">
                    <span className="service-title font-bold text-xs text-white group-hover:text-emerald-300 transition-colors truncate">
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
                      <span className="service-branch font-mono text-emerald-400 font-semibold truncate">
                        🌿 {svc.branch}
                      </span>
                      {svc.staged_changes ? (
                        <span className="text-[8.5px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.2 rounded-full">
                          Staged: {svc.staged_changes}
                        </span>
                      ) : null}
                    </div>
                    <div className="service-commit text-[10px] text-[#94a3b8] truncate font-sans line-clamp-1">
                      {svc.last_commit || '—'}
                    </div>
                  </div>

                  {/* Selection Indicator Pill */}
                  <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px]">
                    <span className={`font-semibold ${isSelected ? 'text-emerald-400' : 'text-[#94a3b8]'}`}>
                      {isSelected ? '✓ Selected' : eligible ? '' : 'Disabled'}
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
          <div className="multi-deploy-footer px-7 py-4 border-t border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md">
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold rounded-full border border-white/10 bg-white/5 text-[#94a3b8] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
            >
              Cancel
            </button>

            {/* Nested CTA Deploy Button - Always vibrant Green */}
            <button
              type="button"
              disabled={selectedServices.length === 0}
              onClick={handleStartDeploy}
              className="btn-multi-deploy-cta group px-7 py-2.5 text-xs font-bold rounded-full text-white flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 shadow-[0_4px_18px_rgba(16,185,129,0.45)] border border-emerald-400/40 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40 disabled:hover:scale-100"
            >
              <span className="text-white font-bold">
                {gitResetMode === 'reset_staging_no_deploy'
                  ? `Reset Staging Only (${selectedServices.length})`
                  : gitResetMode === 'reset_main_no_deploy'
                  ? `Reset Main Only (${selectedServices.length})`
                  : gitResetMode === 'reset_staging_deploy'
                  ? `Deploy Staging + Reset (${selectedServices.length})`
                  : gitResetMode === 'reset_main_deploy'
                  ? `Deploy Main + Reset (${selectedServices.length})`
                  : `Deploy Selected (${selectedServices.length})`}
              </span>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs group-hover:translate-x-0.5 transition-transform text-white">
                {gitResetMode.includes('no_deploy') ? '🔄' : '🚀'}
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* View 2: Live Multi-Deploy Console Modal (Auto Grid Matrix View) */
        <div className="relative w-[96vw] max-w-[1800px] h-[92vh] max-h-[92vh] bg-[#07090e]/90 border border-white/10 rounded-[1.75rem] shadow-2xl flex flex-col overflow-hidden text-[#f1f5f9]">
          <div className="px-7 py-4 border-b border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-emerald-400">⚡ Live Multi-Deploy Matrix Console</span>
              <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-white font-mono font-bold">
                {deployingServices.length} Total Services
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                ⚡ Worker Pool: Max 5 Concurrent Builds
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetryAllFailed}
                className="px-3.5 py-1.5 text-xs font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full hover:bg-amber-500/30 cursor-pointer transition-all active:scale-95"
              >
                Retry Failed
              </button>

              <button
                type="button"
                onClick={() => setShowConsoleGrid(false)}
                className="px-3.5 py-1.5 text-xs font-semibold bg-white/10 border border-white/10 rounded-full hover:bg-white/20 text-white cursor-pointer transition-all flex items-center gap-1.5 active:scale-95"
              >
                ← Selection View
              </button>

              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/15 text-[#94a3b8] hover:text-white flex items-center justify-center transition-all cursor-pointer">
                ✕
              </button>
            </div>
          </div>

          {/* Dynamic Auto-Layout Grid Matrix */}
          <div className={`flex-1 p-6 ${
            deployingServices.length <= 1
              ? 'grid grid-cols-1 h-full gap-4'
              : deployingServices.length === 2
              ? 'grid grid-cols-1 md:grid-cols-2 h-full gap-4'
              : deployingServices.length === 3
              ? 'grid grid-cols-1 md:grid-cols-3 h-full gap-4'
              : deployingServices.length === 4
              ? 'grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 h-full gap-4'
              : deployingServices.length === 5 || deployingServices.length === 6
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 md:grid-rows-2 h-full gap-4'
              : deployingServices.length <= 8
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 md:grid-rows-2 h-full gap-4'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-[280px] gap-4 overflow-y-auto'
          } bg-[#05070c] overflow-hidden`}>
            {deployingServices.map(name => {
              const item = serviceLogs[name] || { status: 'deploying', log: '' };
              return (
                <div key={name} className="border border-white/10 rounded-2xl bg-[#080b12] flex flex-col overflow-hidden h-full min-h-[220px] shadow-lg transition-all duration-300 hover:border-emerald-500/40">
                  <div className="px-4 py-2.5 bg-black/40 border-b border-white/10 flex justify-between items-center font-mono text-xs shrink-0">
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

                  <pre className="flex-1 p-3.5 font-mono text-[11px] text-[#38bdf8] overflow-y-auto whitespace-pre-wrap leading-relaxed bg-black/30">
                    {item.log || 'Waiting for output logs...'}
                  </pre>
                </div>
              );
            })}
          </div>

          <div className="px-7 py-4 border-t border-white/10 flex justify-between items-center bg-black/40 backdrop-blur-md shrink-0">
            <span className="text-xs text-[#94a3b8]">Press <kbd className="px-2 py-0.5 rounded bg-white/10 font-mono text-white text-[11px]">Esc</kbd> or click button to close console view.</span>
            <button onClick={onClose} className="px-5 py-2 text-xs font-bold rounded-full bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer shadow-lg transition-all active:scale-95">
              Close Console View
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
