import React, { useState, useEffect } from 'react';
import { RefreshCw, Zap, ChevronDown, ChevronRight, Search, GitBranch, AlertTriangle, CheckCircle2, FileText, GitCommit, RotateCcw } from 'lucide-react';
import { Service } from '../../types';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenMultiDeploy?: () => void;
  services?: Service[];
}

interface CompareCommit {
  hash: string;
  subject: string;
  author: string;
  date: string;
}

interface CompareFile {
  path: string;
  status: string; // 'Modified' | 'Added' | 'Deleted' | 'Renamed'
}

interface CompareResultItem {
  name: string;
  local_branch: string;
  target_branch?: string;
  ahead?: number;
  behind?: number;
  commits?: CompareCommit[];
  files?: CompareFile[];
  error?: string;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  onOpenMultiDeploy
}) => {
  const [targetBranch, setTargetBranch] = useState<string>('origin/staging');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [restoreOriginalBranch, setRestoreOriginalBranch] = useState<boolean>(true);
  const [results, setResults] = useState<CompareResultItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [updatingStaging, setUpdatingStaging] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const fetchComparison = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/git/compare-all?target=${encodeURIComponent(targetBranch)}`);
      if (res.ok) {
        const data = await res.json();
        const list: CompareResultItem[] = Array.isArray(data) ? data : (data.results || []);
        setResults(list);

        // Auto expand cards with diffs
        const autoExpanded: Record<string, boolean> = {};
        list.forEach(item => {
          const hasCommits = (item.commits && item.commits.length > 0);
          const hasFiles = (item.files && item.files.length > 0);
          if ((hasCommits || hasFiles) && !item.error) {
            autoExpanded[item.name] = true;
          }
        });
        setExpandedMap(autoExpanded);
      }
    } catch (e) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchComparison();
    }
  }, [isOpen, targetBranch]);

  if (!isOpen) return null;

  const toggleExpand = (name: string) => {
    setExpandedMap(prev => ({
      ...prev,
      [name]: !prev[name]
    }));
  };

  // Helper to fetch current active branch name
  const getCurrentBranch = async (serviceName: string): Promise<string> => {
    try {
      const res = await fetch(`/api/git/branches/${encodeURIComponent(serviceName)}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.branches || []);
        for (const b of list) {
          if (typeof b === 'string' && b.startsWith('*')) {
            return b.replace('*', '').trim();
          } else if (typeof b === 'object' && (b.is_current || b.current)) {
            return (b.name || '').replace('*', '').trim();
          }
        }
      }
    } catch (e) {}
    return '';
  };

  // Single service update staging with optional auto-restore
  const handleUpdateStagingSingle = async (serviceName: string) => {
    setUpdatingStaging(serviceName);
    setStatusMsg(`Checking out & pulling staging for ${serviceName}...`);
    try {
      const origBranch = await getCurrentBranch(serviceName);

      // 1. Stash changes if any
      await fetch(`/api/git/stash-push/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Auto stash before staging update' })
      });

      // 2. Checkout staging
      await fetch(`/api/git/checkout/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: 'staging' })
      });

      // 3. Pull origin/staging
      await fetch(`/api/git/pull/${encodeURIComponent(serviceName)}`, {
        method: 'POST'
      });

      // 4. Restore original branch if option enabled
      if (restoreOriginalBranch && origBranch && origBranch !== 'staging' && origBranch !== 'HEAD') {
        setStatusMsg(`Restoring ${serviceName} back to original branch [${origBranch}]...`);
        await fetch(`/api/git/checkout/${encodeURIComponent(serviceName)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branch: origBranch })
        });
        await fetch(`/api/git/stash-pop/${encodeURIComponent(serviceName)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index: 0 })
        });
        setStatusMsg(`✅ Staging updated & restored back to [${origBranch}]!`);
      } else {
        setStatusMsg(`✅ ${serviceName} updated to staging branch!`);
      }

      await fetchComparison();
    } catch (e: any) {
      setStatusMsg(`❌ Error updating ${serviceName}: ${e.message}`);
    } finally {
      setUpdatingStaging('');
    }
  };

  // All services update staging handler
  const handleUpdateStagingAll = async () => {
    if (!confirm("Checkout 'staging', pull origin/staging, and restore original branches for all services?")) return;
    setUpdatingStaging('all');
    setStatusMsg("Updating all services to staging...");
    try {
      for (const item of results) {
        const origBranch = await getCurrentBranch(item.name);

        await fetch(`/api/git/stash-push/${encodeURIComponent(item.name)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: 'Auto stash before staging update' })
        });

        await fetch(`/api/git/checkout/${encodeURIComponent(item.name)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branch: 'staging' })
        });

        await fetch(`/api/git/pull/${encodeURIComponent(item.name)}`, {
          method: 'POST'
        });

        if (restoreOriginalBranch && origBranch && origBranch !== 'staging' && origBranch !== 'HEAD') {
          await fetch(`/api/git/checkout/${encodeURIComponent(item.name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ branch: origBranch })
          });
          await fetch(`/api/git/stash-pop/${encodeURIComponent(item.name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ index: 0 })
          });
        }
      }
      setStatusMsg(restoreOriginalBranch ? "✅ All services updated staging & restored to original branches!" : "✅ All services updated to staging branch!");
      await fetchComparison();
    } catch (e: any) {
      setStatusMsg(`❌ Error updating services: ${e.message}`);
    } finally {
      setUpdatingStaging('');
    }
  };

  // Filter results by search query
  const filteredResults = results.filter(item => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      item.name.toLowerCase().includes(q) ||
      (item.local_branch && item.local_branch.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#090c15] border border-white/10 rounded-3xl w-[94vw] max-w-6xl h-[88vh] max-h-[900px] flex flex-col shadow-2xl overflow-hidden text-white font-sans">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#060810]/95 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 font-bold text-sm text-white tracking-wide">
            <span>🔍 Workspace Branch Comparison</span>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-[#94a3b8] hover:text-white transition-all cursor-pointer"
            title="Close Modal"
          >
            ✕
          </button>
        </div>

        {/* Subheader Toolbar with Search Bar & Update Staging Actions */}
        <div className="px-6 py-3 border-b border-white/10 bg-black/30 flex justify-between items-center flex-wrap gap-3 shrink-0">
          {/* Search Service Input */}
          <div className="relative flex items-center min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search service name or branch..."
              className="w-full text-xs pl-9 pr-7 py-1.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-[#94a3b8]/60 focus:outline-none focus:border-emerald-500 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2.5 text-xs text-[#94a3b8] hover:text-white">✕</button>
            )}
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Auto Restore Checkbox Toggle */}
            <label className="flex items-center gap-1.5 text-[11px] text-[#94a3b8] cursor-pointer select-none bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl hover:bg-white/10 transition-all">
              <input
                type="checkbox"
                checked={restoreOriginalBranch}
                onChange={(e) => setRestoreOriginalBranch(e.target.checked)}
                className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
              />
              <RotateCcw className="w-3 h-3 text-emerald-400" />
              <span>Restore original branch</span>
            </label>

            <button
              type="button"
              onClick={handleUpdateStagingAll}
              disabled={updatingStaging !== ''}
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-sm"
              title="Checkout 'staging', pull origin/staging and restore original branch"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${updatingStaging === 'all' ? 'animate-spin' : ''}`} />
              {updatingStaging === 'all' ? 'Updating Staging...' : '🔄 Cập nhật Staging (All)'}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#94a3b8]">Comparison Target:</span>
              <select
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="origin/staging" className="bg-[#0b0e17] text-white">origin/staging</option>
                <option value="staging" className="bg-[#0b0e17] text-white">staging</option>
                <option value="origin/master" className="bg-[#0b0e17] text-white">origin/master</option>
                <option value="origin/main" className="bg-[#0b0e17] text-white">origin/main</option>
                <option value="master" className="bg-[#0b0e17] text-white">master</option>
                <option value="main" className="bg-[#0b0e17] text-white">main</option>
              </select>
            </div>

            <button
              type="button"
              onClick={fetchComparison}
              disabled={loading}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Real-time Action Status Notification Bar */}
        {statusMsg && (
          <div className="px-6 py-2 bg-emerald-500/10 border-b border-emerald-500/30 text-xs font-mono text-emerald-400 flex justify-between items-center shrink-0">
            <span>{statusMsg}</span>
            <button onClick={() => setStatusMsg('')} className="text-[#94a3b8] hover:text-white text-xs">✕</button>
          </div>
        )}

        {/* Services Comparison Accordion List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#05070d]">
          {loading && results.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-[#94a3b8] flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
              Comparing branch differences across workspace...
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="p-12 text-center text-xs font-mono text-[#94a3b8]">
              {searchQuery ? `No services matching "${searchQuery}"` : 'No services found in workspace.'}
            </div>
          ) : (
            filteredResults.map((item) => {
              const commits = item.commits || [];
              const files = item.files || [];
              const hasDiff = commits.length > 0 || files.length > 0;
              const hasError = !!item.error;
              const isExpanded = !!expandedMap[item.name];
              const isUpdating = updatingStaging === item.name;

              return (
                <div
                  key={item.name}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden bg-black/40 ${
                    hasDiff
                      ? 'border-emerald-500/40 shadow-sm'
                      : 'border-white/10'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    onClick={() => toggleExpand(item.name)}
                    className="p-4 px-5 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-all select-none"
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-bold text-sm text-white flex items-center gap-2">
                        📦 {item.name}
                      </span>
                      <span className="text-[11px] font-mono text-[#94a3b8] bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
                        branch: <span className="text-emerald-400 font-bold">{item.local_branch || 'unknown'}</span>
                      </span>

                      {/* Single Service Update Staging Action Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStagingSingle(item.name);
                        }}
                        disabled={isUpdating}
                        className="px-2.5 py-1 text-[10.5px] font-semibold rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 flex items-center gap-1 cursor-pointer transition-all active:scale-95 ml-1"
                        title={`Checkout 'staging', pull origin/staging and restore original branch`}
                      >
                        <RefreshCw className={`w-3 h-3 ${isUpdating ? 'animate-spin' : ''}`} />
                        {isUpdating ? 'Updating...' : 'Cập nhật Staging'}
                      </button>

                      {hasError && (
                        <span className="text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Target branch {targetBranch} not found
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {!hasError && hasDiff ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono">
                            {commits.length} ahead
                          </span>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/40 font-mono">
                            {files.length} files
                          </span>
                        </div>
                      ) : !hasError ? (
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Up-to-date
                        </span>
                      ) : null}

                      <span className="text-[#94a3b8]">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Content Body */}
                  {isExpanded && (
                    <div className="p-5 border-t border-white/10 bg-black/60 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column: Commits */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-white/10 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <GitCommit className="w-3.5 h-3.5" /> COMMITS TO BE DEPLOYED
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white font-mono text-[10px]">
                            {commits.length}
                          </span>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {commits.length === 0 ? (
                            <div className="p-4 text-center text-xs text-[#94a3b8] font-mono">
                              No un-deployed commits found.
                            </div>
                          ) : (
                            commits.map((c, idx) => (
                              <div key={idx} className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
                                <div className="flex justify-between items-center font-mono text-[11px]">
                                  <span className="font-bold text-emerald-400">{c.hash}</span>
                                  <span className="text-[10px] text-[#94a3b8]">{c.date}</span>
                                </div>
                                <div className="font-semibold text-white truncate">{c.subject}</div>
                                <div className="text-[10px] text-[#94a3b8]">by {c.author}</div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Right Column: Changed Files */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center pb-2 border-b border-white/10 text-xs font-bold text-sky-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> CHANGED FILES
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white font-mono text-[10px]">
                            {files.length}
                          </span>
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                          {files.length === 0 ? (
                            <div className="p-4 text-center text-xs text-[#94a3b8] font-mono">
                              No changed files.
                            </div>
                          ) : (
                            files.map((f, idx) => {
                              const isAdd = f.status === 'Added';
                              const isDel = f.status === 'Deleted';
                              return (
                                <div key={idx} className="p-2.5 px-3 rounded-xl bg-white/5 border border-white/10 text-xs flex justify-between items-center font-mono">
                                  <span className="truncate text-white flex-1 mr-2" title={f.path}>{f.path}</span>
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${
                                    isAdd ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                    isDel ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                    'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  }`}>
                                    {f.status || 'MODIFIED'}
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-[#060810]/95 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-xl border border-white/10 bg-white/5 text-[#94a3b8] hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            Close
          </button>

          {onOpenMultiDeploy && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenMultiDeploy();
              }}
              className="px-6 py-2 text-xs font-bold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-2 cursor-pointer shadow-lg transition-all active:scale-95"
            >
              <Zap className="w-4 h-4 fill-white" /> Go to Multi Deploy
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
