import React, { useState } from 'react';
import { X, GitCompare, GitBranch } from 'lucide-react';
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
        <div className="p-6 border-b border-[#232a3f]/75 bg-[#0a0d14]/70 flex items-center gap-4">
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
                {services.map((svc) => (
                  <tr key={svc.name} className="border-b border-[#232a3f]/75/40 hover:bg-white/5">
                    <td className="p-3 font-bold text-white">{svc.name}</td>
                    <td className="p-3 font-mono text-[#10b981] flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5" /> {svc.branch}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                        Up to date
                      </span>
                    </td>
                  </tr>
                ))}
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
