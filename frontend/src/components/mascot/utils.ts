export const getSuccessRate = (level: number): number => {
  const rates: Record<number, number> = {
    1: 1.00,
    2: 0.85,
    3: 0.75,
    4: 0.65,
    5: 0.55,
    6: 0.45,
    7: 0.38,
    8: 0.32,
    9: 0.26,
    10: 0.20,
    11: 0.16,
    12: 0.13,
    13: 0.10,
    14: 0.08,
    15: 0.06,
    16: 0.04,
    17: 0.02
  };
  return rates[level] ?? 0.10;
};

// Tính % EXP buff của Pháp Bảo: Mộc Linh Kiếm (id 1) = 0.05%, id 2 = 0.10%, ..., id 17 = 0.85%. Cấp n nhân n lần.
export const getTreasureExpBonusPercent = (treasureId: number, level: number = 1): number => {
  const safeId = Math.max(1, Math.min(17, treasureId));
  const safeLevel = Math.max(1, Math.min(10, level));
  return Number((safeId * 0.05 * safeLevel).toFixed(3));
};

// Tỉ lệ thành công khi rèn nâng cấp Pháp Bảo (Cấp càng cao tỉ lệ thất bại càng cao)
export const getTreasureUpgradeSuccessRate = (targetLevel: number): number => {
  const rates: Record<number, number> = {
    2: 0.95,
    3: 0.85,
    4: 0.75,
    5: 0.65,
    6: 0.55,
    7: 0.45,
    8: 0.35,
    9: 0.25,
    10: 0.15
  };
  return rates[targetLevel] ?? 0.10;
};

// ─── Deploy Voice Lines ────────────────────────────────────────────────────────
export const getDeployCommentary = (serviceName: string, multiServices?: string[]): string => {
  if (multiServices && multiServices.length > 1) {
    const count = multiServices.length;
    const namesPreview = multiServices.slice(0, 3).join(', ') + (count > 3 ? ` và ${count - 3} service khác` : '');
    const multiLines = [
      `⚡ Vạn Kiếm Quy Tông! Triển khai đồng loạt ${count} đại pháp bảo (${namesPreview}) đại thành công!`,
      `🌌 Vạn Giới Tề Khởi! ${count} microservices (${namesPreview}) đồng loạt thăng thiên, thanh thế ngút trời!`,
      `✨ Thần thông quảng đại! Một tay điều khiển ${count} pháp trận song hành, công đức vô lượng!`,
      `🚀 Trận pháp Multi-Deploy đã kích hoạt! ${count} microservices vận hành trơn tru không trở ngại!`
    ];
    return multiLines[Math.floor(Math.random() * multiLines.length)];
  }

  const s = (serviceName || '').toLowerCase();
  if (s.includes('trip')) return `🚗 ${serviceName} đã đắc đạo! Vạn dặm hành trình của các chuyến xe đã được gia trì hộ thể!`;
  if (s.includes('auth') || s.includes('user')) return `🛡️ Kết giới Auth đã trùng tu! Tà ma ngoại đạo chớ hòng xâm nhập ${serviceName}!`;
  if (s.includes('order') || s.includes('pay')) return `💰 Linh thạch cuồn cuộn đổ về! ${serviceName} thanh toán thông suốt tam giới!`;
  if (s.includes('notify') || s.includes('worker')) return `📜 Phi kiếm truyền thư đã kích hoạt! ${serviceName} ngàn dặm truyền âm!`;

  const genericLines = [
    `🚀 Triển khai ${serviceName || 'Service'} viên mãn! Thiên địa dị tượng, công đức vô lượng!`,
    `⚡ Tốc độ deploy ${serviceName || 'Service'} quả là Súc Địa Thành Thốn, chớp mắt là hoàn tất!`,
    `✨ Bổn Thỏ đã đứng canh gác log ${serviceName || 'Service'} an toàn! Mau thưởng đan đi đại nhân 🐰`,
    `🧘 Pháp bảo ${serviceName || 'Service'} đã ổn định vận hành, khí vận đại tăng!`
  ];
  return genericLines[Math.floor(Math.random() * genericLines.length)];
};

// ─── Number Formatting Utility (Support up to Billions & Trillions) ────────────
export const formatNumber = (num: number): string => {
  if (num === undefined || num === null) return '0';
  if (num >= 1_000_000_000) {
    const b = num / 1_000_000_000;
    return (b % 1 === 0 ? b.toFixed(0) : b.toFixed(2)) + ' Tỷ';
  }
  if (num >= 1_000_000) {
    const m = num / 1_000_000;
    return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(2)) + ' Tr';
  }
  if (num >= 100_000) {
    const k = num / 1_000;
    return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)) + 'K';
  }
  return num.toLocaleString('vi-VN');
};

// ─── Speech Synthesis TTS Engine for Thỏ Tiên ──────────────────────────
export const speakBunnyMessage = (text: string): void => {
  if (typeof window === 'undefined') return;

  if (localStorage.getItem('ids_bunny_tts_muted') === 'true') {
    console.log('🔊 [SpeechSynthesis] Muted by user setting (ids_bunny_tts_muted = true)');
    return;
  }

  // Strip out emojis and markdown symbols for natural Vietnamese speech
  let cleanText = text
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/[🚀🐰⚡🔮✨🌱💫⭐🛡️🧘💥💨🌿🌸🌱🪵💧💪🔴]/g, '')
    .replace(/[\(\)\[\]\{\}\*\_]/g, ' ')
    .trim();

  // If text contains technical error / 503 / stacktrace, simplify it for speech
  if (cleanText.includes('API Error') || cleanText.includes('503') || cleanText.includes('synthesis-failed')) {
    cleanText = 'Bổn Thỏ gặp sự cố kết nối linh lực Gemini, ngài vui lòng thử lại sau ạ.';
  }

  if (!cleanText) return;

  // Fallback function using HTML5 Audio element + Same-Origin Server TTS Proxy (/api/tts)
  const playAudioFallback = () => {
    console.log('🔊 [SpeechSynthesis] Using Same-Origin Server TTS Proxy (/api/tts)...');
    try {
      const encodedText = encodeURIComponent(cleanText.slice(0, 180));
      const ttsUrl = `/api/tts?text=${encodedText}`;
      const audio = new Audio(ttsUrl);
      audio.play().then(() => {
        console.log('🔊 [SpeechSynthesis] ▶️ STARTED playing Same-Origin TTS Audio MP3 successfully!');
      }).catch(err => {
        console.warn('🔊 [SpeechSynthesis] Online Audio playback blocked or failed:', err);
      });
    } catch (err) {
      console.error('🔊 [SpeechSynthesis] Audio Fallback error:', err);
    }
  };

  // Check Web Speech Synthesis API
  if ('speechSynthesis' in window) {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();

      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) {
        console.log('🔊 [SpeechSynthesis] System Voices count: 0 (Linux OS without speech-dispatcher) -> Switching to Online Audio MP3 Fallback');
        playAudioFallback();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'vi-VN';
      utterance.rate = 1.05;
      utterance.pitch = 1.2;

      const viVoice = voices.find(v => v.lang.toLowerCase().includes('vi'));
      if (viVoice) {
        utterance.voice = viVoice;
      }

      utterance.onstart = () => {
        console.log('🔊 [SpeechSynthesis] ▶️ STARTED playing WebSpeech Utterance:', cleanText);
      };

      utterance.onerror = (e) => {
        console.warn('🔊 [SpeechSynthesis] WebSpeech Utterance error (synthesis-failed) -> Switching to Online Audio MP3 Fallback:', e);
        playAudioFallback();
      };

      window.speechSynthesis.speak(utterance);
      return;
    } catch (e) {
      console.warn('🔊 [SpeechSynthesis] WebSpeech Exception -> Switching to Online Audio MP3 Fallback:', e);
    }
  }

  playAudioFallback();
};
