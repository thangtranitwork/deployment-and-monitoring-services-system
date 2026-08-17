import { useState, useRef, useCallback, useEffect } from 'react';
import { RabbitCommand } from '../../../rabbit/RabbitCommandTypes';

export interface VoiceCommandResult {
  success: boolean;
  tool: string;
  params: Record<string, any>;
  bunny_message: string;
  action_type: string;
  requires_confirmation?: boolean;
  result?: any;
  command?: RabbitCommand;
}

export interface VoiceHistoryTurn {
  role: 'user' | 'model';
  text: string;
}

export interface UseVoiceCommandOptions {
  availableServices?: string[];
  onCommandResult?: (result: VoiceCommandResult) => void;
}

export const useVoiceCommand = (options: UseVoiceCommandOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastResult, setLastResult] = useState<VoiceCommandResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const autoStopTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Session conversation memory history
  const historyRef = useRef<VoiceHistoryTurn[]>([]);

  // Check if browser supports MediaDevices and MediaRecorder
  const isSupported = typeof window !== 'undefined' &&
    Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && window.MediaRecorder);

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    console.log('🎙️ [VoiceCommand] Session history cleared.');
  }, []);

  const playLastAudio = useCallback(() => {
    if (!audioUrl) {
      console.warn('🎙️ [VoiceCommand] No recorded audio available to play.');
      return;
    }
    console.log('🎙️ [VoiceCommand] Playing recorded audio from URL:', audioUrl);
    const audio = new Audio(audioUrl);
    audio.play().catch(e => console.error('🎙️ [VoiceCommand] Playback error:', e));
  }, [audioUrl]);

  const sendAudioToGemini = async (audioBase64: string, mimeType: string, servicesList: string[]) => {
    console.log('🎙️ [VoiceCommand] sendAudioToGemini called. History turns:', historyRef.current.length);

    setIsProcessing(true);
    setError(null);
    setTranscript('Đang phân tích khẩu lệnh âm thanh qua Gemini...');

    try {
      console.log('🎙️ [VoiceCommand] Sending POST request to /api/voice/command with session history...');
      const startTime = Date.now();

      const res = await fetch('/api/voice/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_base64: audioBase64,
          mime_type: mimeType,
          services: servicesList,
          history: historyRef.current.slice(-8)
        })
      });

      const duration = Date.now() - startTime;
      console.log(`🎙️ [VoiceCommand] Server responded in ${duration}ms, status: ${res.status}`);

      if (!res.ok) {
        throw new Error(`Server status ${res.status}`);
      }

      const data: VoiceCommandResult = await res.json();
      console.log('🎙️ [VoiceCommand] Gemini MCP Result received:', data);

      if (data.bunny_message) {
        historyRef.current.push({
          role: 'model',
          text: data.bunny_message
        });
      }

      setLastResult(data);
      if (options.onCommandResult) {
        options.onCommandResult(data);
      }
    } catch (err: any) {
      console.error('🎙️ [VoiceCommand] API error:', err);
      const errResult: VoiceCommandResult = {
        success: false,
        tool: 'unknown_command',
        params: {},
        bunny_message: `⚠️ Lỗi phân tích Gemini Audio: ${err.message || 'Không xác định'}`,
        action_type: 'error'
      };
      setError(err.message);
      setLastResult(errResult);
      if (options.onCommandResult) {
        options.onCommandResult(errResult);
      }
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  };

  const processTextCommand = async (text: string, servicesList: string[] = options.availableServices || []) => {
    console.log('🎙️ [VoiceCommand] processTextCommand called:', { text, historyTurns: historyRef.current.length });
    if (!text.trim()) return;

    historyRef.current.push({
      role: 'user',
      text: text.trim()
    });

    setIsProcessing(true);
    setError(null);

    try {
      const res = await fetch('/api/voice/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          services: servicesList,
          history: historyRef.current.slice(-8)
        })
      });

      if (!res.ok) {
        throw new Error(`Server status ${res.status}`);
      }

      const data: VoiceCommandResult = await res.json();
      console.log('🎙️ [VoiceCommand] Text command result:', data);

      if (data.bunny_message) {
        historyRef.current.push({
          role: 'model',
          text: data.bunny_message
        });
      }

      setLastResult(data);
      if (options.onCommandResult) {
        options.onCommandResult(data);
      }
    } catch (err: any) {
      console.error('🎙️ [VoiceCommand] Text API error:', err);
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

  const stopListening = useCallback(() => {
    console.log('🎙️ [VoiceCommand] stopListening requested...');
    if (autoStopTimerRef.current) {
      clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('🎙️ [VoiceCommand] Stopping MediaRecorder...');
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(async (servicesList: string[] = options.availableServices || []) => {
    console.log('🎙️ [VoiceCommand] startListening initiated. Services:', servicesList);

    if (!isSupported) {
      console.warn('🎙️ [VoiceCommand] MediaRecorder not supported in this browser.');
      const unsupportedRes: VoiceCommandResult = {
        success: false,
        tool: 'unknown_command',
        params: {},
        bunny_message: '⚠️ Trình duyệt của bạn không hỗ trợ MediaRecorder API!',
        action_type: 'error'
      };
      setError('MediaRecorder unsupported');
      if (options.onCommandResult) options.onCommandResult(unsupportedRes);
      return;
    }

    if (isListening || isProcessing) {
      console.log('🎙️ [VoiceCommand] Already listening or processing. Stopping current session...');
      stopListening();
      return;
    }

    try {
      console.log('🎙️ [VoiceCommand] Requesting microphone stream (getUserMedia)...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      console.log('🎙️ [VoiceCommand] Microphone access GRANTED!');

      // Select supported mimeType
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
      console.log('🎙️ [VoiceCommand] Using MediaRecorder mimeType:', mimeType);

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log(`🎙️ [VoiceCommand] Audio chunk captured: ${event.data.size} bytes`);
        }
      };

      recorder.onstop = () => {
        console.log('🎙️ [VoiceCommand] MediaRecorder stopped. Processing audio chunks...');
        setIsListening(false);

        // Stop audio tracks to release microphone icon
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log(`🎙️ [VoiceCommand] Final Audio Blob created. Size: ${audioBlob.size} bytes`);

        if (audioBlob.size < 100) {
          console.warn('🎙️ [VoiceCommand] Audio blob size too small, ignoring.');
          return;
        }

        // Create object URL for audio playback
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        // Convert Blob to Base64
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          console.log(`🎙️ [VoiceCommand] Base64 audio ready (${base64Audio.length} chars). Sending to Gemini...`);
          sendAudioToGemini(base64Audio, mimeType.split(';')[0], servicesList);
        };
      };

      recorder.start(200); // Slices every 200ms
      setIsListening(true);
      setTranscript('🔴 Đang thu âm... (Nói khẩu lệnh của bạn)');
      setError(null);
      console.log('🎙️ [VoiceCommand] MediaRecorder recording STARTED!');

      // Auto stop after 6 seconds
      autoStopTimerRef.current = setTimeout(() => {
        console.log('🎙️ [VoiceCommand] 6s max recording timer reached. Auto-stopping...');
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, 6000);

    } catch (e: any) {
      console.error('🎙️ [VoiceCommand] getUserMedia error:', e);
      setIsListening(false);
      const errMsg = e.name === 'NotAllowedError'
        ? '⚠️ Bạn đã từ chối quyền Micro! Bấm icon 🔒 ở thanh địa chỉ để bật lại.'
        : `⚠️ Lỗi truy cập Micro: ${e.message}`;
      setError(errMsg);
      if (options.onCommandResult) {
        options.onCommandResult({
          success: false,
          tool: 'unknown_command',
          params: {},
          bunny_message: errMsg,
          action_type: 'error'
        });
      }
    }
  }, [isSupported, isListening, isProcessing, options, stopListening]);

  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) clearTimeout(autoStopTimerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, []);

  return {
    isListening,
    isProcessing,
    transcript,
    lastResult,
    error,
    audioUrl,
    isSupported,
    startListening,
    stopListening,
    playLastAudio,
    processTextCommand,
    clearHistory
  };
};
