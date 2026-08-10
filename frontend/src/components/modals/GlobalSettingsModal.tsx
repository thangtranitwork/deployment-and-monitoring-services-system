import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, Folder, Server, ChevronDown } from 'lucide-react';
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
      const initialWsId = settings.active_workspace_id || (settings.workspaces?.[0]?.id ?? 'default');
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

  const handleUpdateServiceField = (svcIdx: number, field: string, value: any) => {
    if (!activeWs) return;
    setLocalSettings(prev => ({
      ...prev,
      workspaces: (prev.workspaces || []).map(w => {
        if (w.id !== activeWs.id) return w;
        const currentServices = (w.services && w.services.length > 0) ? w.services : (prev.services || []);
        const svcs = [...currentServices];
        if (svcs[svcIdx]) {
          const updated: any = { ...svcs[svcIdx], [field]: value };
          if (field === 'show' || field === 'enabled') {
            updated.enabled = Boolean(value);
            updated.show = Boolean(value);
          }
          if (field === 'pre_deploy' || field === 'pre_deploy_cmd') {
            updated.pre_deploy_cmd = value;
            updated.pre_deploy = value;
          }
          if (field === 'dev_cmd') updated.dev_script = value;
          if (field === 'stg_cmd') updated.stg_script = value;
          if (field === 'prod_cmd') updated.prod_script = value;

          svcs[svcIdx] = updated;
        }
        return { ...w, services: svcs };
      })
    }));
  };

  const handleAddCustomServiceRow = () => {
    if (!activeWs) return;
    const newSvc: ServiceConfig = {
      name: 'new-service-go',
      folder: 'new-service',
      enabled: true,
      show: true,
      dev_cmd: './deploy-dev.sh',
      stg_cmd: './deploy-stg.sh',
      show_production: false,
      prod_cmd: './deploy-prod.sh',
      prod_pwd: '',
      pre_deploy_cmd: ''
    };

    setLocalSettings(prev => ({
      ...prev,
      workspaces: (prev.workspaces || []).map(w => {
        if (w.id !== activeWs.id) return w;
        const currentServices = (w.services && w.services.length > 0) ? w.services : (prev.services || []);
        const svcs = [...currentServices, newSvc];
        return { ...w, services: svcs };
      })
    }));
  };

  const handleDeleteServiceRow = (svcIdx: number) => {
    if (!activeWs) return;
    setLocalSettings(prev => ({
      ...prev,
      workspaces: (prev.workspaces || []).map(w => {
        if (w.id !== activeWs.id) return w;
        const currentServices = (w.services && w.services.length > 0) ? w.services : (prev.services || []);
        const svcs = [...currentServices];
        svcs.splice(svcIdx, 1);
        return { ...w, services: svcs };
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
      dev_agent_url: 'http://localhost:8555',
      stg_agent_url: 'http://localhost:8555',
      prod_agent_url: 'http://localhost:8555',
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
    <div className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0e17] border border-white/10 rounded-3xl w-[94vw] max-w-[1350px] h-[88vh] max-h-[900px] flex flex-col shadow-2xl overflow-hidden text-white font-sans">
        
        {/* Modal Header Bar with Prominent Close Button */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#070912]/95 flex justify-between items-center shrink-0">
          <h2 className="text-sm font-bold text-white flex items-center gap-2 tracking-wide uppercase">
            ⚙️ Global Settings
          </h2>

          <button
            type="button"
            onClick={onClose}
            title="Close (Esc)"
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-all cursor-pointer font-bold text-lg outline-none"
          >
            ✕
          </button>
        </div>

        {/* Modal Nav Tabs (Sleek Pills Design) */}
        <div className="px-6 py-3 border-b border-white/10 bg-black/30 flex justify-between items-center shrink-0">
          <div className="flex gap-2 p-1 bg-black/40 border border-white/10 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('core')}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none ${
                activeTab === 'core'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
              }`}
            >
              Core Workspaces & Agents
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('deploy')}
              className={`px-5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer outline-none ${
                activeTab === 'deploy'
                  ? 'bg-emerald-500 text-white shadow-lg'
                  : 'text-[#94a3b8] hover:text-white hover:bg-white/5'
              }`}
            >
              Deployment Scripts per Workspace
            </button>
          </div>
        </div>

        {/* Modal Content Workspace */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-[#05070d]">
          {activeTab === 'core' ? (
            /* TAB 1: CORE WORKSPACES & AGENTS */
            <div className="max-w-4xl mx-auto space-y-6">
              {/* User info & Git Bash path */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[11px] font-bold text-[#94a3b8] uppercase block mb-1">Your Name</label>
                  <input
                    type="text"
                    value={localSettings.user_name || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, user_name: e.target.value }))}
                    placeholder="John Doe"
                    className="w-full text-xs py-2.5 px-3.5 bg-black/50 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-[#94a3b8] uppercase block mb-1">Git Bash Path (Windows)</label>
                  <input
                    type="text"
                    value={localSettings.git_bash_path || ''}
                    onChange={(e) => setLocalSettings(prev => ({ ...prev, git_bash_path: e.target.value }))}
                    placeholder="C:\Program Files\Git\bin\bash.exe"
                    className="w-full text-xs py-2.5 px-3.5 bg-black/50 border border-white/10 rounded-xl text-white outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              {/* Workspaces list */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider">Registered Workspaces</span>
                  <button
                    type="button"
                    onClick={handleAddWorkspace}
                    className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-bold flex items-center gap-1.5 hover:bg-emerald-600 cursor-pointer shadow-md transition-all outline-none"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Workspace
                  </button>
                </div>

                <div className="border border-white/10 rounded-2xl overflow-hidden bg-black/40">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/5 text-[#94a3b8] font-bold">
                        <th className="p-3 w-10 text-center">Active</th>
                        <th className="p-3">Workspace Name</th>
                        <th className="p-3">Path</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {localSettings.workspaces?.map((ws) => {
                        const isSelected = selectedWsId === ws.id || activeWs?.id === ws.id;
                        return (
                          <tr
                            key={ws.id}
                            onClick={() => handleSelectWorkspace(ws.id)}
                            className={`border-b border-white/5 cursor-pointer transition-all ${
                              isSelected ? 'bg-emerald-500/15 font-semibold text-white' : 'hover:bg-white/5 text-[#94a3b8]'
                            }`}
                          >
                            <td className="p-3 text-center">
                              <input
                                type="radio"
                                name="active_ws"
                                checked={isSelected}
                                onChange={() => handleSelectWorkspace(ws.id)}
                                className="accent-emerald-500 cursor-pointer"
                              />
                            </td>
                            <td className="p-3 font-bold text-white flex items-center gap-2">
                              <Folder className="w-4 h-4 text-emerald-400 shrink-0" />
                              {ws.name}
                            </td>
                            <td className="p-3 font-mono text-[#94a3b8] truncate max-w-[350px]">{ws.path}</td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteWorkspace(ws.id);
                                }}
                                className="p-1.5 rounded-md hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer border-none outline-none"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Agent URLs for Workspace */}
              {activeWs && (
                <div className="p-4 rounded-2xl border border-white/10 bg-black/40 space-y-3">
                  <div className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2">
                    <Server className="w-4 h-4" /> Agent URLs for Workspace: <strong className="text-white">{activeWs.name}</strong>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#94a3b8] block mb-1">DEV AGENT URL</label>
                      <input
                        type="text"
                        value={activeWs.dev_agent_url || ''}
                        onChange={(e) => handleUpdateWsAgentUrl('dev_agent_url', e.target.value)}
                        placeholder="http://localhost:8555"
                        className="w-full text-xs py-2 px-3 bg-black/50 border border-white/10 rounded-xl text-white font-mono outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#94a3b8] block mb-1">STAGING AGENT URL</label>
                      <input
                        type="text"
                        value={activeWs.stg_agent_url || ''}
                        onChange={(e) => handleUpdateWsAgentUrl('stg_agent_url', e.target.value)}
                        placeholder="http://localhost:8555"
                        className="w-full text-xs py-2 px-3 bg-black/50 border border-white/10 rounded-xl text-white font-mono outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[#94a3b8] block mb-1">PROD AGENT URL</label>
                      <input
                        type="text"
                        value={activeWs.prod_agent_url || ''}
                        onChange={(e) => handleUpdateWsAgentUrl('prod_agent_url', e.target.value)}
                        placeholder="http://localhost:8555"
                        className="w-full text-xs py-2 px-3 bg-black/50 border border-white/10 rounded-xl text-white font-mono outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* TAB 2: DEPLOYMENT SCRIPTS PER WORKSPACE */
            <div className="space-y-4 flex flex-col h-full min-h-0">
              {/* Header Workspace selector & Add Custom Row button */}
              <div className="flex justify-between items-center gap-4 shrink-0 bg-black/40 p-3 px-4 rounded-2xl border border-white/10">
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                  <span className="text-xs font-semibold text-[#94a3b8]">Target Workspace:</span>
                  <div className="relative flex items-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3.5 py-1 transition-all">
                    <select
                      value={selectedWsId}
                      onChange={(e) => handleSelectWorkspace(e.target.value)}
                      className="bg-transparent text-xs font-bold text-emerald-400 font-mono outline-none border-none appearance-none pr-5 cursor-pointer"
                    >
                      {localSettings.workspaces?.map((w) => (
                        <option key={w.id} value={w.id} className="bg-[#0b0e17] text-white">{w.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-emerald-400 pointer-events-none absolute right-3" />
                  </div>

                  <span className="text-xs text-[#94a3b8] font-mono truncate">
                    Path: <strong className="text-white">{activeWs?.path}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleAddCustomServiceRow}
                  className="px-4 py-1.5 text-xs font-bold rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1.5 cursor-pointer shadow-md shrink-0 outline-none transition-all"
                >
                  ➕ Add Custom Row
                </button>
              </div>

              {/* 10-Column Full Deployment Table */}
              <div className="flex-1 border border-white/10 rounded-2xl overflow-y-auto bg-black/40 min-h-0">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/5 text-[#94a3b8] font-bold sticky top-0 z-10 backdrop-blur-md">
                      <th className="p-2.5 w-12 text-center">Show</th>
                      <th className="p-2.5 w-36">Folder Name</th>
                      <th className="p-2.5 w-36">Service Name</th>
                      <th className="p-2.5 w-32">Dev Cmd</th>
                      <th className="p-2.5 w-32">Stg Cmd</th>
                      <th className="p-2.5 w-12 text-center">Prod</th>
                      <th className="p-2.5 w-32">Prod Cmd</th>
                      <th className="p-2.5 w-28">Prod Pwd</th>
                      <th className="p-2.5 w-32">Pre-deploy</th>
                      <th className="p-2.5 w-12 text-center">Act</th>
                    </tr>
                  </thead>
                  <tbody>
                    {servicesToEdit.map((svc, idx) => {
                      const isEnabled = svc.enabled !== false && svc.show !== false;
                      return (
                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-all">
                          {/* Show Checkbox */}
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => handleUpdateServiceField(idx, 'enabled', e.target.checked)}
                              className="accent-emerald-500 cursor-pointer w-4 h-4"
                            />
                          </td>

                          {/* Folder Name */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={svc.folder || svc.name}
                              onChange={(e) => handleUpdateServiceField(idx, 'folder', e.target.value)}
                              className="w-full text-xs py-1.5 px-2 bg-black/50 border border-white/10 rounded-lg text-white font-mono outline-none focus:border-emerald-500 transition-all"
                            />
                          </td>

                          {/* Service Name */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={svc.name}
                              onChange={(e) => handleUpdateServiceField(idx, 'name', e.target.value)}
                              className="w-full text-xs py-1.5 px-2 bg-black/50 border border-white/10 rounded-lg text-white font-bold outline-none focus:border-emerald-500 transition-all"
                            />
                          </td>

                          {/* Dev Cmd */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={svc.dev_cmd || svc.dev_script || ''}
                              onChange={(e) => handleUpdateServiceField(idx, 'dev_cmd', e.target.value)}
                              placeholder="./deploy-dev.sh"
                              className="w-full text-xs py-1.5 px-2 bg-black/50 border border-white/10 rounded-lg text-white font-mono outline-none focus:border-emerald-500 transition-all"
                            />
                          </td>

                          {/* Stg Cmd */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={svc.stg_cmd || svc.stg_script || ''}
                              onChange={(e) => handleUpdateServiceField(idx, 'stg_cmd', e.target.value)}
                              placeholder="./deploy-stg.sh"
                              className="w-full text-xs py-1.5 px-2 bg-black/50 border border-white/10 rounded-lg text-white font-mono outline-none focus:border-emerald-500 transition-all"
                            />
                          </td>

                          {/* Prod Checkbox */}
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={svc.show_production === true}
                              onChange={(e) => handleUpdateServiceField(idx, 'show_production', e.target.checked)}
                              className="accent-emerald-500 cursor-pointer w-4 h-4"
                            />
                          </td>

                          {/* Prod Cmd */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={svc.prod_cmd || svc.prod_script || ''}
                              onChange={(e) => handleUpdateServiceField(idx, 'prod_cmd', e.target.value)}
                              placeholder="./deploy-prod.sh"
                              className="w-full text-xs py-1.5 px-2 bg-black/50 border border-white/10 rounded-lg text-white font-mono outline-none focus:border-emerald-500 transition-all"
                            />
                          </td>

                          {/* Prod Pwd */}
                          <td className="p-2.5">
                            <input
                              type="password"
                              value={svc.prod_pwd || svc.prod_password_hash || ''}
                              onChange={(e) => handleUpdateServiceField(idx, 'prod_pwd', e.target.value)}
                              placeholder="Password"
                              className="w-full text-xs py-1.5 px-2 bg-black/50 border border-white/10 rounded-lg text-white font-mono outline-none focus:border-emerald-500 transition-all"
                            />
                          </td>

                          {/* Pre-deploy */}
                          <td className="p-2.5">
                            <input
                              type="text"
                              value={svc.pre_deploy_cmd || svc.pre_deploy || ''}
                              onChange={(e) => handleUpdateServiceField(idx, 'pre_deploy_cmd', e.target.value)}
                              placeholder="go mod tidy"
                              className="w-full text-xs py-1.5 px-2 bg-black/50 border border-white/10 rounded-lg text-white font-mono outline-none focus:border-emerald-500 transition-all"
                            />
                          </td>

                          {/* Act (Delete Row) */}
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteServiceRow(idx)}
                              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 transition-all cursor-pointer border-none outline-none"
                              title="Delete Service Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end gap-3 bg-[#070912]/95 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-full border border-white/10 text-[#94a3b8] hover:text-white transition-all cursor-pointer outline-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 text-xs font-bold rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-2 shadow-md transition-all cursor-pointer outline-none"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
