import React from 'react';

interface HeaderBarProps {
  isLightMode: boolean;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
  onOpenMultiDeploy: () => void;
  onOpenCompare: () => void;
  onToggleGit: () => void;
  onToggleVPN: () => void;
  onRefresh: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  isLightMode,
  onToggleTheme,
  onOpenSettings,
  onOpenMultiDeploy,
  onOpenCompare,
  onToggleGit,
  onToggleVPN,
  onRefresh
}) => {
  return (
    <header className="relative z-50 px-6 py-4 flex justify-between items-center border-b border-[#232a3f]/75 bg-[#111520]/75 backdrop-blur-md shrink-0 pointer-events-auto">
      <div className="flex items-center gap-2.5 font-bold text-xl text-[#f1f5f9]">
        <img src="/favicon.ico" alt="Logo" className="w-6 h-6 shrink-0" />
        <span>
          <span className="text-[#10b981]">Internal</span> Deploy System
        </span>
        <span className="text-[11px] opacity-50 font-normal ml-1.5 px-2 py-0.5 rounded bg-white/5 border border-[#232a3f]/75">
          v2.0.0
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => window.location.href = '/tools'}
          title="Open tools suite"
          className="px-4 py-2 text-xs font-semibold rounded-md border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 hover:border-[#10b981] text-[#f1f5f9] hover:text-[#10b981] transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 cursor-pointer shadow-sm"
        >
          🛠️ Tools
        </button>

        <button
          type="button"
          onClick={() => window.location.href = '/health-monitor'}
          title="View remote server health"
          className="px-4 py-2 text-xs font-semibold rounded-md border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 hover:border-[#10b981] text-[#f1f5f9] hover:text-[#10b981] transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 cursor-pointer shadow-sm"
        >
          🖥️ Health Monitor
        </button>

        <button
          type="button"
          onClick={onOpenMultiDeploy}
          title="Deploy multiple services concurrently"
          className="px-4 py-2 text-xs font-semibold rounded-md border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 hover:border-[#10b981] text-[#f1f5f9] hover:text-[#10b981] transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 cursor-pointer shadow-sm"
        >
          ⚡ Multi Deploy
        </button>

        <button
          type="button"
          onClick={onOpenCompare}
          title="Compare all services branch difference"
          className="px-4 py-2 text-xs font-semibold rounded-md border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 hover:border-[#10b981] text-[#f1f5f9] hover:text-[#10b981] transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 cursor-pointer shadow-sm"
        >
          🔍 Compare Source
        </button>

        <button
          type="button"
          onClick={onToggleGit}
          title="Shortcut: Alt+Shift+G"
          className="px-4 py-2 text-xs font-semibold rounded-md border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 hover:border-[#10b981] text-[#f1f5f9] hover:text-[#10b981] transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 cursor-pointer shadow-sm"
        >
          🌳 Git
        </button>

        <button
          type="button"
          onClick={onToggleVPN}
          title="Shortcut: Alt+Shift+U"
          className="px-4 py-2 text-xs font-semibold rounded-md border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 hover:border-[#10b981] text-[#f1f5f9] hover:text-[#10b981] transition-all duration-200 flex items-center gap-2 hover:-translate-y-0.5 active:scale-95 cursor-pointer shadow-sm"
        >
          🔒 VPN
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          title="Shortcut: Alt+Shift+T"
          className="p-2 rounded-md border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 hover:border-[#10b981] text-[#f1f5f9] hover:text-[#10b981] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer shadow-sm"
        >
          🌓
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          title="Shortcut: Alt+Shift+I"
          className="p-2 rounded-md border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 hover:border-[#10b981] text-[#f1f5f9] hover:text-[#10b981] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer shadow-sm"
        >
          ⚙️
        </button>

        <button
          type="button"
          onClick={onRefresh}
          title="Shortcut: Alt+Shift+R"
          className="p-2 rounded-md border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 hover:border-[#10b981] text-[#f1f5f9] hover:text-[#10b981] transition-all duration-200 hover:-translate-y-0.5 active:scale-95 cursor-pointer shadow-sm"
        >
          ↻
        </button>
      </div>
    </header>
  );
};
