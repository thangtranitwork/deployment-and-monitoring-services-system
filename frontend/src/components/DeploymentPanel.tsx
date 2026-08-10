import React, { useState, useMemo } from 'react';
import { Service, WorkspaceItem } from '../types';

interface DeploymentPanelProps {
  selectedService: Service | null;
  workspaces: WorkspaceItem[];
  activeWorkspaceId: string;
  userName: string;
  currentEnv: string;
  onEnvChange: (env: string) => void;
  onWorkspaceChange: (wsId: string) => void;
  onTriggerDeploy: (msg: string) => void;
  isDeploying: boolean;
  onRefresh?: () => void;
  onOpenLogs?: () => void;
}

export const DeploymentPanel: React.FC<DeploymentPanelProps> = ({
  selectedService,
  workspaces,
  activeWorkspaceId,
  userName,
  currentEnv,
  onEnvChange,
  onWorkspaceChange,
  onTriggerDeploy,
  isDeploying,
  onRefresh,
  onOpenLogs
}) => {
  const [deployMsg, setDeployMsg] = useState<string>('');
  const [msgIndex, setMsgIndex] = useState<number>(-1);

  const hasScript = selectedService ? (
    currentEnv === 'Development' ? selectedService.has_dev :
    currentEnv === 'Staging' ? selectedService.has_stg : selectedService.has_prod
  ) : false;

  // Extract commit suggestions from selected service or general services
  const commitSuggestions = useMemo(() => {
    const list: string[] = [];
    if (selectedService?.last_commit) list.push(selectedService.last_commit);
    workspaces.forEach(w => w.services?.forEach(s => {
      if (s.name && !list.includes(s.name)) list.push(`Deploy ${s.name}`);
    }));
    return list;
  }, [selectedService, workspaces]);

  const handlePrevMsg = () => {
    if (commitSuggestions.length === 0) return;
    const nextIdx = msgIndex + 1 >= commitSuggestions.length ? 0 : msgIndex + 1;
    setMsgIndex(nextIdx);
    setDeployMsg(commitSuggestions[nextIdx]);
  };

  const handleNextMsg = () => {
    if (commitSuggestions.length === 0) return;
    const nextIdx = msgIndex - 1 < 0 ? commitSuggestions.length - 1 : msgIndex - 1;
    setMsgIndex(nextIdx);
    setDeployMsg(commitSuggestions[nextIdx]);
  };

  const handleUseLastCommit = () => {
    if (selectedService?.last_commit) {
      setDeployMsg(selectedService.last_commit);
    }
  };

  return (
    <div className="flex flex-col gap-4 shrink-0">
      {/* Top Header Card */}
      <div className="p-5 rounded-xl border border-[#232a3f]/75 bg-[#111520]/65 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)] flex flex-col gap-4">
        <div className="flex justify-between items-center text-xs border-b border-[#232a3f]/50 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-[#94a3b8]">Workspace:</span>
            <select
              value={activeWorkspaceId}
              onChange={(e) => onWorkspaceChange(e.target.value)}
              className="bg-[#0a0d14]/70 border border-[#232a3f]/75 rounded px-2.5 py-1 text-[#f1f5f9] text-xs font-semibold focus:outline-none focus:border-[#10b981]"
            >
              {workspaces.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="text-[#94a3b8]">
            User: <strong className="text-[#f1f5f9] font-bold">{userName || 'Developer'}</strong>
          </div>
        </div>

        {/* Environment & Deploy Message Controls */}
        <div className="flex justify-between items-center gap-4 flex-wrap">
          {/* Environment Switcher */}
          <div className="flex flex-col gap-1.5">
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">ENVIRONMENT</div>
            <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#0a0d14]/70 border border-[#232a3f]/75">
              <button
                type="button"
                onClick={() => onEnvChange('Development')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  currentEnv === 'Development'
                    ? 'bg-[#10b981] text-[#05070a] shadow-[0_2px_8px_rgba(16,185,129,0.3)]'
                    : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                }`}
              >
                Development
              </button>

              <button
                type="button"
                onClick={() => onEnvChange('Staging')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  currentEnv === 'Staging'
                    ? 'bg-[#10b981] text-[#05070a] shadow-[0_2px_8px_rgba(16,185,129,0.3)]'
                    : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                }`}
              >
                Staging
              </button>

              {selectedService?.has_prod && (
                <button
                  type="button"
                  onClick={() => onEnvChange('Production')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    currentEnv === 'Production'
                      ? 'bg-[#ef4444] text-white shadow-[0_2px_8px_rgba(239,68,68,0.3)]'
                      : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                  }`}
                >
                  Production
                </button>
              )}
            </div>
          </div>

          {/* Deploy Message Input & History Controls */}
          <div className="flex-1 max-w-xl flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">DEPLOY MESSAGE</div>
              {selectedService?.last_commit && (
                <button
                  type="button"
                  onClick={handleUseLastCommit}
                  className="text-[10px] text-[#38bdf8] hover:underline cursor-pointer flex items-center gap-1"
                >
                  ⚡ Use Last Commit
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMsg}
                title="Previous message suggestion"
                className="h-10 px-2.5 border border-[#232a3f]/75 bg-[#0a0d14]/70 hover:bg-[#232a3f]/75 text-[#94a3b8] rounded-md text-xs transition-all cursor-pointer"
              >
                ←
              </button>

              <input
                type="text"
                value={deployMsg}
                onChange={(e) => setDeployMsg(e.target.value)}
                placeholder="Deployment description..."
                className="flex-1 h-10 px-3 text-xs bg-[#0a0d14]/70 border border-[#232a3f]/75 rounded-md text-[#f1f5f9] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all font-mono"
              />

              <button
                type="button"
                onClick={handleNextMsg}
                title="Next message suggestion"
                className="h-10 px-2.5 border border-[#232a3f]/75 bg-[#0a0d14]/70 hover:bg-[#232a3f]/75 text-[#94a3b8] rounded-md text-xs transition-all cursor-pointer"
              >
                →
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end">
            <button
              type="button"
              onClick={onRefresh}
              title="Refresh Service Info"
              className="h-10 px-3 border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 hover:border-[#10b981] text-[#f1f5f9] hover:text-[#10b981] rounded-md text-xs cursor-pointer transition-all"
            >
              ↻
            </button>
            <button
              type="button"
              onClick={onOpenLogs}
              title="View Real-time Logs / Stats Port"
              className="h-10 px-4 text-xs font-semibold border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 hover:border-[#10b981] text-[#f1f5f9] hover:text-[#10b981] rounded-md cursor-pointer transition-all flex items-center gap-2"
            >
              📄 Logs
            </button>
            <button
              type="button"
              disabled={!selectedService || !hasScript || isDeploying}
              onClick={() => onTriggerDeploy(deployMsg)}
              className={`btn-deploy-animated h-10 px-6 rounded-md flex items-center gap-2 text-xs font-bold shadow-lg cursor-pointer ${
                isDeploying ? 'deploying' : ''
              }`}
            >
              <span className="deploy-rocket-icon">🚀</span>
              <span>{isDeploying ? 'Deploying...' : 'Run Deploy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      {selectedService && (() => {
        const m = selectedService.metrics?.[currentEnv];
        const isUp = m && (m.status === 'RUNNING' || m.status === 'UP' || !!m.pid);
        const cpuVal = m?.cpu ? (m.cpu.includes('%') ? m.cpu : `${m.cpu}%`) : (selectedService.cpu || '0.0%');
        const memVal = m?.memory || selectedService.memory || '0 MB';
        const uptimeVal = m?.uptime || selectedService.uptime || '00:00:00';
        const portsVal = Array.isArray(m?.ports) ? m.ports.join(', ') : (m?.ports || selectedService.ports || 'N/A');

        return (
          <div className="grid grid-cols-4 gap-4 p-4 rounded-xl border border-[#232a3f]/75 bg-[#111520]/65 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)] text-center">
            <div className="border-r border-[#232a3f]/75 pr-2">
              <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">CPU USAGE</div>
              <div className={`text-xl font-bold mt-1 ${isUp ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {cpuVal}
              </div>
            </div>

            <div className="border-r border-[#232a3f]/75 pr-2">
              <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">MEMORY</div>
              <div className={`text-xl font-bold mt-1 ${isUp ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {memVal}
              </div>
            </div>

            <div className="border-r border-[#232a3f]/75 pr-2">
              <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">UPTIME</div>
              <div className="text-xl font-bold text-[#f1f5f9] mt-1">{uptimeVal}</div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">PORTS</div>
              <div className="text-sm font-semibold text-[#94a3b8] mt-2 truncate" title={String(portsVal)}>{portsVal}</div>
            </div>
          </div>
        );
      })()}

      {/* History Bar */}
      <div className="p-2.5 px-4 rounded-lg border border-[#232a3f]/75 bg-[#111520]/65 backdrop-blur-xl flex justify-between items-center text-xs">
        <div className="text-[#94a3b8]">Last deploy: —</div>
        <button type="button" disabled className="px-3 py-1 text-xs border border-[#232a3f]/75 rounded-md opacity-50 cursor-not-allowed bg-[#1b2132]/75 text-[#94a3b8]">
          View More
        </button>
      </div>
    </div>
  );
};
