import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  Activity,
  Globe
} from 'lucide-react';
import { Service } from '../types';
import { getServiceLogUrl } from '../components/modals/MultiWebviewLogsModal';

interface WebviewLogsPageProps {
  services: Service[];
  currentEnv: string;
  devAgentUrl?: string;
  stgAgentUrl?: string;
  prodAgentUrl?: string;
  onBackToDashboard?: () => void;
}

export const WebviewLogsPage: React.FC<WebviewLogsPageProps> = ({
  services,
  currentEnv: initialEnv,
  devAgentUrl,
  stgAgentUrl,
  prodAgentUrl,
  onBackToDashboard
}) => {
  const navigate = useNavigate();
  const [currentEnv, setCurrentEnv] = useState<string>(initialEnv || 'Development');
  const [targetServiceNames, setTargetServiceNames] = useState<string[]>([]);
  const [fullscreenService, setFullscreenService] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState<number>(Date.now());

  // Load target services from localStorage or props
  useEffect(() => {
    const saved = localStorage.getItem('ids_target_webview_services');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTargetServiceNames(parsed);
          return;
        }
      } catch (e) {
        // ignore
      }
    }
    // Fallback: all services with active log ports
    const withLogs = services
      .filter(s => {
        const port = s.metrics?.[currentEnv]?.stats_port;
        return port && port !== 'N/A';
      })
      .map(s => s.name);
    setTargetServiceNames(withLogs);
  }, [services, currentEnv]);

  // Filter services to show
  const activeServices = services.filter(s => {
    const hasLogPort = s.metrics?.[currentEnv]?.stats_port && s.metrics[currentEnv].stats_port !== 'N/A';
    const isTarget = targetServiceNames.length === 0 || targetServiceNames.includes(s.name);
    return hasLogPort && isTarget;
  });

  const handleRefreshAll = () => {
    setIframeKey(Date.now());
  };

  const handleOpenAllInTabs = () => {
    activeServices.forEach(s => {
      const url = getServiceLogUrl(s, currentEnv, devAgentUrl, stgAgentUrl, prodAgentUrl);
      if (url) {
        window.open(url, '_blank');
      }
    });
  };

  const handleBack = () => {
    if (onBackToDashboard) {
      onBackToDashboard();
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#0b0f19', color: '#f1f5f9', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
      {/* Top Header Bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, width: '100%', backgroundColor: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(16,185,129,0.2)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={handleBack}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            <ArrowLeft style={{ width: '15px', height: '15px' }} />
            <span>Dashboard</span>
          </button>

          <div style={{ height: '20px', width: '1px', backgroundColor: 'rgba(255,255,255,0.15)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity style={{ width: '18px', height: '18px', color: '#34d399' }} />
            <h1 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '0.02em', margin: 0 }}>
              Live Webview Logs Grid
            </h1>
            <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 9px', borderRadius: '999px', backgroundColor: 'rgba(16,185,129,0.15)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}>
              {activeServices.length} Services
            </span>
          </div>
        </div>

        {/* Controls: Environment Selector & Global Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Current Environment Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(51,65,85,0.6)', borderRadius: '8px', padding: '3px 6px' }}>
            <Globe style={{ width: '14px', height: '14px', color: '#38bdf8', marginLeft: '4px' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', marginRight: '4px' }}>Môi trường:</span>
            {['Development', 'Staging', 'Production'].map(env => (
              <button
                key={env}
                type="button"
                onClick={() => setCurrentEnv(env)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.15s ease',
                  background: currentEnv === env ? '#10b981' : 'transparent',
                  color: currentEnv === env ? '#000' : '#94a3b8'
                }}
              >
                {env}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <button
            type="button"
            onClick={handleRefreshAll}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#f1f5f9', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            title="Refresh all webviews"
          >
            <RefreshCw style={{ width: '14px', height: '14px', color: '#38bdf8' }} />
            <span>Làm Mới</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAllInTabs}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#6ee7b7', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
            title="Open all active log streams in external browser tabs"
          >
            <ExternalLink style={{ width: '14px', height: '14px' }} />
            <span>Mở Tất Cả Tab Mới</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="webview-logs-main" style={{ flex: 1, width: '100%', padding: '20px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
        {activeServices.length === 0 ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', textAlign: 'center', background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px' }}>
            <Activity style={{ width: '48px', height: '48px', color: '#475569', marginBottom: '12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#cbd5e1', margin: 0 }}>Không tìm thấy Webview Logs</h3>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', marginBottom: '16px' }}>
              Không có service nào có cổng log hoạt động trên môi trường [{currentEnv}].
            </p>
            <button
              type="button"
              onClick={handleBack}
              style={{ padding: '8px 18px', background: '#10b981', color: '#000', fontWeight: 800, fontSize: '12px', borderRadius: '10px', border: 'none', cursor: 'pointer' }}
            >
              Quay lại Dashboard
            </button>
          </div>
        ) : (
          /* Strict Explicit 2-Column Grid Layout with Inline CSS */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: fullscreenService
                ? '1fr'
                : activeServices.length === 1
                ? '1fr'
                : 'repeat(2, minmax(0, 1fr))',
              gap: '20px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {activeServices
              .filter(s => !fullscreenService || s.name === fullscreenService)
              .map(svc => {
                const logUrl = getServiceLogUrl(svc, currentEnv, devAgentUrl, stgAgentUrl, prodAgentUrl);
                const isFullscreen = fullscreenService === svc.name;
                const metric = svc.metrics?.[currentEnv];
                const port = metric?.stats_port;

                return (
                  <div
                    key={svc.name}
                    style={{
                      width: '100%',
                      minWidth: 0,
                      height: isFullscreen ? 'calc(100vh - 120px)' : 'calc(100vh - 140px)',
                      minHeight: '520px',
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: '#0f172a',
                      border: '1px solid rgba(51, 65, 85, 0.8)',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                      boxSizing: 'border-box'
                    }}
                  >
                    {/* Webview Card Header */}
                    <div
                      style={{
                        height: '46px',
                        padding: '0 16px',
                        backgroundColor: '#090d16',
                        borderBottom: '1px solid rgba(30, 41, 59, 0.8)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexShrink: 0
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '999px', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981', flexShrink: 0 }} />
                        <span style={{ fontWeight: 800, fontSize: '14px', color: '#6ee7b7', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {svc.name}
                        </span>
                        {port && (
                          <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)', flexShrink: 0 }}>
                            Port :{port}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {logUrl && (
                          <button
                            type="button"
                            onClick={() => window.open(logUrl, '_blank')}
                            style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Open in new browser tab"
                          >
                            <ExternalLink style={{ width: '13px', height: '13px' }} />
                            <span>Tab Mới</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setFullscreenService(isFullscreen ? null : svc.name)}
                          style={{ padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: isFullscreen ? '#f59e0b' : '#cbd5e1', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                        >
                          {isFullscreen ? (
                            <>
                              <Minimize2 style={{ width: '13px', height: '13px' }} />
                              <span>Thu Nhỏ</span>
                            </>
                          ) : (
                            <>
                              <Maximize2 style={{ width: '13px', height: '13px' }} />
                              <span>Phóng To</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Webview Iframe Body */}
                    <div style={{ flex: 1, width: '100%', height: '100%', minWidth: 0, minHeight: 0, backgroundColor: '#090d16', position: 'relative', overflow: 'hidden' }}>
                      {logUrl ? (
                        <iframe
                          key={`${svc.name}-${iframeKey}`}
                          src={logUrl}
                          title={`Webview Log Stream - ${svc.name}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            minWidth: '100%',
                            minHeight: '100%',
                            border: 'none',
                            display: 'block',
                            backgroundColor: '#090d16'
                          }}
                          loading="lazy"
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '12px' }}>
                          <span>Không tìm thấy Webview URL cho service này</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
