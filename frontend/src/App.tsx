import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
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
import { HealthMonitorModal } from './components/modals/HealthMonitorModal';
import { ProdPasswordModal } from './components/modals/ProdPasswordModal';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { ToolsPage } from './pages/ToolsPage';
import { CyberLoader } from './components/CyberLoader';
import { Service, Settings } from './types';

export const App: React.FC = () => {
  const navigate = useNavigate();

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
        dev_agent_url: 'http://localhost:8555',
        stg_agent_url: 'http://localhost:8555',
        prod_agent_url: 'http://localhost:8555'
      }
    ],
    user_name: 'thang',
    git_bash_path: '',
    dev_agent_url: 'http://localhost:8555',
    stg_agent_url: 'http://localhost:8555',
    prod_agent_url: 'http://localhost:8555',
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
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState<boolean>(false);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  // Modals visibility
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMultiDeployOpen, setIsMultiDeployOpen] = useState<boolean>(false);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [isGitOpen, setIsGitOpen] = useState<boolean>(false);
  const [isVPNOpen, setIsVPNOpen] = useState<boolean>(false);
  const [isHealthOpen, setIsHealthOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isProdPassOpen, setIsProdPassOpen] = useState<boolean>(false);
  const [pendingDeployMsg, setPendingDeployMsg] = useState<string>('');
  const [vpnState, setVpnState] = useState<string>('disconnected');

  const checkVPNStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        if (data && data.status) {
          setVpnState(data.status);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkVPNStatus();
    const interval = setInterval(checkVPNStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isLightMode) {
      document.body.classList.add('light-theme');
      localStorage.setItem('ids_theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      localStorage.setItem('ids_theme', 'dark');
    }
  }, [isLightMode]);

  const handleToggleTheme = () => {
    setIsLightMode(prev => !prev);
  };

  const fetchServicesForWorkspace = async (wsId?: string) => {
    const targetId = wsId || activeWorkspaceId;
    try {
      const res = await fetch(`/api/services?workspace_id=${targetId}`);
      if (res.ok) {
        const data = await res.json();
        const list: Service[] = Array.isArray(data) ? data : data.services || [];
        setServices(list);
        if (list.length > 0) {
          setSelectedService(prev => {
            if (!prev) return list[0];
            const updated = list.find(s => s.name === prev.name);
            return updated || list[0];
          });
        }
      }
    } catch (e) {
      setServices([]);
    }
  };

  // Initial load ONCE on mount
  useEffect(() => {
    let isMounted = true;
    const initApp = async () => {
      try {
        const setRes = await fetch('/api/settings');
        let targetWsId = 'default';
        if (setRes.ok) {
          const data: Settings = await setRes.json();
          if (isMounted) setSettings(data);
          if (data.workspaces && data.workspaces.length > 0) {
            targetWsId = data.active_workspace_id || data.workspaces[0].id;
            if (isMounted) setActiveWorkspaceId(targetWsId);
          }
        }
        await fetchServicesForWorkspace(targetWsId);
      } catch (e) {
        await fetchServicesForWorkspace();
      } finally {
        if (isMounted) {
          setTimeout(() => setIsInitialLoading(false), 400);
        }
      }
    };

    initApp();

    const interval = setInterval(() => {
      fetchServicesForWorkspace();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey) {
        switch (e.key.toUpperCase()) {
          case 'M':
            e.preventDefault();
            setIsMultiDeployOpen(prev => !prev);
            break;
          case 'G':
            e.preventDefault();
            setIsGitOpen(prev => !prev);
            break;
          case 'U':
            e.preventDefault();
            setIsVPNOpen(prev => !prev);
            break;
          case 'T':
            e.preventDefault();
            navigate('/tools');
            break;
          case 'I':
            e.preventDefault();
            setIsSettingsOpen(prev => !prev);
            break;
          case 'R':
            e.preventDefault();
            fetchServicesForWorkspace();
            break;
          case 'H':
            e.preventDefault();
            setIsShortcutsOpen(prev => !prev);
            break;
        }
      } else if (e.key === 'Escape') {
        setIsSettingsOpen(false);
        setIsMultiDeployOpen(false);
        setIsCompareOpen(false);
        setIsGitOpen(false);
        setIsVPNOpen(false);
        setIsHealthOpen(false);
        setIsShortcutsOpen(false);
        setIsProdPassOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleWorkspaceChange = async (wsId: string) => {
    setIsSwitchingWorkspace(true);
    setActiveWorkspaceId(wsId);
    setSelectedService(null);
    try {
      const res = await fetch('/api/workspaces/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspace_id: wsId })
      });
      if (res.ok) {
        const setRes = await fetch('/api/settings');
        if (setRes.ok) {
          const data: Settings = await setRes.json();
          setSettings(data);
        }
      }
      await fetchServicesForWorkspace(wsId);
    } catch (e) {
      await fetchServicesForWorkspace(wsId);
    } finally {
      setTimeout(() => setIsSwitchingWorkspace(false), 400);
    }
  };

  const executeRealDeploy = async (msg: string, prodPassword?: string) => {
    if (!selectedService) return;
    setTerminalTab('deploy');
    setIsDeploying(true);
    setDeployLogs(`🚀 [${new Date().toLocaleTimeString()}] Starting deployment for [${selectedService.name}] on ${currentEnv}...\nCommit Message: ${msg || 'None'}\n\n`);

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: selectedService.name,
          env: currentEnv,
          message: msg,
          password: prodPassword,
          workspace_id: activeWorkspaceId
        })
      });

      if (res.status === 401) {
        setDeployLogs(prev => prev + '\n❌ Access Denied: Invalid production password.\n');
        return;
      }

      if (!res.ok) {
        const errText = await res.text();
        setDeployLogs(prev => prev + `❌ [Error]: ${errText || 'Deployment failed.'}\n`);
        return;
      }

      if (!res.body) {
        setDeployLogs(prev => prev + '❌ Failed to read deployment stream.\n');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split('\n\n');
        for (const event of events) {
          const trimmed = event.trimStart();
          if (trimmed.startsWith('data: ')) {
            const content = trimmed.slice(6);
            if (content.trim() === '[EOF]') {
              setDeployLogs(prev => prev + '\n✅ Deployment completed successfully!\n');
            } else {
              setDeployLogs(prev => prev + content + '\n');
            }
          }
        }
      }
    } catch (err: any) {
      setDeployLogs(prev => prev + `❌ [Network Error]: ${err.message || 'Failed to reach backend deployment endpoint.'}\n`);
    } finally {
      setIsDeploying(false);
      fetchServicesForWorkspace();
    }
  };

  const handleTriggerDeploy = (msg: string) => {
    setTerminalTab('deploy');
    if (currentEnv === 'Production') {
      setPendingDeployMsg(msg);
      setIsProdPassOpen(true);
    } else {
      executeRealDeploy(msg);
    }
  };

  const handleConfirmProdPassword = (password: string) => {
    setIsProdPassOpen(false);
    executeRealDeploy(pendingDeployMsg, password);
  };

  const handleTriggerMultiDeploy = async (selectedNames: string[], env: string, msg: string) => {
    setTerminalTab('deploy');
    setIsDeploying(true);
    setDeployLogs(`⚡ [${new Date().toLocaleTimeString()}] Initiating parallel multi-deploy for (${selectedNames.length}) services on ${env}...\nBatch Services: ${selectedNames.join(', ')}\n\n`);

    try {
      const res = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          services: selectedNames,
          env: env,
          message: msg,
          workspace_id: activeWorkspaceId
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        setDeployLogs(prev => prev + `❌ Multi-Deploy Error: ${errText}\n`);
        return;
      }

      if (!res.body) {
        setDeployLogs(prev => prev + '❌ Failed to read multi-deploy stream.\n');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split('\n\n');
        for (const event of events) {
          const trimmed = event.trimStart();
          if (trimmed.startsWith('data: ')) {
            const content = trimmed.slice(6);
            if (content.trim() === '[EOF]') {
              setDeployLogs(prev => prev + '\n✅ Parallel Multi-Deploy completed!\n');
            } else {
              setDeployLogs(prev => prev + content + '\n');
            }
          }
        }
      }
    } catch (err: any) {
      setDeployLogs(prev => prev + `❌ Multi-Deploy Exception: ${err.message}\n`);
    } finally {
      setIsDeploying(false);
      fetchServicesForWorkspace();
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
      await fetchServicesForWorkspace();
    } catch (e) {
      // ignore
    }
  };

  const [terminalTab, setTerminalTab] = useState<'pty' | 'deploy'>('pty');

  const handleOpenLogs = () => {
    setTerminalTab('deploy');
    if (selectedService) {
      const metric = selectedService.metrics?.[currentEnv];
      if (metric && metric.stats_port && metric.stats_port !== 'N/A') {
        const agentUrl = currentEnv === 'Development' ? settings.dev_agent_url :
                         currentEnv === 'Staging' ? settings.stg_agent_url : settings.prod_agent_url;
        try {
          const host = agentUrl ? new URL(agentUrl).hostname : window.location.hostname;
          window.open(`http://${host}:${metric.stats_port}`, '_blank');
        } catch {
          window.open(`http://${window.location.hostname}:${metric.stats_port}`, '_blank');
        }
      }
    }
  };

  return (
    <Routes>
      {/* Route 1: Dedicated React SPA Tools Page */}
      <Route
        path="/tools"
        element={<ToolsPage onBackToDashboard={() => navigate('/')} />}
      />

      {/* Route 2: Main Deploy System Dashboard */}
      <Route
        path="*"
        element={
          <div className="flex flex-col h-screen w-screen overflow-hidden text-[#f1f5f9] font-sans antialiased">
            <BackgroundCanvas isLightMode={isLightMode} />

            <HeaderBar
              isLightMode={isLightMode}
              vpnState={vpnState}
              onToggleTheme={handleToggleTheme}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenMultiDeploy={() => setIsMultiDeployOpen(true)}
              onOpenCompare={() => setIsCompareOpen(true)}
              onToggleGit={() => setIsGitOpen(prev => !prev)}
              onToggleVPN={() => setIsVPNOpen(prev => !prev)}
              onOpenTools={() => navigate('/tools')}
              onOpenHealth={() => setIsHealthOpen(true)}
              onOpenShortcuts={() => setIsShortcutsOpen(true)}
              onRefresh={fetchServicesForWorkspace}
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
                  onRefresh={fetchServicesForWorkspace}
                  onOpenLogs={handleOpenLogs}
                />

                <TerminalView
                  selectedServiceName={selectedService?.name}
                  pwdPath={pwdPath}
                  deployLogs={deployLogs}
                  activeTab={terminalTab}
                  onTabChange={setTerminalTab}
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
              onOpenMultiDeploy={() => setIsMultiDeployOpen(true)}
              services={services}
            />

            <GitModal
              isOpen={isGitOpen}
              onClose={() => setIsGitOpen(false)}
              selectedService={selectedService}
              services={services}
              onSelectService={setSelectedService}
            />

            <VPNModal
              isOpen={isVPNOpen}
              onClose={() => setIsVPNOpen(false)}
              onStateChange={setVpnState}
            />

            <HealthMonitorModal
              isOpen={isHealthOpen}
              onClose={() => setIsHealthOpen(false)}
            />

            <ShortcutsModal
              isOpen={isShortcutsOpen}
              onClose={() => setIsShortcutsOpen(false)}
            />

            <ProdPasswordModal
              isOpen={isProdPassOpen}
              onClose={() => setIsProdPassOpen(false)}
              onConfirm={handleConfirmProdPassword}
              targetAction={selectedService?.name || 'Service'}
            />

            {(isInitialLoading || isSwitchingWorkspace) && (
              <CyberLoader
                fullScreen
                size="xl"
                title={isInitialLoading ? "INITIALIZING INTERNAL DEPLOY SYSTEM..." : "SWITCHING WORKSPACE ENGINE..."}
                subtitle="Loading microservices, workspace settings & server telemetry"
              />
            )}
          </div>
        }
      />
    </Routes>
  );
};

export default App;
