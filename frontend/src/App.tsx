import React, { useState, useEffect } from 'react';
import { BackgroundCanvas } from './components/BackgroundCanvas';
import { HeaderBar } from './components/HeaderBar';
import { ServiceSidebar } from './components/ServiceSidebar';
import { DeploymentPanel } from './components/DeploymentPanel';
import { TerminalView } from './components/TerminalView';
import { GlobalSettingsModal } from './components/modals/GlobalSettingsModal';
import { MultiDeployModal } from './components/modals/MultiDeployModal';
import { CompareModal } from './components/modals/CompareModal';
import { GitModal } from './components/modals/GitModal';
import { VPNModal } from './components/modals/VPNModal';
import { Service, Settings } from './types';

export const App: React.FC = () => {
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    return localStorage.getItem('ids_theme') === 'light';
  });

  const [settings, setSettings] = useState<Settings>({
    active_workspace_id: 'default',
    workspace_url: '/home/thang/work/deploy-tool',
    workspaces: [
      {
        id: 'default',
        name: 'deploy-tool',
        path: '/home/thang/work/deploy-tool',
        dev_agent_url: 'http://localhost:8081',
        stg_agent_url: 'http://localhost:8081',
        prod_agent_url: 'http://localhost:8081'
      }
    ],
    user_name: 'thang',
    git_bash_path: '',
    dev_agent_url: 'http://localhost:8081',
    stg_agent_url: 'http://localhost:8081',
    prod_agent_url: 'http://localhost:8081',
    pre_deploy_cmd: '',
    services: []
  });

  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentEnv, setCurrentEnv] = useState<string>('Development');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string>('default');
  const [deployLogs, setDeployLogs] = useState<string>('No deployment logs available.');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [pwdPath, setPwdPath] = useState<string>('~');

  // Modals visibility
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMultiDeployOpen, setIsMultiDeployOpen] = useState<boolean>(false);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [isGitOpen, setIsGitOpen] = useState<boolean>(false);
  const [isVPNOpen, setIsVPNOpen] = useState<boolean>(false);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-theme');
      localStorage.setItem('ids_theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      localStorage.setItem('ids_theme', 'dark');
    }
  }, [isLightMode]);

  const fetchServicesForWorkspace = async (wsId: string) => {
    try {
      const res = await fetch(`/api/services?workspace_id=${encodeURIComponent(wsId)}`);
      if (res.ok) {
        const data: Service[] = await res.json();
        setServices(data || []);
        if (data && data.length > 0) {
          setSelectedService(data[0]);
        } else {
          setSelectedService(null);
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const loadSettingsAndServices = async () => {
    try {
      const setRes = await fetch('/api/settings');
      let targetWsId = activeWorkspaceId;
      if (setRes.ok) {
        const data: Settings = await setRes.json();
        setSettings(data);
        if (data.workspaces && data.workspaces.length > 0) {
          targetWsId = data.active_workspace_id || data.workspaces[0].id;
          setActiveWorkspaceId(targetWsId);
        }
      }
      await fetchServicesForWorkspace(targetWsId);
    } catch (e) {
      // Fallback
    }
  };

  useEffect(() => {
    loadSettingsAndServices();
  }, []);

  const handleWorkspaceChange = async (wsId: string) => {
    setActiveWorkspaceId(wsId);
    setSelectedService(null);
    try {
      await fetch('/api/switch_workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: wsId })
      });
    } catch (e) {
      // ignore
    }
    await fetchServicesForWorkspace(wsId);
  };

  const handleToggleTheme = () => {
    setIsLightMode(prev => !prev);
  };

  const handleTriggerDeploy = async (msg: string) => {
    if (!selectedService) return;
    setIsDeploying(true);
    setDeployLogs(`🚀 [${new Date().toLocaleTimeString()}] Initiating real deployment for [${selectedService.name}] on ${currentEnv}...\nMessage: ${msg || 'Routine deployment'}\nWorkspace: ${activeWorkspaceId}\n\n`);

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_name: selectedService.name,
          environment: currentEnv,
          message: msg,
          workspace_id: activeWorkspaceId
        })
      });

      if (res.ok) {
        const result = await res.json();
        setDeployLogs(prev => prev + `[Output]: ${result.output || 'Deployment script executed successfully.'}\n✅ Status: Success`);
      } else {
        const errText = await res.text();
        setDeployLogs(prev => prev + `❌ [Error]: ${errText || 'Deployment failed.'}`);
      }
    } catch (err: any) {
      setDeployLogs(prev => prev + `❌ [Network Error]: ${err.message || 'Failed to reach backend deployment endpoint.'}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleTriggerMultiDeploy = async (selectedNames: string[], env: string, msg: string) => {
    setIsDeploying(true);
    setDeployLogs(`⚡ [${new Date().toLocaleTimeString()}] Initiating parallel multi-deploy for (${selectedNames.length}) services on ${env}...\nBatch Services: ${selectedNames.join(', ')}\n\n`);

    try {
      const res = await fetch('/api/multi_deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          services: selectedNames,
          environment: env,
          message: msg,
          workspace_id: activeWorkspaceId
        })
      });

      if (res.ok) {
        const data = await res.json();
        setDeployLogs(prev => prev + `[Parallel Output]: ${JSON.stringify(data, null, 2)}\n✅ Parallel Multi-Deploy completed!`);
      } else {
        const errText = await res.text();
        setDeployLogs(prev => prev + `❌ Multi-Deploy Error: ${errText}`);
      }
    } catch (err: any) {
      setDeployLogs(prev => prev + `❌ Multi-Deploy Network Exception: ${err.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleSaveSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      await loadSettingsAndServices();
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden text-[#f1f5f9] font-sans antialiased">
      <BackgroundCanvas isLightMode={isLightMode} />

      <HeaderBar
        isLightMode={isLightMode}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenMultiDeploy={() => setIsMultiDeployOpen(true)}
        onOpenCompare={() => setIsCompareOpen(true)}
        onToggleGit={() => setIsGitOpen(prev => !prev)}
        onToggleVPN={() => setIsVPNOpen(prev => !prev)}
        onRefresh={loadSettingsAndServices}
      />

      <div className="flex flex-1 overflow-hidden">
        <ServiceSidebar
          services={services}
          selectedService={selectedService}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectService={setSelectedService}
        />

        <main className="flex-1 p-6 flex flex-col gap-5 overflow-hidden">
          <DeploymentPanel
            selectedService={selectedService}
            workspaces={settings.workspaces || []}
            activeWorkspaceId={activeWorkspaceId}
            userName={settings.user_name}
            currentEnv={currentEnv}
            onEnvChange={setCurrentEnv}
            onWorkspaceChange={handleWorkspaceChange}
            onTriggerDeploy={handleTriggerDeploy}
            isDeploying={isDeploying}
          />

          <TerminalView
            selectedServiceName={selectedService?.name}
            pwdPath={pwdPath}
            deployLogs={deployLogs}
          />
        </main>
      </div>

      {/* Modals */}
      <GlobalSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      <MultiDeployModal
        isOpen={isMultiDeployOpen}
        onClose={() => setIsMultiDeployOpen(false)}
        services={services}
        onTriggerMultiDeploy={handleTriggerMultiDeploy}
      />

      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        services={services}
      />

      <GitModal
        isOpen={isGitOpen}
        onClose={() => setIsGitOpen(false)}
        selectedService={selectedService}
      />

      <VPNModal
        isOpen={isVPNOpen}
        onClose={() => setIsVPNOpen(false)}
      />
    </div>
  );
};

export default App;
