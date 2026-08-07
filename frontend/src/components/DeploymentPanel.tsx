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
  isDeploying
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
    const nextIdx = (msgIndex + 1) % commitSuggestions.length;
    setMsgIndex(nextIdx);
    setDeployMsg(commitSuggestions[nextIdx]);
  };

  const handleNextMsg = () => {
    if (commitSuggestions.length === 0) return;
    const prevIdx = (msgIndex - 1 + commitSuggestions.length) % commitSuggestions.length;
    setMsgIndex(prevIdx);
    setDeployMsg(commitSuggestions[prevIdx]);
  };

  return (
    <div className="space-y-5 shrink-0">
      {/* Workspace & User Info Bar */}
      <div className="flex items-center gap-5 text-xs text-[#94a3b8] pl-0.5 -mt-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#94a3b8]">Workspace:</span>
          <select
            value={activeWorkspaceId}
            onChange={(e) => onWorkspaceChange(e.target.value)}
            className="py-1 px-3 bg-[#111520]/65 border border-[#232a3f]/75 rounded-md text-[#f1f5f9] font-semibold text-xs focus:outline-none hover:border-[#10b981] hover:bg-[#1b2132]/75 transition-all cursor-pointer max-w-[260px] truncate"
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id} className="bg-[#111520] text-[#f1f5f9]">
                {ws.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <span>User:</span>
          <strong className="text-[#f1f5f9] font-bold">{userName || '—'}</strong>
        </div>
      </div>

      {/* Main Deployment Control Card */}
      <div className="p-5 rounded-xl border border-[#232a3f]/75 bg-[#111520]/65 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:border-white/10 transition-all duration-200">
        <div className="flex flex-col lg:flex-row gap-6 items-end">
          {/* Environment Selector */}
          <div className="flex-1">
            <div className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">
              Environment
            </div>
            <div className="flex gap-2 p-1 bg-[#0a0d14]/70 rounded-lg border border-[#232a3f]/75 w-fit">
              <button
                type="button"
                onClick={() => onEnvChange('Development')}
                className={`py-1.5 px-4 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                  currentEnv === 'Development'
                    ? 'bg-[#111520]/65 text-[#10b981] shadow-sm font-bold border border-[#232a3f]/75'
                    : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:-translate-y-0.5'
                }`}
              >
                Development
              </button>
              <button
                type="button"
                onClick={() => onEnvChange('Staging')}
                className={`py-1.5 px-4 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                  currentEnv === 'Staging'
                    ? 'bg-[#111520]/65 text-[#10b981] shadow-sm font-bold border border-[#232a3f]/75'
                    : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:-translate-y-0.5'
                }`}
              >
                Staging
              </button>
              {selectedService?.has_prod && (
                <button
                  type="button"
                  onClick={() => onEnvChange('Production')}
                  className={`py-1.5 px-4 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                    currentEnv === 'Production'
                      ? 'bg-[#111520]/65 text-[#10b981] shadow-sm font-bold border border-[#232a3f]/75'
                      : 'text-[#94a3b8] hover:text-[#f1f5f9] hover:-translate-y-0.5'
                  }`}
                >
                  Production
                </button>
              )}
            </div>
          </div>

          {/* Deploy Message Input */}
          <div className="flex-[3] w-full">
            <div className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2 flex justify-between items-center">
              <span>Deploy Message</span>
              {selectedService?.last_commit && (
                <button
                  type="button"
                  onClick={() => setDeployMsg(selectedService.last_commit)}
                  className="text-[10px] text-[#10b981] hover:underline font-mono cursor-pointer"
                >
                  ⚡ Use Last Commit
                </button>
              )}
            </div>
            <div className="flex gap-1 items-center">
              <button
                type="button"
                onClick={handleNextMsg}
                className="px-3 h-10 border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 hover:border-[#10b981] text-[#f1f5f9] hover:text-[#10b981] rounded-md text-xs cursor-pointer transition-all"
                title="Newer Commit Suggestion"
              >
                ←
              </button>
              <input
                type="text"
                value={deployMsg}
                onChange={(e) => setDeployMsg(e.target.value)}
                placeholder="Deployment description..."
                className="flex-1 h-10 text-xs py-2 px-3 bg-[#0a0d14]/70 border border-[#232a3f]/75 rounded-md text-[#f1f5f9] placeholder-[#94a3b8]/60 focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/30 transition-all"
              />
              <button
                type="button"
                onClick={handlePrevMsg}
                className="px-3 h-10 border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 hover:border-[#10b981] text-[#f1f5f9] hover:text-[#10b981] rounded-md text-xs cursor-pointer transition-all"
                title="Older Commit Suggestion"
              >
                →
              </button>
            </div>
          </div>

          {/* Actions & Rocket Deploy Button */}
          <div className="flex gap-2 items-center">
            <button
              type="button"
              title="Refresh Service Info"
              className="h-10 px-3 border border-[#232a3f]/75 bg-[#1b2132]/75 hover:bg-[#232a3f]/75 hover:border-[#10b981] text-[#f1f5f9] hover:text-[#10b981] rounded-md text-xs cursor-pointer transition-all"
            >
              ↻
            </button>
            <button
              type="button"
              title="View Real-time Logs"
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
      {selectedService && (
        <div className="grid grid-cols-4 gap-4 p-4 rounded-xl border border-[#232a3f]/75 bg-[#111520]/65 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.25)] text-center">
          <div className="border-r border-[#232a3f]/75 pr-2">
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">CPU USAGE</div>
            <div className="text-xl font-bold text-[#10b981] mt-1">{selectedService.cpu || '0.0%'}</div>
          </div>

          <div className="border-r border-[#232a3f]/75 pr-2">
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">MEMORY</div>
            <div className="text-xl font-bold text-[#10b981] mt-1">{selectedService.memory || '0 MB'}</div>
          </div>

          <div className="border-r border-[#232a3f]/75 pr-2">
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">UPTIME</div>
            <div className="text-xl font-bold text-[#f1f5f9] mt-1">{selectedService.uptime || '00:00:00'}</div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">PORTS</div>
            <div className="text-sm font-semibold text-[#94a3b8] mt-2 truncate">{selectedService.ports || 'N/A'}</div>
          </div>
        </div>
      )}

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
