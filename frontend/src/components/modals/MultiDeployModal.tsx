import React, { useState, useEffect } from 'react';
import { X, CheckSquare, Square, Trash2, Play, RefreshCw } from 'lucide-react';
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

  const toggleSelectService = (name: string) => {
    setSelectedServices(prev => {
      const next = prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name];
      localStorage.setItem('ids_multi_deploy_selected', JSON.stringify(next));
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedServices([]);
    localStorage.removeItem('ids_multi_deploy_selected');
  };

  const handleSelectAll = () => {
    const allNames = services.map(s => s.name);
    setSelectedServices(allNames);
    localStorage.setItem('ids_multi_deploy_selected', JSON.stringify(allNames));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#111520] border border-[#232a3f]/75 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-[#f1f5f9]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#232a3f]/75 flex justify-between items-center bg-[#0d1017]">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            ⚡ Concurrent Parallel Service Deployment (Multi-Deploy)
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 text-[#94a3b8] hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Row */}
        <div className="p-6 pb-4 border-b border-[#232a3f]/75 space-y-4 bg-[#0a0d14]/70">
          <div className="grid grid-cols-12 gap-4 items-center">
            <div className="col-span-5">
              <label className="text-[11px] font-bold text-[#94a3b8] uppercase block mb-1">Target Environment</label>
              <div className="flex gap-1.5 p-1 bg-[#111520] rounded-lg border border-[#232a3f]/75">
                {['Development', 'Staging', 'Production'].map((env) => (
                  <button
                    key={env}
                    type="button"
                    onClick={() => setTargetEnv(env)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      targetEnv === env
                        ? 'bg-[#10b981] text-white shadow-md'
                        : 'text-[#94a3b8] hover:text-white'
                    }`}
                  >
                    {env}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-7">
              <label className="text-[11px] font-bold text-[#94a3b8] uppercase block mb-1">Unified Deployment Message</label>
              <input
                type="text"
                value={deployMsg}
                onChange={(e) => setDeployMsg(e.target.value)}
                placeholder="Enter description for parallel deployment batch..."
                className="w-full h-9 text-xs py-2 px-3 bg-[#111520] border border-[#232a3f]/75 rounded-lg text-white focus:outline-none focus:border-[#10b981]"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-xs text-[#94a3b8] font-semibold">
              Selected: <span className="text-[#10b981] font-bold text-sm">{selectedServices.length}</span> / {services.length} services
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#232a3f]/75 bg-white/5 hover:bg-white/10 text-white font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <CheckSquare className="w-3.5 h-3.5" /> Select All
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs px-3 py-1.5 rounded-lg border border-[#232a3f]/75 bg-white/5 hover:bg-rose-500/20 text-rose-400 font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Selection
              </button>
            </div>
          </div>
        </div>

        {/* Services Selection Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 gap-3">
          {services.map((svc) => {
            const isSelected = selectedServices.includes(svc.name);
            return (
              <div
                key={svc.name}
                onClick={() => toggleSelectService(svc.name)}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all duration-200 flex items-center justify-between ${
                  isSelected
                    ? 'border-[#10b981] bg-[#10b981]/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'border-[#232a3f]/75 bg-white/[0.02] hover:bg-white/[0.06] hover:border-[#94a3b8]'
                }`}
              >
                <div className="truncate">
                  <div className="font-bold text-xs text-white truncate">{svc.name}</div>
                  <div className="text-[11px] font-mono text-[#10b981] truncate mt-0.5">🌿 {svc.branch}</div>
                </div>

                {isSelected ? (
                  <CheckSquare className="w-5 h-5 text-[#10b981] shrink-0 ml-2" />
                ) : (
                  <Square className="w-5 h-5 text-[#94a3b8] shrink-0 ml-2 opacity-50" />
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#232a3f]/75 flex justify-between items-center bg-[#0d1017]">
          <div className="flex gap-2">
            <button
              type="button"
              id="reset-staging-btn"
              onClick={() => alert('Reset Staging triggered')}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#232a3f]/75 bg-white/5 hover:bg-emerald-500/20 text-[#10b981] font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Staging
            </button>
            <button
              type="button"
              id="reset-main-btn"
              onClick={() => alert('Reset Main triggered')}
              className="text-xs px-3 py-1.5 rounded-lg border border-[#232a3f]/75 bg-white/5 hover:bg-emerald-500/20 text-[#10b981] font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Reset Main
            </button>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#232a3f]/75 text-[#94a3b8] hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedServices.length === 0}
              onClick={() => {
                onTriggerMultiDeploy(selectedServices, targetEnv, deployMsg);
                onClose();
              }}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-[#10b981] text-white flex items-center gap-2 shadow-lg hover:bg-emerald-600 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4" /> Start Multi Deploy ({selectedServices.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
