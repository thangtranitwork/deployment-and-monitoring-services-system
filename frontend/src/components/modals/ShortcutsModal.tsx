import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { action: 'Search Service', key: '/' },
    { action: 'Navigate Services', key: 'Alt + ↑ / ↓' },
    { action: 'Run Single Deploy', key: 'Ctrl + Enter' },
    { action: 'Multi Deploy Modal', key: 'Alt + Shift + M' },
    { action: 'Fast Multi Deploy (Last Selection)', key: 'Ctrl + Alt + Shift + M' },
    { action: 'Cycle Deploy Messages', key: 'Alt + Shift + ← / →' },
    { action: 'Toggle Git Modal', key: 'Alt + Shift + G' },
    { action: 'Toggle Theme (Dark/Light)', key: 'Alt + Shift + T' },
    { action: 'Toggle VPN Modal', key: 'Alt + Shift + U' },
    { action: 'Global Settings', key: 'Alt + Shift + I' },
    { action: 'Refresh Data', key: 'Alt + Shift + R' },
    { action: 'Keyboard Shortcuts Help', key: 'Alt + Shift + H' },
    { action: 'Close any Modal', key: 'Esc' }
  ];

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-4">
      <div className="bg-[#111520] border border-[#232a3f]/75 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-[#f1f5f9]">
        <div className="px-6 py-4 border-b border-[#232a3f]/75 flex justify-between items-center bg-[#0d1017]">
          <h2 className="text-base font-bold text-[#10b981] flex items-center gap-2">
            <Keyboard className="w-5 h-5" /> System Keyboard Shortcuts Reference
          </h2>
          <button onClick={onClose} className="p-1 text-xl font-bold hover:bg-white/10 rounded-md text-[#94a3b8] hover:text-white">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-[#080b12]">
          <div className="border border-[#232a3f]/75 rounded-xl overflow-hidden bg-[#0d1017]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#232a3f]/75 bg-white/5 text-[#94a3b8] font-bold">
                  <th className="p-3">Action Description</th>
                  <th className="p-3 text-right">Shortcut Key</th>
                </tr>
              </thead>
              <tbody>
                {shortcuts.map((s, idx) => (
                  <tr key={idx} className="border-b border-[#232a3f]/40 hover:bg-white/5">
                    <td className="p-3 font-semibold text-white">{s.action}</td>
                    <td className="p-3 text-right">
                      <kbd className="px-2 py-1 bg-white/10 border border-[#232a3f]/75 rounded font-mono text-[11px] text-[#10b981] font-bold">
                        {s.key}
                      </kbd>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#232a3f]/75 flex justify-end bg-[#0d1017]">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#232a3f]/75 text-[#94a3b8] hover:text-white cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
