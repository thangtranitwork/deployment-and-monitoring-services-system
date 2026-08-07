import React, { useState, useEffect } from 'react';
import { X, GitCompare, GitBranch, RefreshCw } from 'lucide-react';
import { Service } from '../../types';

interface CompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
}

export const CompareModal: React.FC<CompareModalProps> = ({
  isOpen,
  onClose,
  services
}) => {
  const [baseBranch, setBaseBranch] = useState('master');
  const [targetBranch, setTargetBranch] = useState('staging');
  const [compareResults, setCompareResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const fetchComparison = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/git/compare-all?base=${encodeURIComponent(baseBranch)}&target=${encodeURIComponent(targetBranch)}`);
      if (res.ok) {
        const data = await res.json();
        setCompareResults(data.results || data || {});
      }
    } catch (e) {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchComparison();
    }
  }, [isOpen, baseBranch, targetBranch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#111520] border border-[#232a3f]/75 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-[#f1f5f9]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232a3f]/75 flex justify-between items-center bg-[#0d1017]">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            🔍 Compare Source Branch Difference Across Services
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 text-[#94a3b8] hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-[#232a3f]/75 bg-[#0a0d14]/70 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#94a3b8] uppercase">Base:</span>
              <input
                type="text"
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                className="text-xs py-1.5 px-3 bg-[#111520] border border-[#232a3f]/75 rounded-lg text-white font-mono focus:outline-none focus:border-[#10b981]"
              />
            </div>

            <GitCompare className="w-4 h-4 text-[#10b981]" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#94a3b8] uppercase">Compare Target:</span>
              <input
                type="text"
                value={targetBranch}
                onChange={(e) => setTargetBranch(e.target.value)}
                className="text-xs py-1.5 px-3 bg-[#111520] border border-[#232a3f]/75 rounded-lg text-white font-mono focus:outline-none focus:border-[#10b981]"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={fetchComparison}
            className="px-3 py-1.5 text-xs bg-white/5 border border-[#232a3f]/75 hover:bg-white/10 text-white rounded-lg flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {/* Table List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="border border-[#232a3f]/75 rounded-xl overflow-hidden bg-[#0a0d14]/70">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#232a3f]/75 bg-white/5 text-[#94a3b8] font-bold">
                  <th className="p-3">Service Name</th>
                  <th className="p-3">Current Branch</th>
                  <th className="p-3 text-center">Status vs [{targetBranch}]</th>
                </tr>
              </thead>
              <tbody>
                {services.map((svc) => {
                  const res = compareResults[svc.name] || {};
                  const ahead = res.ahead || 0;
                  const behind = res.behind || 0;
                  const statusLabel = ahead === 0 && behind === 0 ? 'Up to date' : `Ahead ↑${ahead} / Behind ↓${behind}`;

                  return (
                    <tr key={svc.name} className="border-b border-[#232a3f]/75/40 hover:bg-white/5">
                      <td className="p-3 font-bold text-white">{svc.name}</td>
                      <td className="p-3 font-mono text-[#10b981] flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5" /> {svc.branch}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border ${
                          ahead === 0 && behind === 0
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
