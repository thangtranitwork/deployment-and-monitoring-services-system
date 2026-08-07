import React, { useState } from 'react';
import { ShieldAlert, Key } from 'lucide-react';

interface ProdPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  targetAction: string;
}

export const ProdPasswordModal: React.FC<ProdPasswordModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  targetAction
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Password cannot be empty');
      return;
    }
    onConfirm(password);
    setPassword('');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4">
      <div className="bg-[#111520] border-2 border-rose-500/50 rounded-2xl w-full max-w-md p-6 shadow-[0_0_50px_rgba(244,63,94,0.3)] text-[#f1f5f9] space-y-4">
        <div className="flex items-center gap-3 text-rose-500 font-bold text-base border-b border-rose-500/30 pb-3">
          <ShieldAlert className="w-6 h-6 animate-pulse" />
          <span>Production Security Password Verification</span>
        </div>

        <p className="text-xs text-[#94a3b8] leading-relaxed">
          You are triggering a sensitive operation on <strong className="text-rose-400">PRODUCTION ({targetAction})</strong>. Please verify your administrative password to proceed.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-bold text-[#94a3b8] uppercase block mb-1">Production Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter master production password"
              autoFocus
              className="w-full text-xs py-2 px-3 bg-[#0a0d14] border border-rose-500/40 rounded-lg text-white focus:outline-none focus:border-rose-500"
            />
            {error && <div className="text-[11px] text-rose-400 font-bold mt-1">{error}</div>}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-semibold rounded-lg border border-[#232a3f]/75 text-[#94a3b8] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 text-xs font-bold rounded-lg bg-rose-500 hover:bg-rose-600 text-white shadow-lg cursor-pointer"
            >
              Confirm & Execute
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
