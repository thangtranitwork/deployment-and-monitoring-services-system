import React from 'react';
import { Mic, MicOff, Loader2, Sparkles } from 'lucide-react';

interface VoiceCommandButtonProps {
  isListening: boolean;
  isProcessing: boolean;
  isSupported: boolean;
  transcript: string;
  onToggleVoice: () => void;
}

export const VoiceCommandButton: React.FC<VoiceCommandButtonProps> = ({
  isListening,
  isProcessing,
  isSupported,
  transcript,
  onToggleVoice
}) => {
  if (!isSupported) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        onClick={e => {
          e.stopPropagation();
          onToggleVoice();
        }}
        onPointerDown={e => e.stopPropagation()}
        title={
          isListening
            ? `Đang lắng nghe: "${transcript || 'Hãy nói lệnh...'}" (Nhấn để dừng)`
            : isProcessing
            ? 'Bổn Thỏ đang suy nẫm phân tích khẩu lệnh qua Gemini MCP Engine...'
            : '🎙️ Ra lệnh bằng giọng nói (AI Gemini MCP)'
        }
        style={{
          position: 'relative',
          background: isListening
            ? 'radial-gradient(circle, #ef4444 0%, #991b1b 100%)'
            : isProcessing
            ? 'radial-gradient(circle, #a855f7 0%, #6b21a8 100%)'
            : 'linear-gradient(135deg, rgba(245,158,11,0.3), rgba(168,85,247,0.3))',
          border: `1px solid ${
            isListening ? '#fca5a5' : isProcessing ? '#c084fc' : 'rgba(245,158,11,0.5)'
          }`,
          borderRadius: '8px',
          width: '26px',
          height: '26px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          color: isListening || isProcessing ? '#ffffff' : '#fde68a',
          boxShadow: isListening
            ? '0 0 14px rgba(239,68,68,0.8)'
            : isProcessing
            ? '0 0 14px rgba(168,85,247,0.8)'
            : '0 0 8px rgba(245,158,11,0.25)',
          transition: 'all 0.2s ease'
        }}
      >
        {isProcessing ? (
          <Loader2 className="animate-spin" style={{ width: '13px', height: '13px' }} />
        ) : isListening ? (
          <Mic style={{ width: '13px', height: '13px', animation: 'pulse 1s infinite' }} />
        ) : (
          <Mic style={{ width: '13px', height: '13px' }} />
        )}

        {/* Listening Ping Ring */}
        {isListening && (
          <span
            style={{
              position: 'absolute',
              inset: '-3px',
              borderRadius: '10px',
              border: '2px solid #ef4444',
              animation: 'ping 1.2s cubic-bezier(0, 0, 0.2, 1) infinite',
              pointerEvents: 'none'
            }}
          />
        )}
      </button>

      {/* Realtime transcript pill overlay if listening */}
      {isListening && transcript && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '6px',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.6)',
            borderRadius: '6px',
            padding: '2px 8px',
            fontSize: '10px',
            color: '#fef08a',
            whiteSpace: 'nowrap',
            zIndex: 100,
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Sparkles style={{ width: '10px', height: '10px', color: '#fef08a' }} />
          <span>"{transcript}"</span>
        </div>
      )}
    </div>
  );
};
