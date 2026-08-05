import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Folder, Server, Code } from 'lucide-react';
import { Settings, WorkspaceItem, ServiceConfig } from '../../types';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSaveSettings: (newSettings: Settings) => void;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings
}) => {
  const [activeTab, setActiveTab] = useState<'core' | 'deploy'>('core');
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [selectedWsId, setSelectedWsId] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
      const initialWsId = settings.active_workspace_id || (settings.workspaces?.[0]?.id ?? '');
      setSelectedWsId(initialWsId);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const activeWs = localSettings.workspaces?.find(w => w.id === selectedWsId) || localSettings.workspaces?.[0];

  const handleSave = () => {
    const finalSettings = {
      ...localSettings,
      active_workspace_id: selectedWsId || localSettings.active_workspace_id
    };
    onSaveSettings(finalSettings);
    onClose();
  };

  const handleSelectWorkspace = (wsId: string) => {
    setSelectedWsId(wsId);
    setLocalSettings(prev => ({
      ...prev,
      active_workspace_id: wsId
    }));
  };

  const handleUpdateWsAgentUrl = (field: 'dev_agent_url' | 'stg_agent_url' | 'prod_agent_url', val: string) => {
    if (!activeWs) return;
    setLocalSettings(prev => ({
      ...prev,
      workspaces: (prev.workspaces || []).map(w => w.id === activeWs.id ? { ...w, [field]: val } : w)
    }));
  };

  const handleUpdateServiceScript = (svcName: string, field: string, value: any) => {
    if (!activeWs) return;
    setLocalSettings(prev => ({
      ...prev,
      workspaces: (prev.workspaces || []).map(w => {
        if (w.id !== activeWs.id) return w;
        const currentSvcs = w.services || localSettings.services || [];
        const updatedSvcs = currentSvcs.map(s => s.name === svcName ? { ...s, [field]: value } : s);
        return { ...w, services: updatedSvcs };
      })
    }));
  };

  const handleAddWorkspace = () => {
    const path = prompt('Enter absolute path for new workspace:');
    if (!path || !path.trim()) return;
    const name = path.trim().split('/').pop() || 'New Workspace';
    const newWs: WorkspaceItem = {
      id: Date.now().toString(),
      name,
      path: path.trim(),
      dev_agent_url: 'http://localhost:8081',
      stg_agent_url: 'http://localhost:8081',
      prod_agent_url: 'http://localhost:8081',
      services: []
    };
    setLocalSettings(prev => ({
      ...prev,
      workspaces: [...(prev.workspaces || []), newWs],
      active_workspace_id: newWs.id
    }));
    setSelectedWsId(newWs.id);
  };

  const handleDeleteWorkspace = (wsId: string) => {
    setLocalSettings(prev => {
      const filtered = (prev.workspaces || []).filter(w => w.id !== wsId);
      const nextWsId = filtered[0]?.id || '';
      if (selectedWsId === wsId) {
        setSelectedWsId(nextWsId);
      }
      return {
        ...prev,
        workspaces: filtered,
        active_workspace_id: nextWsId
      };
    });
  };

  const servicesToEdit: ServiceConfig[] = (activeWs?.services && activeWs.services.length > 0)
    ? activeWs.services
    : (localSettings.services || []);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#111520] border border-[#232a3f]/75 rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-[#f1f5f9]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#232a3f]/75 flex justify-between items-center bg-[#0d1017]">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            ⚙️ Global System & Workspace Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-white/10 text-[#94a3b8] hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Nav Tabs */}
        <div className="flex border-b border-[#232a3f]/75 px-6 bg-[#0a0d14]/70">
          <button
            onClick={() => setActiveTab('core')}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'core'
                ? 'border-[#10b981] text-[#10b981]'
                : 'border-transparent text-[#94a3b8] hover:text-white'
            }`}
          >
            💻 Core Workspaces & Agents
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'deploy'
                ? 'border-[#10b981] text-[#10b981]'
                : 'border-transparent text-[#94a3b8] hover:text-white'
            }`}
          >
            🚀 Deployment Scripts per Workspace
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'core' ? (
            <div className="space-y-6">
              {/* User settings */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-[#94a3b8] uppercase block mb-1">User Name</label>
                  <input
                    type="text"
                    value={localSettings.user_name || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, user_name: e.target.value }))}
                    className="w-full text-xs py-2 px-3 bg-[#0a0d14]/70 border border-[#232a3f]/75 rounded-lg text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#94a3b8] uppercase block mb-1">Git Bash Path</label>
                  <input
                    type="text"
                    value={localSettings.git_bash_path || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, git_bash_path: e.target.value }))}
                    className="w-full text-xs py-2 px-3 bg-[#0a0d14]/70 border border-[#232a3f]/75 rounded-lg text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              {/* Workspaces List Table */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[11px] font-bold text-[#94a3b8] uppercase">Registered Workspaces</span>
                  <button
                    onClick={handleAddWorkspace}
                    className="text-xs px-3 py-1.5 rounded-lg bg-[#10b981] text-white font-semibold flex items-center gap-1.5 hover:bg-emerald-600 transition-all cursor-pointer shadow-md"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Workspace
                  </button>
                </div>

                <div className="border border-[#232a3f]/75 rounded-xl overflow-hidden bg-[#0a0d14]/70">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#232a3f]/75 bg-white/5 text-[#94a3b8] font-bold">
                        <th className="p-3">Workspace Name</th>
                        <th className="p-3">Path</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localSettings.workspaces?.map((ws) => (
                        <tr
                          key={ws.id}
                          onClick={() => handleSelectWorkspace(ws.id)}
                          className={`border-b border-[#232a3f]/75/50 cursor-pointer transition-all ${
                            (selectedWsId === ws.id || activeWs?.id === ws.id)
                              ? 'bg-[rgba(16,185,129,0.18)] font-semibold'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          <td className="p-3 flex items-center gap-2 text-white">
                            <Folder className="w-4 h-4 text-[#10b981] shrink-0" />
                            {ws.name}
                          </td>
                          <td className="p-3 text-[#94a3b8] font-mono truncate max-w-[300px]">{ws.path}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteWorkspace(ws.id);
                              }}
                              className="p-1.5 rounded-md hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bound Workspace Agent URLs */}
              {activeWs && (
                <div className="p-4 rounded-xl border border-[#232a3f]/75 bg-white/[0.02] space-y-3">
                  <div className="text-xs font-bold text-[#10b981] uppercase flex items-center gap-2">
                    <Server className="w-4 h-4" /> Agent URLs for Selected Workspace: [{activeWs.name}]
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#94a3b8] block mb-1">DEV AGENT URL</label>
                      <input
                        type="text"
                        value={activeWs.dev_agent_url || ''}
                        onChange={(e) => handleUpdateWsAgentUrl('dev_agent_url', e.target.value)}
                        className="w-full text-xs py-2 px-3 bg-[#0a0d14]/70 border border-[#232a3f]/75 rounded-lg text-white font-mono focus:outline-none focus:border-[#10b981]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#94a3b8] block mb-1">STAGING AGENT URL</label>
                      <input
                        type="text"
                        value={activeWs.stg_agent_url || ''}
                        onChange={(e) => handleUpdateWsAgentUrl('stg_agent_url', e.target.value)}
                        className="w-full text-xs py-2 px-3 bg-[#0a0d14]/70 border border-[#232a3f]/75 rounded-lg text-white font-mono focus:outline-none focus:border-[#10b981]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#94a3b8] block mb-1">PROD AGENT URL</label>
                      <input
                        type="text"
                        value={activeWs.prod_agent_url || ''}
                        onChange={(e) => handleUpdateWsAgentUrl('prod_agent_url', e.target.value)}
                        className="w-full text-xs py-2 px-3 bg-[#0a0d14]/70 border border-[#232a3f]/75 rounded-lg text-white font-mono focus:outline-none focus:border-[#10b981]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: ORIGINAL TABLE LAYOUT FOR DEPLOYMENT SCRIPTS PER SERVICE */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl border border-[#232a3f]/75 bg-[#0a0d14]/70">
                <span className="text-xs font-bold text-[#94a3b8] uppercase flex items-center gap-2">
                  <Code className="w-4 h-4 text-[#10b981]" /> Selected Workspace Target:
                </span>
                <select
                  value={selectedWsId}
                  onChange={(e) => handleSelectWorkspace(e.target.value)}
                  className="text-xs py-1.5 px-4 bg-[#111520] border border-[#232a3f]/75 rounded-lg text-[#10b981] font-bold focus:outline-none cursor-pointer"
                >
                  {localSettings.workspaces?.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="border border-[#232a3f]/75 rounded-xl overflow-hidden bg-[#0a0d14]/70">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#232a3f]/75 bg-white/5 text-[#94a3b8] font-bold">
                      <th className="p-3 w-12 text-center">#</th>
                      <th className="p-3 w-44">Service Name</th>
                      <th className="p-3 w-40">Folder</th>
                      <th className="p-3">DEV Script</th>
                      <th className="p-3">Staging Script</th>
                      <th className="p-3">Prod Script</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicesToEdit.map((svc, idx) => (
                      <tr key={svc.name} className="border-b border-[#232a3f]/75/40 hover:bg-white/[0.02]">
                        <td className="p-3 text-center text-[#94a3b8] font-mono">{idx + 1}</td>
                        <td className="p-3 font-bold text-white">{svc.name}</td>
                        <td className="p-3 font-mono text-[#94a3b8]">{svc.folder || svc.name}</td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={svc.dev_cmd || svc.dev_script || ''}
                            onChange={(e) => {
                              handleUpdateServiceScript(svc.name, 'dev_cmd', e.target.value);
                              handleUpdateServiceScript(svc.name, 'dev_script', e.target.value);
                            }}
                            placeholder="./deploy-dev.sh"
                            className="w-full text-xs py-1.5 px-2.5 bg-[#111520] border border-[#232a3f]/75 rounded-md text-white font-mono focus:outline-none focus:border-[#10b981]"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={svc.stg_cmd || svc.stg_script || ''}
                            onChange={(e) => {
                              handleUpdateServiceScript(svc.name, 'stg_cmd', e.target.value);
                              handleUpdateServiceScript(svc.name, 'stg_script', e.target.value);
                            }}
                            placeholder="./deploy-stg.sh"
                            className="w-full text-xs py-1.5 px-2.5 bg-[#111520] border border-[#232a3f]/75 rounded-md text-white font-mono focus:outline-none focus:border-[#10b981]"
                          />
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={svc.prod_cmd || svc.prod_script || ''}
                            onChange={(e) => {
                              handleUpdateServiceScript(svc.name, 'prod_cmd', e.target.value);
                              handleUpdateServiceScript(svc.name, 'prod_script', e.target.value);
                            }}
                            placeholder="./deploy-prod.sh"
                            className="w-full text-xs py-1.5 px-2.5 bg-[#111520] border border-[#232a3f]/75 rounded-md text-white font-mono focus:outline-none focus:border-[#10b981]"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#232a3f]/75 flex justify-end gap-3 bg-[#0d1017]">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-[#232a3f]/75 text-[#94a3b8] hover:text-white transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-[#10b981] text-white flex items-center gap-2 shadow-lg hover:bg-emerald-600 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
