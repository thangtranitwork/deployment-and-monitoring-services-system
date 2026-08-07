import React, { useState, useEffect } from 'react';
import { GitBranch, Archive, GitCommit, RefreshCw, FolderGit2 } from 'lucide-react';
import { Service } from '../../types';

interface GitModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedService: Service | null;
  services?: Service[];
  onSelectService?: (service: Service) => void;
}

export const GitModal: React.FC<GitModalProps> = ({
  isOpen,
  onClose,
  selectedService,
  services = [],
  onSelectService
}) => {
  const [activeTab, setActiveTab] = useState<'branches' | 'stash' | 'staging'>('branches');
  const [branches, setBranches] = useState<any[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [stashes, setStashes] = useState<any[]>([]);
  const [changes, setChanges] = useState<{ staged: string[]; unstaged: string[]; untracked: string[] }>({
    staged: [],
    unstaged: [],
    untracked: []
  });
  const [selectedFileDiff, setSelectedFileDiff] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [commitMsg, setCommitMsg] = useState<string>('');
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [stashMsg, setStashMsg] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('');

  const targetService = selectedService || (services.length > 0 ? services[0] : null);
  const serviceName = targetService?.name || 'deploy-tool';

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
      } else if (activeTab === 'staging') {
        const chRes = await fetch(`/api/git/changes/${encodeURIComponent(serviceName)}`);
        if (chRes.ok) {
          const chData = await chRes.json();
          setChanges({
            staged: chData.staged || [],
            unstaged: chData.unstaged || [],
            untracked: chData.untracked || []
          });
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

  const handleCheckout = async (branch: string) => {
    setStatusText(`Checking out [${branch}]...`);
    try {
      const res = await fetch(`/api/git/checkout/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branch })
      });
      if (res.ok) {
        setStatusText(`✅ Switched to branch [${branch}]`);
        loadGitData();
      } else {
        const err = await res.text();
        setStatusText(`❌ Checkout failed: ${err}`);
      }
    } catch (e: any) {
      setStatusText(`❌ Error: ${e.message}`);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    setStatusText(`Creating branch [${newBranchName}]...`);
    try {
      const res = await fetch(`/api/git/create-branch/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBranchName.trim() })
      });
      if (res.ok) {
        setStatusText(`✅ Branch [${newBranchName}] created!`);
        setNewBranchName('');
        loadGitData();
      } else {
        const err = await res.text();
        setStatusText(`❌ Create branch failed: ${err}`);
      }
    } catch (e: any) {
      setStatusText(`❌ Error: ${e.message}`);
    }
  };

  const handleStashPush = async () => {
    setStatusText('Stashing local changes...');
    try {
      const res = await fetch(`/api/git/stash-push/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: stashMsg })
      });
      if (res.ok) {
        setStatusText('✅ Local changes stashed successfully!');
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

  const handleStashPop = async () => {
    setStatusText('Popping stash...');
    try {
      const res = await fetch(`/api/git/stash-pop/${encodeURIComponent(serviceName)}`, {
        method: 'POST'
      });
      if (res.ok) {
        setStatusText('✅ Stash popped successfully!');
        loadGitData();
      } else {
        const err = await res.text();
        setStatusText(`❌ Stash pop failed: ${err}`);
      }
    } catch (e: any) {
      setStatusText(`❌ Error: ${e.message}`);
    }
  };

  const handleStageFile = async (file: string) => {
    try {
      await fetch(`/api/git/stage/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file })
      });
      loadGitData();
    } catch (e) {}
  };

  const handleUnstageFile = async (file: string) => {
    try {
      await fetch(`/api/git/unstage/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file })
      });
      loadGitData();
    } catch (e) {}
  };

  const handleDiscardFile = async (file: string) => {
    if (!confirm(`Discard all changes in ${file}?`)) return;
    try {
      await fetch(`/api/git/discard/${encodeURIComponent(serviceName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file })
      });
      loadGitData();
    } catch (e) {}
  };

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
        setStatusText('✅ Commit created successfully!');
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

  const handleViewDiff = async (file: string) => {
    setSelectedFile(file);
    try {
      const res = await fetch(`/api/git/diff/${encodeURIComponent(serviceName)}?file=${encodeURIComponent(file)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedFileDiff(data.diff || data.output || 'No diff content.');
      }
    } catch (e) {
      setSelectedFileDiff('Failed to fetch diff.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#111520] border border-[#232a3f]/75 rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-[#f1f5f9]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232a3f]/75 flex justify-between items-center bg-[#0d1017]">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              🌳 Git Operations & Stash Manager
            </h2>

            {/* Service selector dropdown */}
            {services.length > 0 && (
              <div className="flex items-center gap-2 bg-[#1b2132] border border-[#232a3f] rounded-lg px-2.5 py-1">
                <FolderGit2 className="w-3.5 h-3.5 text-[#10b981]" />
                <select
                  value={serviceName}
                  onChange={(e) => {
                    const found = services.find((s) => s.name === e.target.value);
                    if (found && onSelectService) onSelectService(found);
                  }}
                  className="bg-transparent text-xs font-bold text-[#10b981] font-mono focus:outline-none cursor-pointer"
                >
                  {services.map((s) => (
                    <option key={s.name} value={s.name} className="bg-[#111520] text-white">
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 text-[#94a3b8] hover:text-white transition-all cursor-pointer text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex justify-between items-center border-b border-[#232a3f]/75 px-6 bg-[#0a0d14]/70">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab('branches')}
              className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'branches' ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-[#94a3b8] hover:text-white'
              }`}
            >
              <GitBranch className="w-4 h-4" /> Branches & Commits
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stash')}
              className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'stash' ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-[#94a3b8] hover:text-white'
              }`}
            >
              <Archive className="w-4 h-4" /> Git Stashes ({stashes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('staging')}
              className={`px-5 py-3 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'staging' ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-[#94a3b8] hover:text-white'
              }`}
            >
              <GitCommit className="w-4 h-4" /> Source Control & Staging
            </button>
          </div>

          <button
            type="button"
            onClick={loadGitData}
            title="Refresh Git info"
            className="p-2 text-xs border border-[#232a3f]/75 rounded-lg bg-white/5 hover:bg-white/10 text-white cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {statusText && (
          <div className="px-6 py-2 bg-[#10b981]/10 border-b border-[#10b981]/30 text-xs font-mono text-[#10b981]">
            {statusText}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'branches' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Branches list */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#94a3b8] uppercase">Local Branches</span>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newBranchName}
                      onChange={(e) => setNewBranchName(e.target.value)}
                      placeholder="New branch name"
                      className="text-xs py-1 px-2 bg-[#0a0d14] border border-[#232a3f]/75 rounded text-white focus:outline-none focus:border-[#10b981]"
                    />
                    <button
                      type="button"
                      onClick={handleCreateBranch}
                      className="px-2 py-1 text-xs bg-[#10b981] text-white font-bold rounded cursor-pointer"
                    >
                      + Create
                    </button>
                  </div>
                </div>

                <div className="border border-[#232a3f]/75 rounded-xl overflow-hidden bg-[#0a0d14]/70 max-h-[300px] overflow-y-auto">
                  {branches.length > 0 ? (
                    branches.map((b, idx) => {
                      const bName = typeof b === 'string' ? b : (b.name || '');
                      const isCurrent = typeof b === 'string' ? b.startsWith('*') : (b.is_current || b.current || false);
                      const cleanBranch = bName.replace('*', '').trim();
                      return (
                        <div key={idx} className="flex justify-between items-center py-2 px-3 border-b border-[#232a3f]/40 hover:bg-white/5 text-xs">
                          <span className={`font-mono ${isCurrent ? 'text-[#10b981] font-bold' : 'text-white'}`}>
                            {isCurrent && '✓ '} {cleanBranch}
                          </span>
                          {!isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleCheckout(cleanBranch)}
                              className="px-2.5 py-1 text-[11px] rounded bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer"
                            >
                              Checkout
                            </button>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-xs text-[#94a3b8]">No branches loaded.</div>
                  )}
                </div>
              </div>

              {/* Commits log */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#94a3b8] uppercase block">Recent Commit History</span>
                <div className="border border-[#232a3f]/75 rounded-xl overflow-hidden bg-[#0a0d14]/70 max-h-[300px] overflow-y-auto p-2 space-y-2 font-mono text-xs">
                  {commits.map((c, i) => (
                    <div key={i} className="p-2 rounded bg-white/[0.02] border border-[#232a3f]/50">
                      <div className="text-[#38bdf8] font-bold text-[11px]">{c.hash || c.id || c}</div>
                      <div className="text-white text-xs mt-0.5">{c.message || c.subject || (typeof c === 'string' ? c : '')}</div>
                      <div className="text-[10px] text-[#94a3b8] mt-1">{c.author || 'dev'} {c.date ? `• ${c.date}` : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stash' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={stashMsg}
                  onChange={(e) => setStashMsg(e.target.value)}
                  placeholder="Stash message / label..."
                  className="flex-1 text-xs py-2 px-3 bg-[#0a0d14] border border-[#232a3f]/75 rounded-lg text-white focus:outline-none focus:border-[#10b981]"
                />
                <button
                  type="button"
                  onClick={handleStashPush}
                  className="px-4 text-xs bg-[#10b981] text-white font-bold rounded-lg cursor-pointer"
                >
                  Save Stash
                </button>
                <button
                  type="button"
                  onClick={handleStashPop}
                  disabled={stashes.length === 0}
                  className="px-4 text-xs bg-amber-500 text-black font-bold rounded-lg disabled:opacity-50 cursor-pointer"
                >
                  Pop Stash
                </button>
              </div>

              <div className="border border-[#232a3f]/75 rounded-xl bg-[#0a0d14]/70 p-4 space-y-2">
                <div className="text-xs font-bold text-[#94a3b8] uppercase mb-2">Active Stashes ({stashes.length})</div>
                {stashes.length > 0 ? (
                  stashes.map((s, idx) => (
                    <div key={idx} className="p-2.5 rounded bg-white/5 border border-[#232a3f]/75 font-mono text-xs text-white">
                      {typeof s === 'string' ? s : (s.message || JSON.stringify(s))}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-[#94a3b8]">No active git stashes in working directory.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'staging' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Staging files list */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1 text-xs font-bold text-[#10b981] uppercase">
                    <span>Staged Changes ({changes.staged.length})</span>
                  </div>
                  <div className="border border-[#232a3f]/75 rounded-lg bg-[#0a0d14] p-2 max-h-[140px] overflow-y-auto space-y-1">
                    {changes.staged.map((f) => (
                      <div key={f} className="flex justify-between items-center text-xs text-white p-1 hover:bg-white/5 rounded">
                        <span onClick={() => handleViewDiff(f)} className="font-mono truncate cursor-pointer hover:underline">{f}</span>
                        <button type="button" onClick={() => handleUnstageFile(f)} className="text-[10px] text-amber-400 hover:underline">Unstage</button>
                      </div>
                    ))}
                    {changes.staged.length === 0 && <div className="text-[11px] text-[#94a3b8]">No staged files</div>}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1 text-xs font-bold text-amber-400 uppercase">
                    <span>Unstaged / Untracked Changes ({changes.unstaged.length + changes.untracked.length})</span>
                  </div>
                  <div className="border border-[#232a3f]/75 rounded-lg bg-[#0a0d14] p-2 max-h-[160px] overflow-y-auto space-y-1">
                    {[...changes.unstaged, ...changes.untracked].map((f) => (
                      <div key={f} className="flex justify-between items-center text-xs text-white p-1 hover:bg-white/5 rounded">
                        <span onClick={() => handleViewDiff(f)} className="font-mono truncate cursor-pointer hover:underline">{f}</span>
                        <div className="flex gap-2 text-[10px]">
                          <button type="button" onClick={() => handleStageFile(f)} className="text-[#10b981] hover:underline">Stage</button>
                          <button type="button" onClick={() => handleDiscardFile(f)} className="text-rose-400 hover:underline">Discard</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Commit box */}
                <div className="space-y-2 pt-2 border-t border-[#232a3f]/75">
                  <input
                    type="text"
                    value={commitMsg}
                    onChange={(e) => setCommitMsg(e.target.value)}
                    placeholder="Commit message..."
                    className="w-full text-xs py-2 px-3 bg-[#0a0d14] border border-[#232a3f]/75 rounded-lg text-white focus:outline-none focus:border-[#10b981]"
                  />
                  <button
                    type="button"
                    onClick={handleCommit}
                    disabled={!commitMsg.trim()}
                    className="w-full py-2 text-xs font-bold bg-[#10b981] text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 cursor-pointer"
                  >
                    Commit Staged Changes
                  </button>
                </div>
              </div>

              {/* File Diff viewer */}
              <div className="border border-[#232a3f]/75 rounded-xl bg-[#06080d] overflow-hidden flex flex-col">
                <div className="px-3 py-1.5 bg-[#0d1017] border-b border-[#232a3f]/75 font-mono text-[11px] text-[#38bdf8]">
                  File Diff: {selectedFile || 'Select file to view diff'}
                </div>
                <pre className="flex-1 p-3 font-mono text-[11px] text-[#f1f5f9] overflow-y-auto whitespace-pre-wrap leading-relaxed max-h-[360px]">
                  {selectedFileDiff || 'Select any staged/unstaged file on the left to inspect its diff.'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#232a3f]/75 flex justify-end bg-[#0d1017]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#232a3f]/75 text-[#94a3b8] hover:text-white transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
