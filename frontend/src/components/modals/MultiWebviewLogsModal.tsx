import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  Grid,
  LayoutList,
  Search,
  Globe,
  Activity,
  CheckSquare,
  Square,
  Sparkles
} from 'lucide-react';
import { Service } from '../../types';

interface MultiWebviewLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  services: Service[];
  currentEnv: string;
  devAgentUrl?: string;
  stgAgentUrl?: string;
  prodAgentUrl?: string;
  initialFocusService?: string | null;
  targetServiceNames?: string[] | null;
}

export const getServiceLogUrl = (
  service: Service,
  currentEnv: string,
  devAgentUrl?: string,
  stgAgentUrl?: string,
  prodAgentUrl?: string
): string | null => {
  const metric = service.metrics?.[currentEnv];
  if (!metric || !metric.stats_port || metric.stats_port === 'N/A') {
    return null;
  }
  const agentUrl =
    currentEnv === 'Development'
      ? devAgentUrl
      : currentEnv === 'Staging'
      ? stgAgentUrl
      : prodAgentUrl;
  try {
    const host = agentUrl ? new URL(agentUrl).hostname : window.location.hostname;
    return `http://${host}:${metric.stats_port}`;
  } catch {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:${metric.stats_port}`;
  }
};

export const MultiWebviewLogsModal: React.FC<MultiWebviewLogsModalProps> = ({
  isOpen,
  onClose,
  services,
  currentEnv,
  devAgentUrl,
  stgAgentUrl,
  prodAgentUrl,
  initialFocusService,
  targetServiceNames
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'tab'>('grid');
  const [activeTabService, setActiveTabService] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [iframeKeys, setIframeKeys] = useState<Record<string, number>>({});
  const [maximizedService, setMaximizedService] = useState<string | null>(null);
  const [cols, setCols] = useState<number>(2);

  // Extract all services that have active log urls
  const servicesWithLogs = services.filter((svc) => {
    return getServiceLogUrl(svc, currentEnv, devAgentUrl, stgAgentUrl, prodAgentUrl) !== null;
  });

  useEffect(() => {
    if (isOpen) {
      const allLogNames = new Set(servicesWithLogs.map((s) => s.name));

      let initialSet: Set<string>;
      if (targetServiceNames && targetServiceNames.length > 0) {
        initialSet = new Set(targetServiceNames.filter((name) => allLogNames.has(name)));
      } else if (initialFocusService && allLogNames.has(initialFocusService)) {
        initialSet = new Set([initialFocusService]);
      } else {
        initialSet = allLogNames;
      }

      setSelectedServices(initialSet);

      if (initialFocusService && allLogNames.has(initialFocusService)) {
        setActiveTabService(initialFocusService);
      } else if (initialSet.size > 0) {
        setActiveTabService(Array.from(initialSet)[0]);
      } else if (servicesWithLogs.length > 0) {
        setActiveTabService(servicesWithLogs[0].name);
      }
    }
  }, [isOpen, services, currentEnv, initialFocusService, JSON.stringify(targetServiceNames)]);

  if (!isOpen) return null;

  const toggleServiceSelect = (name: string) => {
    const next = new Set(selectedServices);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setSelectedServices(next);
  };

  const handleSelectAll = () => {
    setSelectedServices(new Set(servicesWithLogs.map((s) => s.name)));
  };

  const handleDeselectAll = () => {
    setSelectedServices(new Set());
  };

  const handleReloadIframe = (name: string) => {
    setIframeKeys((prev) => ({
      ...prev,
      [name]: (prev[name] || 0) + 1
    }));
  };

  const handleReloadAllIframes = () => {
    const updated: Record<string, number> = {};
    servicesWithLogs.forEach((s) => {
      updated[s.name] = (iframeKeys[s.name] || 0) + 1;
    });
    setIframeKeys(updated);
  };

  const handleOpenAllInBrowserTabs = () => {
    servicesWithLogs.forEach((svc) => {
      if (selectedServices.has(svc.name)) {
        const url = getServiceLogUrl(svc, currentEnv, devAgentUrl, stgAgentUrl, prodAgentUrl);
        if (url) {
          window.open(url, '_blank');
        }
      }
    });
  };

  const filteredServicesWithLogs = servicesWithLogs.filter(
    (svc) =>
      selectedServices.has(svc.name) &&
      svc.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 md:p-6">
      <div className="relative w-[98vw] max-w-[1600px] h-[95vh] bg-[#090d16] border border-[#232a3f]/80 rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(16,185,129,0.1)] flex flex-col overflow-hidden text-[#f1f5f9]">
        {/* Header Bar */}
        <div className="px-5 py-3 border-b border-[#232a3f]/75 flex flex-wrap justify-between items-center bg-[#0e1320] gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#10b981]/15 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                  <span>📄 Webview Live Logs Hub</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30">
                    {currentEnv}
                  </span>
                </h2>
              </div>
              <p className="text-[11px] text-[#94a3b8]">
                {servicesWithLogs.length} service(s) with live log ports active
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#04060a] border border-[#232a3f]/80 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 shadow-sm'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('tab')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'tab'
                    ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 shadow-sm'
                    : 'text-[#94a3b8] hover:text-white'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Tabbed</span>
              </button>
            </div>

            {/* Grid column selector if grid view */}
            {viewMode === 'grid' && (
              <div className="hidden sm:flex items-center bg-[#04060a] border border-[#232a3f]/80 rounded-lg p-0.5 text-xs text-[#94a3b8]">
                <button
                  type="button"
                  onClick={() => setCols(1)}
                  className={`px-2 py-1 rounded cursor-pointer ${cols === 1 ? 'text-[#10b981] font-bold bg-white/10' : 'hover:text-white'}`}
                >
                  1 col
                </button>
                <button
                  type="button"
                  onClick={() => setCols(2)}
                  className={`px-2 py-1 rounded cursor-pointer ${cols === 2 ? 'text-[#10b981] font-bold bg-white/10' : 'hover:text-white'}`}
                >
                  2 cols
                </button>
                <button
                  type="button"
                  onClick={() => setCols(3)}
                  className={`px-2 py-1 rounded cursor-pointer ${cols === 3 ? 'text-[#10b981] font-bold bg-white/10' : 'hover:text-white'}`}
                >
                  3 cols
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleReloadAllIframes}
              title="Refresh all active webview log streams"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#232a3f]/80 bg-[#141a29]/80 hover:bg-[#232a3f] text-[#f1f5f9] hover:text-[#10b981] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload All</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAllInBrowserTabs}
              title="Open all selected webview log ports in separate browser tabs"
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#10b981]/40 bg-[#10b981]/15 text-[#10b981] hover:bg-[#10b981]/25 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.15)]"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Open Tabs ({selectedServices.size})</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-[#232a3f]/80 text-[#94a3b8] hover:text-white hover:bg-rose-500/20 hover:border-rose-500/40 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter & Selection Controls Bar */}
        <div className="px-5 py-2.5 border-b border-[#232a3f]/75 bg-[#0b0f19] flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-2 flex-wrap flex-1">
            <span className="text-[#94a3b8] font-bold text-[11px] uppercase tracking-wider shrink-0">
              Active Log Services:
            </span>

            {servicesWithLogs.length === 0 ? (
              <span className="text-amber-400 text-xs italic">
                No services have an active stats_port in {currentEnv}
              </span>
            ) : (
              <div className="flex items-center gap-1.5 flex-wrap">
                {servicesWithLogs.map((svc) => {
                  const isChecked = selectedServices.has(svc.name);
                  return (
                    <button
                      key={svc.name}
                      type="button"
                      onClick={() => toggleServiceSelect(svc.name)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]'
                          : 'bg-[#141a29]/50 border-[#232a3f]/75 text-[#94a3b8] hover:text-white'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-3 h-3 text-[#10b981]" />
                      ) : (
                        <Square className="w-3 h-3 text-[#94a3b8]" />
                      )}
                      <span>{svc.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[11px] text-[#10b981] hover:underline font-medium cursor-pointer"
            >
              Select All
            </button>
            <span className="text-[#232a3f]">|</span>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="text-[11px] text-[#94a3b8] hover:underline font-medium cursor-pointer"
            >
              Deselect All
            </button>
            <div className="relative ml-2">
              <Search className="w-3.5 h-3.5 text-[#94a3b8] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter logs..."
                className="pl-8 pr-3 py-1 bg-[#04060a] border border-[#232a3f]/80 rounded-md text-xs text-[#f1f5f9] placeholder-[#94a3b8]/50 focus:outline-none focus:border-[#10b981] w-36"
              />
            </div>
          </div>
        </div>

        {/* Content Body Area */}
        <div className="flex-1 overflow-hidden relative bg-[#06080e] p-3 md:p-4">
          {servicesWithLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#94a3b8]">
              <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">No Active Webview Logs Found</h3>
              <p className="text-xs max-w-md text-[#94a3b8] mb-4">
                None of the services currently running in environment <span className="text-amber-400 font-mono font-bold">[{currentEnv}]</span> have a valid <code className="bg-white/10 px-1 rounded">stats_port</code> stream assigned.
              </p>
              <div className="text-[11px] bg-white/5 border border-white/10 rounded-lg p-3 max-w-lg text-left">
                💡 <strong>Tip:</strong> Ensure your backend services are started or configured with a stats port (e.g. standard stats/log web server enabled on their process).
              </div>
            </div>
          ) : filteredServicesWithLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#94a3b8]">
              <p className="text-sm font-semibold text-white mb-2">No services selected</p>
              <p className="text-xs text-[#94a3b8]">Select at least one service above to display its webview logs.</p>
              <button
                type="button"
                onClick={handleSelectAll}
                className="mt-4 px-4 py-2 text-xs font-bold rounded-lg bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981]/30 transition-all cursor-pointer"
              >
                Select All Services
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* GRID VIEW MODE */
            <div
              className={`h-full overflow-y-auto grid gap-4 ${
                maximizedService
                  ? 'grid-cols-1'
                  : cols === 1
                  ? 'grid-cols-1'
                  : cols === 3
                  ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
                  : 'grid-cols-1 lg:grid-cols-2'
              }`}
            >
              {filteredServicesWithLogs
                .filter((svc) => (maximizedService ? svc.name === maximizedService : true))
                .map((svc) => {
                  const url = getServiceLogUrl(svc, currentEnv, devAgentUrl, stgAgentUrl, prodAgentUrl);
                  const metric = svc.metrics?.[currentEnv];
                  const key = iframeKeys[svc.name] || 0;
                  const isMax = maximizedService === svc.name;

                  return (
                    <div
                      key={`${svc.name}-${key}`}
                      className={`flex flex-col bg-[#0b0f19] border border-[#232a3f]/80 rounded-xl overflow-hidden shadow-lg transition-all ${
                        isMax ? 'h-full' : 'h-[480px]'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="px-4 py-2.5 bg-[#0e1424] border-b border-[#232a3f]/80 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_6px_#10b981] shrink-0" />
                          <span className="font-bold text-xs text-white truncate">{svc.name}</span>
                          {metric?.stats_port && (
                            <span className="text-[10px] font-mono text-[#94a3b8] bg-[#04060a] px-1.5 py-0.5 rounded border border-white/5 shrink-0">
                              Port: {metric.stats_port}
                            </span>
                          )}
                          {metric?.pid && (
                            <span className="text-[10px] font-mono text-[#38bdf8] shrink-0 hidden sm:inline">
                              PID: {metric.pid}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleReloadIframe(svc.name)}
                            title="Reload log stream"
                            className="p-1 text-[#94a3b8] hover:text-[#10b981] hover:bg-white/10 rounded transition-all cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              title="Open log in external browser tab"
                              className="p-1 text-[#94a3b8] hover:text-[#10b981] hover:bg-white/10 rounded transition-all cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => setMaximizedService(isMax ? null : svc.name)}
                            title={isMax ? 'Restore grid view' : 'Maximize webview'}
                            className="p-1 text-[#94a3b8] hover:text-[#10b981] hover:bg-white/10 rounded transition-all cursor-pointer"
                          >
                            {isMax ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Card Body - Iframe container */}
                      <div className="flex-1 bg-black relative overflow-hidden">
                        {url ? (
                          <iframe
                            src={url}
                            title={`Logs for ${svc.name}`}
                            className="w-full h-full border-none bg-black"
                            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-[#94a3b8]">
                            No log stream available for {svc.name}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            /* TABBED VIEW MODE */
            <div className="h-full flex flex-col bg-[#0b0f19] border border-[#232a3f]/80 rounded-xl overflow-hidden">
              {/* Tab Navigation */}
              <div className="px-3 pt-2 bg-[#0e1424] border-b border-[#232a3f]/80 flex items-center gap-1.5 overflow-x-auto shrink-0">
                {filteredServicesWithLogs.map((svc) => {
                  const isActive = activeTabService === svc.name;
                  return (
                    <button
                      key={svc.name}
                      type="button"
                      onClick={() => setActiveTabService(svc.name)}
                      className={`px-3 py-2 text-xs font-bold rounded-t-lg transition-all flex items-center gap-2 shrink-0 border-t border-x cursor-pointer ${
                        isActive
                          ? 'bg-[#06080e] border-[#232a3f] text-[#10b981] border-t-2 border-t-[#10b981]'
                          : 'bg-[#080c16]/50 border-transparent text-[#94a3b8] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#10b981]' : 'bg-slate-500'}`} />
                      <span>{svc.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Active Tab Iframe */}
              <div className="flex-1 bg-black relative">
                {(() => {
                  const targetSvc = filteredServicesWithLogs.find((s) => s.name === activeTabService) || filteredServicesWithLogs[0];
                  if (!targetSvc) return null;
                  const url = getServiceLogUrl(targetSvc, currentEnv, devAgentUrl, stgAgentUrl, prodAgentUrl);
                  const key = iframeKeys[targetSvc.name] || 0;

                  return (
                    <div className="w-full h-full flex flex-col">
                      <div className="px-4 py-1.5 bg-[#090d16] border-b border-[#232a3f]/60 flex items-center justify-between text-xs shrink-0 text-[#94a3b8]">
                        <span className="font-mono text-[11px] truncate">
                          URL: <span className="text-[#38bdf8]">{url}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleReloadIframe(targetSvc.name)}
                            className="hover:text-[#10b981] flex items-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" /> Reload Stream
                          </button>
                          {url && (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:text-[#10b981] flex items-center gap-1 cursor-pointer"
                            >
                              <ExternalLink className="w-3 h-3" /> External Tab
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 relative">
                        {url ? (
                          <iframe
                            key={`${targetSvc.name}-${key}`}
                            src={url}
                            title={`Logs for ${targetSvc.name}`}
                            className="w-full h-full border-none bg-black"
                            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-[#94a3b8]">
                            No log stream available
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="px-5 py-3 border-t border-[#232a3f]/75 bg-[#0e1320] flex justify-between items-center shrink-0 text-xs">
          <div className="flex items-center gap-2 text-[#94a3b8]">
            <Sparkles className="w-3.5 h-3.5 text-[#10b981]" />
            <span>Showing live logs for {filteredServicesWithLogs.length} active service(s)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg border border-[#232a3f]/80 text-[#94a3b8] hover:text-white hover:border-[#94a3b8] transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
