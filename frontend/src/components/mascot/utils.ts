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

// ─── Realm-based Pill Drop Selector ─────────────────────────────────────────
export const getRealmAppropriatePillId = (level: number = 1): string => {
  const realmPillsMap: Record<number, string[]> = {
    1:  ['01_tu_linh_dan', '02_duong_khi_dan', '04_hoi_khi_dan', '05_luyen_the_dan'],
    2:  ['09_truc_co_dan', '10_co_nguyen_dan', '11_tay_tuy_dan', '12_thong_mach_dan'],
    3:  ['17_ket_dan_dan', '18_kim_nguyen_dan', '19_tu_kim_dan', '24_dai_hoi_khi_dan'],
    4:  ['25_ngung_anh_dan', '26_anh_linh_dan', '27_duong_hon_dan', '28_ho_hon_dan'],
    5:  ['29_hoa_than_dan', '30_than_niem_dan', '31_loi_hon_dan', '32_than_luc_dan'],
    6:  ['33_luyen_hu_dan', '34_hu_khong_dan'],
    7:  ['35_hop_the_dan', '36_am_duong_dan'],
    8:  ['37_dai_thua_dan', '38_thien_co_dan', '39_ngo_dao_dan', '40_pha_canh_dan'],
    9:  ['41_do_kiep_dan', '42_loi_kiep_ho_menh_dan'],
    10: ['43_chan_tien_dan', '44_tien_linh_dan', '45_tien_cot_dan', '48_cuu_chuyen_tien_dan'],
    11: ['49_huyen_tien_dan', '50_phap_tac_dan'],
    12: ['51_kim_tien_dan', '52_kim_tien_bat_diet_dan'],
    13: ['53_thai_at_ngoc_tien_dan', '54_thai_at_kim_tien_dan'],
    14: ['55_van_phap_dan', '56_dai_la_dao_dan'],
    15: ['57_dai_la_kim_dan', '58_hon_nguyen_dan'],
    16: ['59_hon_don_dao_dan', '60_vo_cuc_dan'],
    17: ['61_hong_mong_dan', '62_tao_hoa_dan', '63_tien_de_dao_dan', '64_vo_cuc_hong_mong_tien_de_dan']
  };

  const currentLvl = Math.max(1, Math.min(17, level));

  // Determine relative weights for candidate target realms R (1..17)
  const candidateRealms: { realm: number; weight: number }[] = [];

  for (let r = 1; r <= 17; r++) {
    const diff = r - currentLvl; // relative level difference
    let weight = 0;

    if (diff === 0) {
      // Cùng cảnh giới: Tỉ lệ cao nhất (~54%)
      weight = 50;
    } else if (diff < 0) {
      // Đan level thấp: Tỉ lệ giảm dần theo khoảng cách level
      const gap = Math.abs(diff); // gap = 1, 2, 3, 4...
      if (gap === 1) weight = 22;       // 1 level thấp hơn (~24%)
      else if (gap === 2) weight = 10;  // 2 level thấp hơn (~11%)
      else if (gap === 3) weight = 4;   // 3 level thấp hơn (~4.3%)
      else if (gap === 4) weight = 1.5; // 4 level thấp hơn (~1.6%)
      else weight = 0.5;                // 5+ level thấp hơn
    } else if (diff > 0) {
      // Đan trên level:
      // 1 level cao hơn -> tương ứng tỉ lệ đan nhỏ hơn 3 cảnh giới (weight 4)
      // 2 level cao hơn -> tương ứng tỉ lệ đan nhỏ hơn 4 cảnh giới (weight 1.5)
      if (diff === 1) weight = 4;
      else if (diff === 2) weight = 1.5;
      else weight = 0; // Trên 3+ level không rớt
    }

    if (weight > 0) {
      candidateRealms.push({ realm: r, weight });
    }
  }

  // Weighted random selection
  const totalWeight = candidateRealms.reduce((acc, curr) => acc + curr.weight, 0);
  let rand = Math.random() * totalWeight;

  let selectedRealm = currentLvl;
  for (const candidate of candidateRealms) {
    if (rand < candidate.weight) {
      selectedRealm = candidate.realm;
      break;
    }
    rand -= candidate.weight;
  }

  const pool = realmPillsMap[selectedRealm] || realmPillsMap[1];
  return pool[Math.floor(Math.random() * pool.length)];
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
