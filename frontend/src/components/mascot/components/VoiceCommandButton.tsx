import React from 'react';
import { Volume2, Loader2, Sparkles } from 'lucide-react';

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
  transcript
}) => {
  if (!isSupported) return null;

  // If currently recording audio
  if (isListening) {
    return (
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(239,68,68,0.4), rgba(185,28,28,0.4))',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '2px 8px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#fca5a5',
            fontSize: '10.5px',
            fontWeight: 800,
            boxShadow: '0 0 10px rgba(239,68,68,0.6)',
            whiteSpace: 'nowrap'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#ef4444',
              boxShadow: '0 0 6px #ef4444',
              animation: 'ping 1s infinite'
            }}
          />
          <span>🔴 ĐANG THU (Bấm = dừng)</span>
        </div>

        {transcript && (
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
  }

  // If currently processing audio via Gemini
  if (isProcessing) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(126,34,206,0.4))',
          border: '1px solid #c084fc',
          borderRadius: '8px',
          padding: '2px 8px',
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: '#e9d5ff',
          fontSize: '10.5px',
          fontWeight: 800,
          boxShadow: '0 0 10px rgba(168,85,247,0.6)',
          whiteSpace: 'nowrap'
        }}
      >
        <Loader2 className="animate-spin" style={{ width: '12px', height: '12px', color: '#c084fc' }} />
        <span>GEMINI XỬ LÝ...</span>
      </div>
    );
  }

  return null;
};
