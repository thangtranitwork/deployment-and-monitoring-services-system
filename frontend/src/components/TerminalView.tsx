import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalViewProps {
  selectedServiceName?: string;
  pwdPath: string;
  deployLogs: string;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ selectedServiceName, pwdPath: initialPwd, deployLogs }) => {
  const [activeTab, setActiveTab] = useState<'pty' | 'deploy'>('pty');
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const [pwdPath, setPwdPath] = useState<string>(initialPwd || '~');
  const [termStatus, setTermStatus] = useState<string>('idle');
  const wsRef = useRef<WebSocket | null>(null);

  const [snippets, setSnippets] = useState<string[]>([
    'git status',
    'docker ps',
    'systemctl status ids',
    'go version'
  ]);

  useEffect(() => {
    if (activeTab !== 'pty' || !terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 13,
      theme: {
        background: '#06080d',
        foreground: '#38bdf8',
        cursor: '#10b981'
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    try {
      fitAddon.fit();
    } catch (e) {
      // ignore
    }

    const targetService = selectedServiceName || 'default';
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/terminal/ws/${encodeURIComponent(targetService)}`;

    setTermStatus('connecting');
    term.writeln(`\x1b[1;32mConnecting to PTY terminal session [${targetService}]...\x1b[0m`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setTermStatus('connected');
      term.writeln('\x1b[1;32m✅ Interactive Terminal Connected!\x1b[0m\r\n');
      try {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      } catch (e) {
        // ignore
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'cwd' && data.path) {
          setPwdPath(data.path);
        } else if (data.data) {
          term.write(data.data);
        }
      } catch (e) {
        term.write(event.data);
      }
    };

    ws.onerror = () => {
      setTermStatus('error');
      term.writeln('\r\n\x1b[1;31mWebSocket connection error. Interactive fallback active.\x1b[0m\r\n');
    };

    ws.onclose = () => {
      setTermStatus('disconnected');
    };

    const dataDisposable = term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    const handleResize = () => {
      try {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      dataDisposable.dispose();
      window.removeEventListener('resize', handleResize);
      if (wsRef.current) {
        wsRef.current.close();
      }
      term.dispose();
    };
  }, [activeTab, selectedServiceName]);

  const handleAddSnippet = () => {
    const cmd = prompt('Enter command snippet:');
    if (cmd && cmd.trim()) {
      setSnippets(prev => [...prev, cmd.trim()]);
    }
  };

  const handleRunSnippet = (cmd: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data: cmd + '\r' }));
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-[140px] border border-[#232a3f]/75 rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.4)] bg-[#06080d]/92">
      {/* Header Tab Group */}
      <div className="px-4 py-2 border-b border-[#232a3f]/75 bg-[#111111] flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] inline-block" />
          </div>

          <div className="flex gap-1 bg-white/5 p-0.5 rounded-md border border-[#232a3f]/75">
            <button
              type="button"
              onClick={() => setActiveTab('pty')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all cursor-pointer ${
                activeTab === 'pty' ? 'bg-[#10b981] text-black font-bold' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              💻 Interactive Terminal
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('deploy')}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded transition-all cursor-pointer ${
                activeTab === 'deploy' ? 'bg-[#10b981] text-black font-bold' : 'text-[#94a3b8] hover:text-white'
              }`}
            >
              🚀 Deploy Logs
            </button>
          </div>

          <div className="font-mono text-xs text-[#10b981] font-semibold truncate max-w-[280px]">
            <span>{pwdPath || '~'}</span> <span className="font-bold">$</span>
          </div>
        </div>

        <span className="font-mono text-xs text-[#94a3b8] uppercase font-bold">{termStatus}</span>
      </div>

      {/* Terminal View 1: xterm PTY */}
      <div
        ref={terminalRef}
        className={`flex-1 p-2 overflow-hidden ${activeTab === 'pty' ? 'block' : 'hidden'}`}
      />

      {/* Terminal View 2: Deploy Logs Console */}
      <div
        className={`flex-1 p-3 font-mono text-xs text-[#38bdf8] overflow-y-auto whitespace-pre-wrap leading-relaxed ${
          activeTab === 'deploy' ? 'block' : 'hidden'
        }`}
      >
        {deployLogs || 'No deployment logs available.'}
      </div>

      {/* Snippet Quick Bar */}
      <div className="px-3 py-1.5 bg-[#0c0f17] border-t border-[#232a3f]/75 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none">
        <span className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider shrink-0">
          ⚡ Snippets:
        </span>
        <div className="flex gap-1.5 items-center flex-1 overflow-x-auto">
          {snippets.map((snip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleRunSnippet(snip)}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-[#232a3f]/75 text-[#94a3b8] hover:text-white hover:border-[#10b981] transition-all shrink-0 cursor-pointer"
            >
              {snip}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAddSnippet}
          className="text-[10px] px-2 py-0.5 rounded border border-dashed border-[#232a3f]/75 text-[#94a3b8] hover:text-white shrink-0 cursor-pointer"
        >
          + Add Snippet
        </button>
      </div>
    </div>
  );
};
