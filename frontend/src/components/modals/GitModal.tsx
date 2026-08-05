import React, { useState } from 'react';
import { X, GitBranch, Archive, GitCommit } from 'lucide-react';
import { Service } from '../../types';

interface GitModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedService: Service | null;
}

export const GitModal: React.FC<GitModalProps> = ({
  isOpen,
  onClose,
  selectedService
}) => {
  const [activeTab, setActiveTab] = useState<'branches' | 'stash' | 'staging'>('branches');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#111520] border border-[#232a3f]/75 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-[#f1f5f9]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232a3f]/75 flex justify-between items-center bg-[#0d1017]">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            🌳 Git Operations & Stash Manager: [{selectedService?.name || 'Workspace'}]
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 text-[#94a3b8] hover:text-white transition-all cursor-pointer text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#232a3f]/75 px-6 bg-[#0a0d14]/70">
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
            <Archive className="w-4 h-4" /> Git Stashes
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'branches' && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-[#94a3b8] uppercase">Local & Remote Branches</div>
              <div className="p-4 rounded-xl border border-[#232a3f]/75 bg-[#0a0d14]/70 text-xs space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-[#232a3f]/75">
                  <span className="font-mono text-[#10b981] font-bold">master</span>
                  <span className="text-[11px] text-[#94a3b8]">Current active branch</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-[#232a3f]/75">
                  <span className="font-mono text-white">staging</span>
                  <button type="button" className="px-3 py-1 text-[11px] rounded-md bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer">
                    Checkout
                  </button>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="font-mono text-white">develop</span>
                  <button type="button" className="px-3 py-1 text-[11px] rounded-md bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer">
                    Checkout
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stash' && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-[#94a3b8] uppercase">Stashed Local Changes</div>
              <div className="p-8 text-center text-xs text-[#94a3b8] border border-[#232a3f]/75 rounded-xl bg-[#0a0d14]/70">
                No active git stashes in working directory.
              </div>
            </div>
          )}

          {activeTab === 'staging' && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-[#94a3b8] uppercase">Source Control Staging & Reset</div>
              <div className="p-4 rounded-xl border border-[#232a3f]/75 bg-[#0a0d14]/70 text-xs space-y-3">
                <div className="font-semibold text-white">Quick Staging Reset Options:</div>
                <div className="flex gap-2">
                  <button type="button" className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer">
                    Stage All Files
                  </button>
                  <button type="button" className="px-3 py-1.5 rounded-md bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-semibold cursor-pointer">
                    Discard All Local Changes
                  </button>
                </div>
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
