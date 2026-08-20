import React from 'react';
import { Service } from '../types';

interface ServiceSidebarProps {
  services: Service[];
  selectedService: Service | null;
  searchQuery: string;
  currentEnv?: string;
  onSearchChange: (q: string) => void;
  onSelectService: (service: Service) => void;
  onOpenMultiWebviewLogs?: (targetServiceNames?: string[]) => void;
  onOpenSingleWebviewLog?: (serviceName: string) => void;
}

export const ServiceSidebar: React.FC<ServiceSidebarProps> = ({
  services,
  selectedService,
  searchQuery,
  currentEnv = 'Development',
  onSearchChange,
  onSelectService,
  onOpenMultiWebviewLogs,
  onOpenSingleWebviewLog
}) => {
  const filterServices = (list: Service[], query: string) => {
    if (!query.trim()) return list;
    const q = query.toLowerCase().trim();
    if (q.includes(',')) {
      const parts = q.split(',').map(s => s.trim()).filter(Boolean);
      return list.filter(s => parts.some(p => s.name.toLowerCase().includes(p)));
    }
    const terms = q.split(/\s+/).filter(Boolean);
    return list.filter(s => terms.every(t => s.name.toLowerCase().includes(t)));
  };

  const filtered = filterServices(services, searchQuery);

  const hasLogPort = (svc: Service): boolean => {
    const metric = svc.metrics?.[currentEnv];
    return !!(metric && metric.stats_port && metric.stats_port !== 'N/A');
  };

  const filteredWithLogs = filtered.filter(hasLogPort);
  const servicesWithLogsCount = filteredWithLogs.length;

  return (
    <aside className="w-[320px] border-r border-[#232a3f]/75 bg-[#111520]/65 backdrop-blur-xl flex flex-col shrink-0 overflow-hidden h-full">
      <div className="px-5 pt-4 pb-2 flex justify-between items-center shrink-0">
        <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest">
          Services ({services.length})
        </span>

        {servicesWithLogsCount > 0 ? (
          <button
            type="button"
            onClick={() => {
              const targetNames = filteredWithLogs.map(s => s.name);
              localStorage.setItem('ids_target_webview_services', JSON.stringify(targetNames));
              onOpenMultiWebviewLogs?.(targetNames);
            }}
            title={`Open webview live logs grid page for ${servicesWithLogsCount} service(s)`}
            className="text-[10.5px] font-bold px-2 py-1 rounded bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/30 transition-all cursor-pointer flex items-center gap-1 shadow-sm hover:scale-105 active:scale-95"
          >
            <span>📄 Mở tất cả Logs ({servicesWithLogsCount})</span>
          </button>
        ) : (
          <span className="text-[10px] text-[#94a3b8]/60 font-mono">No Active Logs</span>
        )}
      </div>

      <div className="px-3 pb-3 shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter services..."
          className="w-full bg-[#161c2e]/90 border border-[#232a3f]/75 rounded-lg px-3 py-1.5 text-xs text-[#f1f5f9] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#10b981] transition-all"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1.5 custom-scrollbar">
        {filtered.map(svc => {
          const isSelected = selectedService?.name === svc.name;
          const isSuggest = (svc.ahead || 0) > 0 || (svc.ahead_staging || 0) > 0;
          const hasStash = svc.has_stash;

          const metric = svc.metrics?.[currentEnv];

          const dUp = svc.metrics?.Development && (svc.metrics.Development.status === 'RUNNING' || svc.metrics.Development.status === 'UP');
          const sUp = svc.metrics?.Staging && (svc.metrics.Staging.status === 'RUNNING' || svc.metrics.Staging.status === 'UP');

          return (
            <div
              key={svc.name}
              onClick={() => onSelectService(svc)}
              className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border flex flex-col gap-1.5 ${
                isSelected
                  ? 'bg-[rgba(16,185,129,0.18)] border-[#232a3f]/75 border-l-4 border-l-[#10b981] shadow-[0_4px_12px_rgba(0,0,0,0.15)] translate-x-1'
                  : 'border-transparent border-l-4 border-l-transparent bg-white/[0.03] hover:bg-white/[0.08] hover:border-[#232a3f]/75 hover:border-l-[#94a3b8]'
              }`}
            >
              <div className="flex justify-between items-start gap-1">
                <div className="font-bold text-xs text-[#f1f5f9] truncate flex-1 flex items-center gap-1.5">
                  <span className="truncate">{svc.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {svc.metrics && (
                    <div className="flex gap-1 items-center mr-1" title={`Dev: ${dUp ? 'UP' : 'DOWN'}, Stg: ${sUp ? 'UP' : 'DOWN'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${dUp ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-rose-500'}`} />
                      <div className={`w-1.5 h-1.5 rounded-full ${sUp ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-rose-500'}`} />
                    </div>
                  )}
                  {hasStash && <span title="Has Git Stash" className="text-xs">📥</span>}
                  {isSuggest && (
                    <span
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/30 animate-pulse"
                      title={`Has un-deployed changes (Ahead: +${svc.ahead || 0}, Staging: +${svc.ahead_staging || 0})`}
                    >
                      💡 Deploy Suggest
                    </span>
                  )}
                </div>
              </div>

              <div className="text-xs flex flex-col gap-0.5">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[#10b981] font-semibold text-[11px] opacity-90 truncate">
                    🌿 {svc.branch}
                  </span>
                  {svc.staged_changes ? (
                    <span className="text-[9px] font-bold bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 px-1 py-0.2 rounded shrink-0">
                      Staged: {svc.staged_changes}
                    </span>
                  ) : null}
                </div>
                <span className="text-[10.5px] text-[#94a3b8] truncate block">
                  {svc.last_commit || '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
