import { useState, useRef, useCallback, useEffect } from 'react';

export interface VoiceCommandResult {
  success: boolean;
  tool: string;
  params: Record<string, any>;
  bunny_message: string;
  action_type: string;
}

export interface UseVoiceCommandOptions {
  availableServices?: string[];
  onCommandResult?: (result: VoiceCommandResult) => void;
}

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export const useVoiceCommand = (options: UseVoiceCommandOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Check if browser supports Web Speech API
  const isSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const processCommandText = async (text: string, servicesList: string[] = []) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch('/api/voice/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          services: servicesList
        })
      });

      if (!res.ok) {
        throw new Error(`Server status ${res.status}`);
      }

      const data: VoiceCommandResult = await res.json();
      setLastResult(data);
      if (options.onCommandResult) {
        options.onCommandResult(data);
      }
    } catch (err: any) {
      console.error('[VoiceCommand] API error:', err);
      const errResult: VoiceCommandResult = {
        success: false,
        tool: 'unknown_command',
        params: {},
        bunny_message: `⚠️ Lỗi kết nối Voice MCP API: ${err.message || 'Không xác định'}`,
        action_type: 'error'
      };
      setError(err.message);
      setLastResult(errResult);
      if (options.onCommandResult) {
        options.onCommandResult(errResult);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = useCallback((servicesList: string[] = options.availableServices || []) => {
    if (!isSupported) {
      const unsupportedRes: VoiceCommandResult = {
        success: false,
        tool: 'unknown_command',
        params: {},
        bunny_message: '⚠️ Trình duyệt của bạn không hỗ trợ Web Speech API (Vui lòng dùng Chrome / Edge)!',
        action_type: 'error'
      };
      setError('SpeechRecognition unsupported');
      if (options.onCommandResult) options.onCommandResult(unsupportedRes);
      return;
    }

    if (isListening || isProcessing) return;

    try {
      const SpeechClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechClass();

      rec.lang = 'vi-VN';
      rec.continuous = false;
      rec.interimResults = true;

      setTranscript('');
      setError(null);

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      rec.onerror = (event: any) => {
        console.warn('[VoiceCommand] Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setError(`Lỗi nhận diện: ${event.error}`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        // Process final transcript
        setTranscript(prev => {
          if (prev.trim()) {
            processCommandText(prev, servicesList);
          }
          return prev;
        });
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (e: any) {
      console.error('[VoiceCommand] Failed to start recognition:', e);
      setIsListening(false);
      setError(e.message);
    }
  }, [isSupported, isListening, isProcessing, options]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    isListening,
    isProcessing,
    transcript,
    lastResult,
    error,
    isSupported,
    startListening,
    stopListening
  };
};
