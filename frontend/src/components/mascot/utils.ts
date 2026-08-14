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
