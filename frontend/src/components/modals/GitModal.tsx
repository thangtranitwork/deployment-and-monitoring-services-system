import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, Upload, Search, X, FolderGit2, Plus, Minus, RotateCcw, Copy, Check, FileCode, ChevronDown } from 'lucide-react';
import { Service } from '../../types';

interface GitModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedService: Service | null;
  services?: Service[];
  onSelectService?: (service: Service) => void;
}

interface GitFileChange {
  path: string;
  status: string; // 'M' | 'A' | 'D' | '??'
  staged: boolean;
}

export const GitModal: React.FC<GitModalProps> = ({
  isOpen,
  onClose,
  selectedService,
  services = [],
  onSelectService
}) => {
  const [activeTab, setActiveTab] = useState<'branches' | 'commits' | 'stash' | 'changes'>('branches');
  const [branchSearch, setBranchSearch] = useState<string>('');

  // Data states
  const [branches, setBranches] = useState<any[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [stashes, setStashes] = useState<any[]>([]);
  const [changes, setChanges] = useState<{ staged: GitFileChange[]; unstaged: GitFileChange[] }>({
    staged: [],
    unstaged: []
  });

  // Action & Diff states
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [selectedFileDiff, setSelectedFileDiff] = useState<string>('');
  const [diffLoading, setDiffLoading] = useState<boolean>(false);
  const [commitMsg, setCommitMsg] = useState<string>('');
  const [stashMsg, setStashMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('');
  const [copiedDiff, setCopiedDiff] = useState<boolean>(false);

  const targetService = selectedService || (services.length > 0 ? services[0] : null);
  const serviceName = targetService?.name || '';

  const loadGitData = async () => {
    if (!serviceName) return;
    setLoading(true);
    try {
      if (activeTab === 'branches') {
        const bRes = await fetch(`/api/git/branches/${encodeURIComponent(serviceName)}`);
        if (bRes.ok) {
          const bData = await bRes.json();
          const bList = Array.isArray(bData) ? bData : (bData.branches || []);
          setBranches(bList);
        }
      } else if (activeTab === 'commits') {
        const cRes = await fetch(`/api/git/commits/${encodeURIComponent(serviceName)}`);
        if (cRes.ok) {
          const cData = await cRes.json();
          const cList = Array.isArray(cData) ? cData : (cData.commits || []);
          setCommits(cList);
        }
      } else if (activeTab === 'stash') {
        const sRes = await fetch(`/api/git/stash/${encodeURIComponent(serviceName)}`);
        if (sRes.ok) {
          const sData = await sRes.json();
          const sList = Array.isArray(sData) ? sData : (sData.stashes || []);
          setStashes(sList);
        }
      } else if (activeTab === 'changes') {
        const chRes = await fetch(`/api/git/changes/${encodeURIComponent(serviceName)}`);
        if (chRes.ok) {
          const chData = await chRes.json();
          const list: GitFileChange[] = Array.isArray(chData) ? chData : (chData.changes || []);
          const staged = list.filter(item => item.staged);
          const unstaged = list.filter(item => !item.staged);
          setChanges({ staged, unstaged });

          // Auto inspect first file diff if available
          if (!selectedFile && list.length > 0) {
            handleViewFileDiff(list[0].path, list[0].staged, list[0].status === '??');
          }
        }
      }
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && serviceName) {
      loadGitData();
    }
  }, [isOpen, serviceName, activeTab]);

  if (!isOpen) return null;

  // --- Top Action Handlers ---
  const handleFetch = async () => {
    setActionLoading('fetch');
    setStatusText('Fetching remotes...');
    try {
      const res = await fetch(`/api/git/fetch/${encodeURIComponent(serviceName)}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatusText('✅ Fetch successful!');
        loadGitData();
      } else {
        setStatusText(`❌ Fetch failed: ${data.error || res.statusText}`);
      }
    } catch (e: any) {
      setStatusText(`❌ Error: ${e.message}`);
    } finally {
      setActionLoading('');
    }
  };

  const handlePull = async () => {
    setActionLoading('pull');
    setStatusText('Pulling changes...');
    try {
      const res = await fetch(`/api/git/pull/${encodeURIComponent(serviceName)}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatusText('✅ Pull successful!');
        loadGitData();
      } else {
        setStatusText(`❌ Pull failed: ${data.error || res.statusText}`);
      }
    } catch (e: any) {
      setStatusText(`❌ Error: ${e.message}`);
    } finally {
      setActionLoading('');
    }
  };

  const handlePush = async () => {
    setActionLoading('push');
    setStatusText('Pushing commits...');
    try {
      const res = await fetch(`/api/git/push/${encodeURIComponent(serviceName)}`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setStatusText('✅ Push successful!');
        loadGitData();
      } else {
        setStatusText(`❌ Push failed: ${data.error || res.statusText}`);
      }
    } catch (e: any) {
      setStatusText(`❌ Error: ${e.message}`);
    } finally {
      setActionLoading('');
    }
  };

  // --- Branch Handlers ---
  const handleCheckout = async (branchName: string) => {
    let clean = branchName.trim();
    if (clean.startsWith('remotes/origin/')) clean = clean.replace('remotes/origin/', '');
    else if (clean.startsWith('origin/')) clean = clean.replace('origin/', '');

    setStatusText(`Checking out branch [${clean}]...`);
    try {
      const res = await fetch(`/api/git/checkout/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: clean })
      });
      if (res.ok) {
        setStatusText(`✅ Switched to branch [${clean}]`);
        loadGitData();
      } else {
        const err = await res.text();
        setStatusText(`❌ Checkout failed: ${err}`);
      }
    } catch (e: any) {
      setStatusText(`❌ Error: ${e.message}`);
    }
  };

  const handleMergeBranch = async (branchName: string) => {
    if (!confirm(`Merge branch [${branchName}] into current branch?`)) return;
    setStatusText(`Merging branch [${branchName}]...`);
    try {
      const res = await fetch(`/api/git/merge/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch: branchName })
      });
      if (res.ok) {
        setStatusText(`✅ Merged branch [${branchName}] successfully!`);
        loadGitData();
      } else {
        const err = await res.text();
        setStatusText(`❌ Merge failed: ${err}`);
      }
    } catch (e: any) {
      setStatusText(`❌ Error: ${e.message}`);
    }
  };

  const handleCreateBranchFrom = async (baseRef: string) => {
    const newName = prompt(`Create new branch based on [${baseRef}]:`);
    if (!newName || !newName.trim()) return;

    setStatusText(`Creating branch [${newName.trim()}] from [${baseRef}]...`);
    try {
      const res = await fetch(`/api/git/create-branch/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), from: baseRef })
      });
      if (res.ok) {
        setStatusText(`✅ Created and checked out branch [${newName.trim()}]!`);
        loadGitData();
      } else {
        const err = await res.text();
        setStatusText(`❌ Create branch failed: ${err}`);
      }
    } catch (e: any) {
      setStatusText(`❌ Error: ${e.message}`);
    }
  };

  // --- Stash Handlers ---
  const handleStashPush = async () => {
    setStatusText('Saving stash...');
    try {
      const res = await fetch(`/api/git/stash-push/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: stashMsg })
      });
      if (res.ok) {
        setStatusText('✅ Stash saved!');
        setStashMsg('');
        loadGitData();
      } else {
        const err = await res.text();
        setStatusText(`❌ Stash failed: ${err}`);
      }
    } catch (e: any) {
      setStatusText(`❌ Error: ${e.message}`);
    }
  };

  const handleStashPop = async (idx: number = 0) => {
    setStatusText(`Popping stash #${idx}...`);
    try {
      const res = await fetch(`/api/git/stash-pop/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: idx })
      });
      if (res.ok) {
        setStatusText('✅ Stash popped!');
        loadGitData();
      } else {
        const err = await res.text();
        setStatusText(`❌ Stash pop failed: ${err}`);
      }
    } catch (e: any) {
      setStatusText(`❌ Error: ${e.message}`);
    }
  };

  // --- Changes & Staging Handlers ---
  const handleStageFile = async (filePath: string) => {
    try {
      await fetch(`/api/git/stage/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: filePath })
      });
      loadGitData();
    } catch (e) {}
  };

  const handleUnstageFile = async (filePath: string) => {
    try {
      await fetch(`/api/git/unstage/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: filePath })
      });
      loadGitData();
    } catch (e) {}
  };

  const handleDiscardFile = async (filePath: string) => {
    if (!confirm(`Discard all changes in ${filePath}?`)) return;
    try {
      await fetch(`/api/git/discard/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: filePath })
      });
      loadGitData();
    } catch (e) {}
  };

  const handleStageAll = () => handleStageFile('.');
  const handleUnstageAll = () => handleUnstageFile('.');
  const handleDiscardAll = () => handleDiscardFile('.');

  const handleCommit = async () => {
    if (!commitMsg.trim()) return;
    setStatusText('Creating commit...');
    try {
      const res = await fetch(`/api/git/commit/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: commitMsg })
      });
      if (res.ok) {
        setStatusText('✅ Commit created!');
        setCommitMsg('');
        loadGitData();
      } else {
        const err = await res.text();
        setStatusText(`❌ Commit failed: ${err}`);
      }
    } catch (e: any) {
      setStatusText(`❌ Error: ${e.message}`);
    }
  };

  const handleViewFileDiff = async (filePath: string, staged: boolean, untracked: boolean) => {
    setSelectedFile(filePath);
    setDiffLoading(true);
    try {
      const res = await fetch(
        `/api/git/diff/${encodeURIComponent(serviceName)}?file_path=${encodeURIComponent(filePath)}&staged=${staged}&untracked=${untracked}`
      );
      if (res.ok) {
        const data = await res.json();
        setSelectedFileDiff(data.diff || data.output || 'No diff content available.');
      } else {
        setSelectedFileDiff('No line diff changes detected for this file.');
      }
    } catch (e) {
      setSelectedFileDiff('Failed to fetch file diff.');
    } finally {
      setDiffLoading(false);
    }
  };

  const copyDiffToClipboard = () => {
    if (!selectedFileDiff) return;
    navigator.clipboard.writeText(selectedFileDiff);
    setCopiedDiff(true);
    setTimeout(() => setCopiedDiff(false), 2000);
  };

  // Filter branches based on search
  const filteredBranches = branches.filter(b => {
    const bName = typeof b === 'string' ? b : (b.name || '');
    return bName.toLowerCase().includes(branchSearch.toLowerCase());
  });

  return (
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#090c15] border border-white/10 rounded-3xl w-[94vw] max-w-[1400px] h-[88vh] max-h-[900px] flex flex-col shadow-2xl overflow-hidden text-white font-sans">
        
        {/* Sleek Custom Header Bar */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#060810]/95 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-bold text-xs tracking-widest uppercase text-[#94a3b8]">
              <span className="text-emerald-400">GIT</span> MANAGEMENT
            </div>

            {/* Upstream Status Badge */}
            <span className="text-[10px] text-[#94a3b8] font-mono flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full shadow-sm">
              Upstream: <strong className="text-emerald-400 font-bold">✓</strong>
            </span>

            {/* Sleek Borderless Custom Service Selector */}
            {services.length > 0 && (
              <div className="relative flex items-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3.5 py-1 transition-all cursor-pointer">
                <FolderGit2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mr-2" />
                <select
                  value={serviceName}
                  onChange={(e) => {
                    const found = services.find((s) => s.name === e.target.value);
                    if (found && onSelectService) onSelectService(found);
                  }}
                  className="bg-transparent text-xs font-bold text-emerald-400 font-mono outline-none focus:outline-none border-none appearance-none pr-5 cursor-pointer shadow-none ring-0"
                >
                  {services.map((s) => (
                    <option key={s.name} value={s.name} className="bg-white text-slate-800 dark:bg-[#0b0e17] dark:text-white">
                      {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-emerald-400 pointer-events-none absolute right-3" />
              </div>
            )}
          </div>

          {/* Action Buttons: Fetch, Pull, Push */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleFetch}
              disabled={actionLoading === 'fetch'}
              className="px-4 py-1.5 text-xs font-semibold rounded-full border border-white/10 bg-white/5 hover:bg-white/15 text-white flex items-center gap-1.5 cursor-pointer transition-all outline-none focus:outline-none"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading === 'fetch' ? 'animate-spin' : ''}`} /> Fetch
            </button>
            <button
              type="button"
              onClick={handlePull}
              disabled={actionLoading === 'pull'}
              className="px-4 py-1.5 text-xs font-bold rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-all outline-none focus:outline-none"
            >
              <Download className="w-3.5 h-3.5" /> Pull
            </button>
            <button
              type="button"
              onClick={handlePush}
              disabled={actionLoading === 'push'}
              className="px-4 py-1.5 text-xs font-bold rounded-full bg-teal-500 hover:bg-teal-600 text-white flex items-center gap-1.5 cursor-pointer shadow-md transition-all outline-none focus:outline-none"
            >
              <Upload className="w-3.5 h-3.5" /> Push
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-[#94a3b8] hover:text-white cursor-pointer ml-2 transition-all outline-none focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar & Clean Search Box */}
        <div className="px-6 py-3 border-b border-white/10 bg-black/20 flex justify-between items-center shrink-0">
          <div className="flex gap-2">
            {[
              { id: 'branches', label: 'Branches (Q)', count: branches.length },
              { id: 'commits', label: 'Commits (W)', count: commits.length },
              { id: 'stash', label: 'Stashes (E)', count: stashes.length },
              { id: 'changes', label: 'Changes (C)', count: changes.staged.length + changes.unstaged.length }
            ].map(t => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer outline-none focus:outline-none ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-white/5 text-[#94a3b8] hover:text-white hover:bg-white/10'
                  }`}
                >
                  {t.label}
                  {t.count > 0 && <span className="ml-1.5 opacity-80 text-[10px]">({t.count})</span>}
                </button>
              );
            })}
          </div>

          {/* Search branches input with no ugly outlines */}
          {activeTab === 'branches' && (
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={branchSearch}
                onChange={e => setBranchSearch(e.target.value)}
                placeholder="Search branches..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-black/40 border border-white/10 rounded-full text-white focus:border-emerald-500 font-mono outline-none focus:outline-none transition-all"
              />
            </div>
          )}
        </div>

        {/* Status Message Bar */}
        {statusText && (
          <div className="px-6 py-2 bg-emerald-500/10 border-b border-emerald-500/30 text-xs font-mono text-emerald-400 shrink-0">
            {statusText}
          </div>
        )}

        {/* Content Workspace Panel */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-[#05070d]">
          {/* Tab 1: Branches matching Image 1 */}
          {activeTab === 'branches' && (
            <div className="space-y-2.5">
              {loading ? (
                <div className="p-8 text-center text-xs font-mono text-[#94a3b8]">Loading branches...</div>
              ) : filteredBranches.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-[#94a3b8]">No branches found.</div>
              ) : (
                filteredBranches.map((b, idx) => {
                  const bName = typeof b === 'string' ? b : (b.name || '');
                  const isCurrent = typeof b === 'string' ? b.startsWith('*') : (b.is_current || b.current || bName === targetService?.branch);
                  const cleanBranch = bName.replace('*', '').trim();

                  const aheadStg = b.ahead_staging ?? 0;
                  const behindStg = b.behind_staging ?? 0;
                  const hasStg = b.has_staging ?? true;

                  return (
                    <div
                      key={idx}
                      className={`flex justify-between items-center p-3.5 px-5 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-white shadow-sm'
                          : 'bg-black/40 border-white/10 hover:border-white/20 text-[#f1f5f9]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-mono text-xs font-bold ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                          {cleanBranch}
                        </span>

                        {!isCurrent && hasStg && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-white/5 border border-white/10 flex items-center gap-1.5 text-[#94a3b8]">
                            <span className="font-bold text-[9px] uppercase tracking-wider">STG</span>
                            {aheadStg === 0 && behindStg === 0 ? (
                              <span className="text-emerald-400 font-bold">✓</span>
                            ) : (
                              <>
                                {aheadStg > 0 && <span className="text-emerald-400 font-bold">+{aheadStg}</span>}
                                {behindStg > 0 && <span className="text-rose-400 font-bold">-{behindStg}</span>}
                              </>
                            )}
                          </span>
                        )}
                      </div>

                      {isCurrent ? (
                        <span className="px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500 text-white shadow-sm">
                          ACTIVE
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleMergeBranch(cleanBranch)}
                            className="px-3.5 py-1 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white cursor-pointer shadow-sm transition-all outline-none focus:outline-none"
                          >
                            Merge
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCreateBranchFrom(cleanBranch)}
                            className="px-3.5 py-1 text-xs font-semibold rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 text-white cursor-pointer transition-all outline-none focus:outline-none"
                          >
                            New Branch
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCheckout(cleanBranch)}
                            className="px-3.5 py-1 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 text-white cursor-pointer transition-all outline-none focus:outline-none"
                          >
                            Checkout
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tab 2: Commits */}
          {activeTab === 'commits' && (
            <div className="space-y-3">
              {commits.map((c, i) => (
                <div key={i} className="p-3.5 px-5 rounded-2xl bg-black/40 border border-white/10 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">{c.hash || c.id}</span>
                      {c.is_unpushed && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-teal-500/20 text-teal-400 border border-teal-500/30">
                          UNPUSHED
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleCreateBranchFrom(c.hash || c.id)}
                        className="px-3 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer outline-none focus:outline-none"
                      >
                        + Branch
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCheckout(c.hash || c.id)}
                        className="px-3 py-1 text-[11px] font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer outline-none focus:outline-none"
                      >
                        Checkout
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-white leading-relaxed">{c.subject || c.message}</div>
                  <div className="text-[10px] text-[#94a3b8] font-mono">{c.author} • {c.date}</div>
                </div>
              ))}
            </div>
          )}

          {/* Tab 3: Stashes */}
          {activeTab === 'stash' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={stashMsg}
                  onChange={e => setStashMsg(e.target.value)}
                  placeholder="Stash message / description..."
                  className="flex-1 p-3 text-xs bg-black/50 border border-white/10 rounded-xl text-white font-mono outline-none focus:outline-none focus:border-emerald-500 transition-all"
                />
                <button type="button" onClick={handleStashPush} className="px-5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md cursor-pointer outline-none focus:outline-none">
                  Save Stash
                </button>
                <button type="button" onClick={() => handleStashPop(0)} disabled={stashes.length === 0} className="px-5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black rounded-xl shadow-md disabled:opacity-50 cursor-pointer outline-none focus:outline-none">
                  Pop Latest Stash
                </button>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-[#94a3b8] uppercase">Active Git Stashes ({stashes.length})</div>
                {stashes.map((s, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3.5 px-5 rounded-2xl bg-black/40 border border-white/10 font-mono text-xs text-white">
                    <span>📁 {typeof s === 'string' ? s : s.message}</span>
                    <button type="button" onClick={() => handleStashPop(idx)} className="px-3 py-1 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg cursor-pointer outline-none focus:outline-none">
                      Pop Stash
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 4: Changes / Source Control */}
          {activeTab === 'changes' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full min-h-0">
              {/* Left Column: Staged and Unstaged Files List */}
              <div className="space-y-5 flex flex-col h-full min-h-0 overflow-y-auto pr-1">
                {/* Staged Changes Section */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 shrink-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                      <span>STAGED CHANGES ({changes.staged.length})</span>
                    </span>
                    {changes.staged.length > 0 && (
                      <button
                        type="button"
                        onClick={handleUnstageAll}
                        className="px-2.5 py-1 text-[11px] font-bold text-amber-400 hover:bg-amber-500/10 rounded-lg border border-amber-500/30 flex items-center gap-1 cursor-pointer outline-none focus:outline-none"
                      >
                        <Minus className="w-3 h-3" /> Unstage All
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {changes.staged.length === 0 ? (
                      <div className="p-3 text-xs text-[#94a3b8] italic font-mono bg-white/[0.02] rounded-xl border border-white/5">
                        No staged changes. Click ➕ on an unstaged file to stage.
                      </div>
                    ) : (
                      changes.staged.map((f, idx) => {
                        const isSelected = selectedFile === f.path;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleViewFileDiff(f.path, true, f.status === '??')}
                            className={`flex justify-between items-center p-2.5 px-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected ? 'bg-emerald-500/20 border-emerald-500/50 text-white' : 'bg-black/30 border-white/5 hover:bg-white/5 text-[#f1f5f9]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <span className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center ${
                                f.status === 'M' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                f.status === 'A' || f.status === '??' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}>
                                {f.status === '??' ? 'U' : f.status}
                              </span>
                              <span className="text-xs font-mono font-medium truncate" title={f.path}>{f.path}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleUnstageFile(f.path); }}
                              className="p-1 rounded text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer border-none outline-none"
                              title="Unstage File"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Unstaged Changes Section */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 shrink-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <span>UNSTAGED / UNTRACKED CHANGES ({changes.unstaged.length})</span>
                    </span>
                    {changes.unstaged.length > 0 && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleStageAll}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-lg border border-emerald-500/30 flex items-center gap-1 cursor-pointer outline-none focus:outline-none"
                        >
                          <Plus className="w-3 h-3" /> Stage All
                        </button>
                        <button
                          type="button"
                          onClick={handleDiscardAll}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-400 hover:bg-rose-500/10 rounded-lg border border-rose-500/30 flex items-center gap-1 cursor-pointer outline-none focus:outline-none"
                        >
                          <RotateCcw className="w-3 h-3" /> Discard All
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                    {changes.unstaged.length === 0 ? (
                      <div className="p-3 text-xs text-[#94a3b8] italic font-mono bg-white/[0.02] rounded-xl border border-white/5">
                        No modified or untracked files detected in working tree.
                      </div>
                    ) : (
                      changes.unstaged.map((f, idx) => {
                        const isSelected = selectedFile === f.path;
                        return (
                          <div
                            key={idx}
                            onClick={() => handleViewFileDiff(f.path, false, f.status === '??')}
                            className={`flex justify-between items-center p-2.5 px-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected ? 'bg-amber-500/20 border-amber-500/50 text-white' : 'bg-black/30 border-white/5 hover:bg-white/5 text-[#f1f5f9]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <span className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center ${
                                f.status === 'M' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                f.status === 'A' || f.status === '??' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}>
                                {f.status === '??' ? 'U' : f.status}
                              </span>
                              <span className="text-xs font-mono font-medium truncate" title={f.path}>{f.path}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleStageFile(f.path); }}
                                className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer border-none outline-none"
                                title="Stage File"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDiscardFile(f.path); }}
                                className="p-1 rounded text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer border-none outline-none"
                                title="Discard Changes"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Commit Box Section */}
                <div className="bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3 shrink-0 mt-auto">
                  <textarea
                    value={commitMsg}
                    onChange={e => setCommitMsg(e.target.value)}
                    rows={2}
                    placeholder="Enter commit message..."
                    className="w-full p-3 text-xs bg-black/50 border border-white/10 rounded-xl text-white font-mono focus:border-emerald-500 leading-relaxed resize-none outline-none focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleCommit}
                    disabled={!commitMsg.trim() || changes.staged.length === 0}
                    className="w-full py-2.5 text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl disabled:opacity-40 cursor-pointer shadow-md transition-all flex items-center justify-center gap-2 outline-none focus:outline-none"
                  >
                    🚀 Commit Staged Changes ({changes.staged.length})
                  </button>
                </div>
              </div>

              {/* Right Column: File Diff Inspector */}
              <div className="border border-white/10 rounded-2xl bg-black/50 overflow-hidden flex flex-col h-full min-h-0">
                <div className="px-4 py-3 bg-white/5 border-b border-white/10 font-mono text-xs flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileCode className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-emerald-400 font-bold truncate">
                      {selectedFile ? selectedFile : 'No file selected'}
                    </span>
                  </div>
                  {selectedFileDiff && (
                    <button
                      type="button"
                      onClick={copyDiffToClipboard}
                      className="px-3 py-1 text-[11px] font-bold rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 cursor-pointer border border-white/10 shrink-0 outline-none focus:outline-none transition-all"
                    >
                      {copiedDiff ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      {copiedDiff ? 'Copied Diff' : 'Copy Diff'}
                    </button>
                  )}
                </div>

                <div className="flex-1 p-4 font-mono text-xs overflow-y-auto m-0 leading-relaxed whitespace-pre-wrap">
                  {diffLoading ? (
                    <div className="flex items-center justify-center h-full text-[#94a3b8]">
                      ⚡ Loading line diff...
                    </div>
                  ) : !selectedFileDiff ? (
                    <div className="flex items-center justify-center h-full text-[#94a3b8] text-center p-6">
                      Click on any staged or modified file on the left to inspect its line-by-line diff.
                    </div>
                  ) : (
                    selectedFileDiff.split('\n').map((line, idx) => {
                      const isAdd = line.startsWith('+');
                      const isDel = line.startsWith('-');
                      const isHeader = line.startsWith('@@') || line.startsWith('diff --git');
                      return (
                        <div
                          key={idx}
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            isAdd ? 'bg-emerald-500/15 text-emerald-400 font-bold' :
                            isDel ? 'bg-rose-500/15 text-rose-400 font-bold' :
                            isHeader ? 'text-[#38bdf8] font-bold' :
                            'text-[#94a3b8]'
                          }`}
                        >
                          {line}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
