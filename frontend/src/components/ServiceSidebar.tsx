import React from 'react';
import { Service } from '../types';

interface ServiceSidebarProps {
  services: Service[];
  selectedService: Service | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectService: (service: Service) => void;
}

export const ServiceSidebar: React.FC<ServiceSidebarProps> = ({
  services,
  selectedService,
  searchQuery,
  onSearchChange,
  onSelectService
}) => {
  const filterServices = (list: Service[], query: string) => {
    if (!query.trim()) return list;
    const q = query.toLowerCase().trim();
    if (q.includes(',')) {
      const parts = q.split(',').map(s => s.trim()).filter(Boolean);
      return list.filter(s => parts.some(p => s.name.toLowerCase().includes(p) || s.branch.toLowerCase().includes(p)));
    }
    const terms = q.split(/\s+/).filter(Boolean);
    return list.filter(s => terms.every(t => s.name.toLowerCase().includes(t) || s.branch.toLowerCase().includes(t)));
  };

  const filtered = filterServices(services, searchQuery);

  return (
    <aside className="w-[320px] border-r border-[#232a3f]/75 bg-[#111520]/65 backdrop-blur-xl flex flex-col shrink-0 overflow-hidden h-full">
      <div className="px-6 pt-5 pb-2.5 text-[11px] font-bold text-[#94a3b8] uppercase tracking-widest shrink-0">
        Services
      </div>

      <div className="px-3 pb-3 shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="🔍 Search services..."
          className="w-full text-xs py-2 px-3 bg-[#0a0d14]/70 border border-[#232a3f]/75 rounded-md text-[#f1f5f9] placeholder-[#94a3b8]/60 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all"
        />
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-2 pb-4">
        {filtered.map((svc) => {
          const isSelected = selectedService?.name === svc.name;
          return (
            <div
              key={svc.name}
              onClick={() => onSelectService(svc)}
              className={`p-3.5 rounded-lg cursor-pointer transition-all duration-200 border flex flex-col gap-1.5 ${
                isSelected
                  ? 'bg-[rgba(16,185,129,0.18)] border-[#232a3f]/75 border-l-4 border-l-[#10b981] shadow-[0_4px_12px_rgba(0,0,0,0.15)] translate-x-1.5'
                  : 'border-transparent border-l-4 border-l-transparent bg-white/[0.03] hover:bg-white/[0.08] hover:border-[#232a3f]/75 hover:border-l-[#94a3b8] hover:translate-x-1'
              }`}
            >
              <div className="font-bold text-sm text-[#f1f5f9] truncate">
                {svc.name}
              </div>
              <div className="text-xs flex flex-col gap-0.5">
                <span className="font-mono text-[#10b981] font-semibold text-[11px] opacity-90">
                  🌿 {svc.branch}
                </span>
                <span className="text-[11px] text-[#94a3b8] truncate block">
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
