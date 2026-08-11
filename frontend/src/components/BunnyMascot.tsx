import React, { useState, useEffect, useRef } from 'react';
import { Moon, X, Crown, Zap, Lock, Check, Package, Trophy, Sparkles, Award, Gift, ShieldAlert } from 'lucide-react';

interface BunnyMascotProps {
  isDeploying?: boolean;
  selectedService?: string;
  activeDeployServices?: string[];
}

type BunnyState = 'idle' | 'walk_right' | 'walk_left' | 'jump_right' | 'jump_left' | 'sleep' | 'eat' | 'run_right' | 'run_left' | 'dance';

interface LevelInfo {
  level: number;
  name: string;
  reqXp: number;
  skinId: string;
  skinName: string;
  emoji: string;
}

// ─── Item System ───────────────────────────────────────────────────────────────
type ItemId = 'basic' | 'recover' | 'great' | 'talisman';

interface ItemConfig {
  id: ItemId;
  name: string;
  emoji: string;
  xpValue: number;        // 0 means no XP (e.g. talisman)
  maxStack: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  description: string;
  isBuff?: boolean;       // true = active buff, not consumed for XP
  buffDurationMs?: number;
  buffSuccessBonus?: number; // flat bonus to success rate (0.0 - 1.0)
}

export const ITEM_CONFIG: ItemConfig[] = [
  {
    id: 'basic',
    name: 'Tụ Linh Đan',
    emoji: '💊',
    xpValue: 8,
    maxStack: 999,
    rarity: 'common',
    description: '+8 Linh Lực • Nhận: mỗi phút ngồi web, tọa thiền, kéo thả Thỏ'
  },
  {
    id: 'recover',
    name: 'Hồi Phục Đan',
    emoji: '🍃',
    xpValue: 20,
    maxStack: 999,
    rarity: 'uncommon',
    description: '+20 Linh Lực • Nhận: deploy thành công, mở web sau 4h nghỉ'
  },
  {
    id: 'great',
    name: 'Đại Hoàn Đan',
    emoji: '🌸',
    xpValue: 50,
    maxStack: 999,
    rarity: 'rare',
    description: '+50 Linh Lực • Nhận: Độ Kiếp thành công, mốc deploy & thời gian đặc biệt'
  },
  {
    id: 'talisman',
    name: 'Hộ Kiếp Phù',
    emoji: '🔱',
    xpValue: 0,
    maxStack: 99,
    rarity: 'legendary',
    isBuff: true,
    buffDurationMs: 5 * 60 * 1000,   // 5 minutes active
    buffSuccessBonus: 0.25,           // +25% success rate
    description: '+25% tỉ lệ Độ Kiếp trong 5 phút • Nhận: mốc 10/25/50 lần deploy, mốc 500 phút tọa thiền'
  }
];

const RARITY_COLORS: Record<string, string> = {
  common:    '#93c5fd',   // blue-300
  uncommon:  '#86efac',   // green-300
  rare:      '#f9a8d4',   // pink-300
  legendary: '#fde047',   // yellow-300 (golden)
};

const PILL_COOLDOWN_MS = 30_000; // 30 seconds between pills

// ─── Achievement System ───────────────────────────────────────────────────────
export type AchievementCategory = 'cultivation' | 'devops' | 'activity' | 'secret';

export interface Achievement {
  id: string;
  title: string;
  category: AchievementCategory;
  icon: string;
  description: string;
  hint?: string;          // Gợi ý cho thành tựu ẩn
  isSecret?: boolean;     // Ẩn nội dung khi chưa mở khóa
  rewardText: string;
  reward: {
    itemId?: ItemId;
    itemAmount?: number;
    xp?: number;
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  // Tu Tiên
  {
    id: 'cult_lvl2',
    title: 'Sơ Nhập Đạo Đồ',
    category: 'cultivation',
    icon: '🧘',
    description: 'Đột phá lên Trúc Cơ Kỳ (Lv.2)',
    rewardText: '+2 💊 Tụ Linh Đan',
    reward: { itemId: 'basic', itemAmount: 2 }
  },
  {
    id: 'cult_lvl3',
    title: 'Kết Thành Kim Đan',
    category: 'cultivation',
    icon: '🔮',
    description: 'Độ Kiếp thành công lên Kim Đan Kỳ (Lv.3)',
    rewardText: '+1 🍃 Hồi Phục Đan',
    reward: { itemId: 'recover', itemAmount: 1 }
  },
  {
    id: 'cult_lvl10',
    title: 'Phi Thăng Thượng Giới',
    category: 'cultivation',
    icon: '🌟',
    description: 'Vượt thiên kiếp phi thăng lên Chân Tiên (Lv.10)',
    rewardText: '+2 🌸 Đại Hoàn Đan',
    reward: { itemId: 'great', itemAmount: 2 }
  },
  {
    id: 'cult_lvl17',
    title: 'Tiên Đế Chí Tôn',
    category: 'cultivation',
    icon: '👑',
    description: 'Đạt cảnh giới tối cao Thánh Nhân / Tiên Đế (Lv.17)',
    rewardText: '+3 🔱 Hộ Kiếp Phù',
    reward: { itemId: 'talisman', itemAmount: 3 }
  },

  // DevOps
  {
    id: 'dev_first',
    title: 'Tập Sự DevOps',
    category: 'devops',
    icon: '🚀',
    description: 'Thực hiện 1 lần deploy microservice đầu tiên',
    rewardText: '+1 🍃 Hồi Phục Đan',
    reward: { itemId: 'recover', itemAmount: 1 }
  },
  {
    id: 'dev_10',
    title: 'Bách Chiến Bách Thắng',
    category: 'devops',
    icon: '⚡',
    description: 'Tích lũy 10 lần deploy microservice',
    rewardText: '+1 🔱 Hộ Kiếp Phù',
    reward: { itemId: 'talisman', itemAmount: 1 }
  },
  {
    id: 'dev_50',
    title: 'Đại La Deployer',
    category: 'devops',
    icon: '⚔️',
    description: 'Tích lũy 50 lần deploy microservice',
    rewardText: '+2 🔱 Hộ Kiếp Phù',
    reward: { itemId: 'talisman', itemAmount: 2 }
  },
  {
    id: 'dev_multi_3',
    title: 'Vạn Giới Đồng Bộ',
    category: 'devops',
    icon: '🌌',
    description: 'Deploy thành công từ 3 microservice khác nhau trở lên',
    rewardText: '+2 🌸 Đại Hoàn Đan',
    reward: { itemId: 'great', itemAmount: 2 }
  },

  // Tu Luyện & Hoạt Động
  {
    id: 'time_60m',
    title: 'Khô Thiền Nhất Nguyện',
    category: 'activity',
    icon: '⏱️',
    description: 'Tọa thiền online tích lũy đủ 60 phút',
    rewardText: '+1 🌸 Đại Hoàn Đan',
    reward: { itemId: 'great', itemAmount: 1 }
  },
  {
    id: 'time_300m',
    title: 'Vạn Niên Bế Quan',
    category: 'activity',
    icon: '🧘‍♂️',
    description: 'Tọa thiền online tích lũy đủ 300 phút',
    rewardText: '+2 🔱 Hộ Kiếp Phù',
    reward: { itemId: 'talisman', itemAmount: 2 }
  },
  {
    id: 'pill_30',
    title: 'Dược Vương Tái Thế',
    category: 'activity',
    icon: '💊',
    description: 'Nuốt tổng cộng 30 viên đan dược bất kỳ',
    rewardText: '+1 🌸 Đại Hoàn Đan',
    reward: { itemId: 'great', itemAmount: 1 }
  },
  {
    id: 'drag_20',
    title: 'Ngự Kiếm Phi Hành',
    category: 'activity',
    icon: '🎈',
    description: 'Kéo thả bế Thỏ bay lượn 20 lần',
    rewardText: '+3 💊 Tụ Linh Đan',
    reward: { itemId: 'basic', itemAmount: 3 }
  },

  // Bí Cảnh Ẩn (Secret)
  {
    id: 'secret_fail_kiep',
    title: 'Thiên Lôi Thối Thể',
    category: 'secret',
    icon: '⚡',
    description: 'Độ Kiếp thất bại lần đầu tiên (Tổn hại kinh mạch hóa thành đại đạo)',
    hint: 'Trải qua thử thách sấm sét bất thành...',
    isSecret: true,
    rewardText: '+2 🍃 Hồi Phục Đan',
    reward: { itemId: 'recover', itemAmount: 2 }
  },
  {
    id: 'secret_talisman_kiep',
    title: 'Nghịch Thiên Cải Mệnh',
    category: 'secret',
    icon: '🔱',
    description: 'Độ Kiếp thành công khi đang kích hoạt Hộ Kiếp Phù',
    hint: 'Dùng pháp bảo huyền thoại trợ lực vượt qua kiếp nạn...',
    isSecret: true,
    rewardText: '+1 🌸 Đại Hoàn Đan',
    reward: { itemId: 'great', itemAmount: 1 }
  },
  {
    id: 'secret_night_owl',
    title: 'Dạ Du Thần Quân',
    category: 'secret',
    icon: '🌙',
    description: 'Deploy hoặc tu luyện trong khung giờ đêm (23:00 - 05:00)',
    hint: 'Hấp thu nguyệt hoa lúc nửa đêm...',
    isSecret: true,
    rewardText: '+1 🔱 Hộ Kiếp Phù',
    reward: { itemId: 'talisman', itemAmount: 1 }
  },
  {
    id: 'secret_first_great_pill',
    title: 'Cổ Thần Chi Lực',
    category: 'secret',
    icon: '🌸',
    description: 'Nuốt 1 viên Đại Hoàn Đan (+50 XP) lần đầu tiên',
    hint: 'Thưởng thức linh đan cực phẩm...',
    isSecret: true,
    rewardText: '+2 🍃 Hồi Phục Đan',
    reward: { itemId: 'recover', itemAmount: 2 }
  }
];

// ─── Deploy Commentary Voice Lines ────────────────────────────────────────────
export const getDeployCommentary = (serviceName: string, multiServices?: string[]): string => {
  // Multi-Deploy Commentary
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
  
  if (s.includes('trip')) {
    const lines = [
      `🚗 ${serviceName} đã đắc đạo! Vạn dặm hành trình của các chuyến xe đã được gia trì hộ thể!`,
      `✨ Bát quái định vị, thần hành bách biến! ${serviceName} đã sẵn sàng cất cánh!`,
      `🗺️ Chuyến đi thông suốt tam giới! ${serviceName} vận hành viên mãn!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }
  
  if (s.includes('auth') || s.includes('user') || s.includes('account')) {
    const lines = [
      `🛡️ Kết giới Auth đã trùng tu! Tà ma ngoại đạo chớ hòng xâm nhập ${serviceName}!`,
      `🔑 Vạn Pháp Quy Nhất! Token đã được thanh lọc, bảo mật vạn thọ vô cương!`,
      `⚡ ${serviceName} thiết lập cấm chế hộ thân, thiên binh vạn mã không lay chuyển!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }
  
  if (s.includes('order') || s.includes('payment') || s.includes('wallet') || s.includes('pay')) {
    const lines = [
      `💰 Linh thạch cuồn cuộn đổ về! ${serviceName} thanh toán thông suốt tam giới!`,
      `🏮 Tài lộc hanh thông! Đơn hàng dịch vụ ${serviceName} đại cát đại lợi!`,
      `💎 Kim ngân tài bảo dâng trào! ${serviceName} đã sẵn sàng thu nhận linh thạch!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }
  
  if (s.includes('notify') || s.includes('worker') || s.includes('message') || s.includes('mq') || s.includes('rabbit') || s.includes('publisher')) {
    const lines = [
      `📜 Phi kiếm truyền thư đã kích hoạt! ${serviceName} ngàn dặm truyền âm không sót một lời!`,
      `🕊️ Thần điệp xuất kích! ${serviceName} bắn thông báo bay nhanh hơn sấm sét!`,
      `⚡ Hàng đợi tin tức đã thông suốt, vạn sự truyền đi trong chớp mắt!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }
  
  if (s.includes('open-api') || s.includes('vendor') || s.includes('gateway') || s.includes('api')) {
    const lines = [
      `🌐 Thiên Môn khai mở! Cổng kết nối ${serviceName} đón nhận vạn phái triều bái!`,
      `🔮 Tương thông dị giới! Giao tiếp API ${serviceName} trơn tru không trở ngại!`,
      `✨ Linh mạch thông suốt! ${serviceName} đã sẵn sàng tiếp nhận request!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  if (s.includes('report') || s.includes('analytic') || s.includes('sql') || s.includes('stat') || s.includes('health')) {
    const lines = [
      `📊 Thiên Cơ Bàn đã tính toán xong! Số liệu ${serviceName} rõ ràng như nhật nguyệt!`,
      `🔮 Thần toán vô song! Báo cáo ${serviceName} minh bạch từng li từng tí!`,
      `📈 Khí vận hưng thịnh! Chỉ số ${serviceName} tăng vọt ngút trời!`
    ];
    return lines[Math.floor(Math.random() * lines.length)];
  }

  // Generic fallback pool
  const genericLines = [
    `🚀 Triển khai ${serviceName || 'Service'} viên mãn! Thiên địa dị tượng, công đức vô lượng!`,
    `⚡ Tốc độ deploy ${serviceName || 'Service'} quả là Súc Địa Thành Thốn, chớp mắt là hoàn tất!`,
    `✨ Bổn Thỏ đã đứng canh gác log ${serviceName || 'Service'} an toàn! Mau thưởng đan đi đại nhân 🐰`,
    `🧘 Pháp bảo ${serviceName || 'Service'} đã ổn định vận hành, khí vận đại tăng!`
  ];
  return genericLines[Math.floor(Math.random() * genericLines.length)];
};



// ─── Cultivation Levels ────────────────────────────────────────────────────────
export const LEVEL_CONFIG: LevelInfo[] = [
  { level: 1,  name: 'Luyện Khí Kỳ 🌫️',           reqXp: 0,    skinId: 'none',      skinName: 'Thỏ Phàm Nhân',          emoji: '🐰' },
  { level: 2,  name: 'Trúc Cơ Kỳ 🧘',              reqXp: 40,   skinId: 'grad_cap',  skinName: 'Bồ Đoàn Tụ Linh',        emoji: '🧘' },
  { level: 3,  name: 'Kim Đan Kỳ 🔮',              reqXp: 100,  skinId: 'cap',       skinName: 'Kim Đan Phù Chú',         emoji: '🔮' },
  { level: 4,  name: 'Nguyên Anh Kỳ 👶',           reqXp: 200,  skinId: 'helmet',    skinName: 'Hào Quang Nguyên Anh',    emoji: '👶' },
  { level: 5,  name: 'Hóa Thần Kỳ ⚡',             reqXp: 350,  skinId: 'astro',     skinName: 'Linh Phù Hóa Thần',      emoji: '⚡' },
  { level: 6,  name: 'Luyện Hư Kỳ 🪐',             reqXp: 550,  skinId: 'glasses',   skinName: 'Linh Chu Vũ Trụ',         emoji: '🪐' },
  { level: 7,  name: 'Hợp Thể Kỳ ⚔️',              reqXp: 800,  skinId: 'ninja',     skinName: 'Phi Kiếm Trảm Tiên',      emoji: '⚔️' },
  { level: 8,  name: 'Đại Thừa Kỳ ☯️',             reqXp: 1100, skinId: 'crown',     skinName: 'Bát Quái Kính',           emoji: '☯️' },
  { level: 9,  name: 'Độ Kiếp Kỳ 🌩️',              reqXp: 1500, skinId: 'aura',      skinName: 'Mũ Tiên Vương',           emoji: '👑🌩️' },
  { level: 10, name: 'Chân Tiên 🌟',               reqXp: 2000, skinId: 'chan_tien', skinName: 'Bồ Đề Tiên Thần',        emoji: '🎓🌟' },
  { level: 11, name: 'Huyền Tiên 🔮',              reqXp: 2600, skinId: 'huyen_tien',skinName: 'Pháp Tắc Khí Huấn',      emoji: '🕶️🔮' },
  { level: 12, name: 'Kim Tiên 👑',                reqXp: 3300, skinId: 'kim_tien',  skinName: 'Vương Miện Kim Tiên',     emoji: '👑✨' },
  { level: 13, name: 'Thái Ất Ngọc Tiên 💎',       reqXp: 4100, skinId: 'ngoc_tien', skinName: 'Ngọc Bích Pháp Bảo',     emoji: '💎' },
  { level: 14, name: 'Thái Ất Kim Tiên ⚡',         reqXp: 5000, skinId: 'thai_at',  skinName: 'Lôi Đình Thần Phù',      emoji: '⚡🪖' },
  { level: 15, name: 'Đại La Kim Tiên 🌌',          reqXp: 6000, skinId: 'dai_la',   skinName: 'Vạn Giới Hào Quang',     emoji: '🌌👑' },
  { level: 16, name: 'Hỗn Nguyên Đại La 🌌✨',      reqXp: 7200, skinId: 'hon_nguyen',skinName: 'Vũ Trụ Trận Pháp',       emoji: '🌌✨' },
  { level: 17, name: 'Thánh Nhân (Tiên Đế) 👑⚡',  reqXp: 8500, skinId: 'god',      skinName: 'Chân Thể Tiên Đế Vô Cực',emoji: '👑⚡☯️' }
];

export const getSuccessRate = (level: number): number => {
  const baseSuccess = 90 - (level - 2) * 4.5;
  return Math.max(0.20, Math.min(0.85, baseSuccess / 100));
};

const BUNNY_STORAGE_KEY = 'ids_bunny_progress_v2';

// ─── Lightning Canvas ──────────────────────────────────────────────────────────
const LightningCanvas: React.FC<{ bunnyX: number; bunnyY: number }> = ({ bunnyX, bunnyY }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const onResize = () => { if (canvas) { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; } };
    window.addEventListener('resize', onResize);

    const tx = (bunnyX / 100) * w;
    const ty = h - bunnyY - 25;

    const makeBolt = (x1: number, y1: number, x2: number, y2: number, rough: number) => {
      const pts: { x: number; y: number }[] = [{ x: x1, y: y1 }];
      const dx = x2 - x1; const dy = y2 - y1;
      const steps = Math.max(8, Math.floor(Math.hypot(dx, dy) / 25));
      for (let i = 1; i < steps; i++) {
        const r = i / steps;
        pts.push({ x: x1 + dx * r + (Math.random() - 0.5) * rough * 30, y: y1 + dy * r + (Math.random() - 0.5) * rough * 12 });
      }
      pts.push({ x: x2, y: y2 });
      return pts;
    };

    let flashA = 0, lastT = 0;
    let bolts: { pts: { x: number; y: number }[]; main: boolean }[] = [];

    const render = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      if (t - lastT > 130 + Math.random() * 120) {
        lastT = t; flashA = 0.4; bolts = [];
        const sx = tx + (Math.random() - 0.5) * w * 0.4;
        const main = makeBolt(sx, 0, tx, ty, 1.8);
        bolts.push({ pts: main, main: true });
        for (let i = 1; i < main.length - 2; i += 2) {
          if (Math.random() > 0.35) {
            bolts.push({ pts: makeBolt(main[i].x, main[i].y, main[i].x + (Math.random() - 0.5) * 280, main[i].y + Math.random() * 220 + 60, 1.4), main: false });
          }
        }
      }
      if (flashA > 0) { ctx.fillStyle = `rgba(255,255,235,${flashA})`; ctx.fillRect(0, 0, w, h); flashA *= 0.82; }
      bolts.forEach(({ pts, main }) => {
        if (pts.length < 2) return;
        [[main ? 'rgba(245,158,11,0.6)' : 'rgba(192,132,252,0.5)', main ? 16 : 8, main ? '#f59e0b' : '#c084fc', 35],
         [main ? '#fde047' : '#f0abfc', main ? 6 : 3, '', 15],
         ['#ffffff', main ? 3 : 1.5, '', 0]].forEach(([color, lw, shadow, blur]) => {
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
          pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
          ctx.strokeStyle = color as string; ctx.lineWidth = lw as number;
          ctx.shadowColor = shadow as string; ctx.shadowBlur = blur as number; ctx.stroke();
        });
      });
      ctx.save(); ctx.beginPath(); ctx.arc(tx, ty, 42 + Math.random() * 18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245,158,11,0.8)'; ctx.lineWidth = 4; ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 25; ctx.stroke(); ctx.restore();
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(animId); };
  }, [bunnyX, bunnyY]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-[999] pointer-events-none w-full h-full" />;
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const BunnyMascot: React.FC<BunnyMascotProps> = ({
  isDeploying = false,
  selectedService = '',
  activeDeployServices = []
}) => {
  type Inventory = Record<ItemId, number>;

  // ─── Persistent State ───────────────────────────────────────────────────────
  const loadSaved = () => {
    try { const s = localStorage.getItem(BUNNY_STORAGE_KEY); return s ? JSON.parse(s) : {}; } catch { return {}; }
  };

  const [xp, setXp]                                         = useState<number>(() => loadSaved().xp ?? 0);
  const [activeSkin, setActiveSkin]                         = useState<string>(() => loadSaved().activeSkin ?? 'none');
  const [inventory, setInventory]                           = useState<Inventory>(() => ({ basic: loadSaved().inventory?.basic ?? 5, recover: loadSaved().inventory?.recover ?? 0, great: loadSaved().inventory?.great ?? 0, talisman: loadSaved().inventory?.talisman ?? 1 }));
  const [totalMinutes, setTotalMinutes]                     = useState<number>(() => loadSaved().totalMinutes ?? 0);
  const [totalDrags, setTotalDrags]                         = useState<number>(() => loadSaved().totalDrags ?? 0);
  const [totalDeploys, setTotalDeploys]                     = useState<number>(() => loadSaved().totalDeploys ?? 0);
  const [totalPillsConsumed, setTotalPillsConsumed]         = useState<number>(() => loadSaved().totalPillsConsumed ?? 0);
  const [deployedServices, setDeployedServices]             = useState<string[]>(() => loadSaved().deployedServices ?? []);
  const [unlockedAchievements, setUnlockedAchievements]     = useState<string[]>(() => loadSaved().unlockedAchievements ?? []);
  const [lastPillTime, setLastPillTime]                     = useState<number>(() => loadSaved().lastPillTime ?? 0);
  const [talismanBuffExpiry, setTalismanBuffExpiry]         = useState<number>(() => loadSaved().talismanBuffExpiry ?? 0);
  const [talismanCountdown, setTalismanCountdown]           = useState<number>(0);
  const [lastSessionTime]                                   = useState<number>(() => {
    const saved = loadSaved().lastSessionTime ?? 0;
    const now = Date.now();
    // If more than 4 hours since last session, grant 2 Hồi Phục Đan on next render
    if (now - saved > 4 * 60 * 60 * 1000 && saved > 0) {
      setTimeout(() => {
        grantItem('recover', 2, '🌅 Khai thiên phục thế! Nhận 2 Hồi Phục Đan sau kỳ nghỉ dài!');
      }, 1500);
    }
    return saved;
  });

  // ─── UI State ───────────────────────────────────────────────────────────────
  const [isLevelUpAnim, setIsLevelUpAnim]                   = useState(false);
  const [showCostumePicker, setShowCostumePicker]           = useState(false);
  const [modalTab, setModalTab]                             = useState<'levels' | 'achievements'>('levels');
  const [recentAchievementToast, setRecentAchievementToast] = useState<Achievement | null>(null);
  const [showInventory, setShowInventory]                   = useState(false);
  const [state, setState]                                   = useState<BunnyState>('idle');
  const [frame, setFrame]                                   = useState(0);
  const [posX, setPosX]                                     = useState(82);
  const [posYBottom, setPosYBottom]                         = useState(12);
  const [direction, setDirection]                           = useState<'left' | 'right'>('left');
  const [bubbleText, setBubbleText]                         = useState('Bổn Thỏ xin chào Chân Tiên! 🐰');
  const [isDismissed, setIsDismissed]                       = useState(false);
  const [isDragging, setIsDragging]                         = useState(false);
  const [cooldownRemain, setCooldownRemain]                 = useState(0);

  const directionRef = useRef<'left' | 'right'>('left');
  directionRef.current = direction;

  const dragStartRef = useRef({ startX: 0, startY: 0, initPosX: 82, initPosY: 12 });

  // ─── Computed ───────────────────────────────────────────────────────────────
  const currentLevelInfo = LEVEL_CONFIG.slice().reverse().find(l => xp >= l.reqXp) ?? LEVEL_CONFIG[0];
  const currentLevel     = currentLevelInfo.level;
  const nextLevelInfo    = LEVEL_CONFIG.find(l => l.level === currentLevel + 1);
  const isReadyToBreakthrough = Boolean(nextLevelInfo && xp >= nextLevelInfo.reqXp - 1);
  const isTribulationLevel    = currentLevel >= 2;
  const isTalismanActive      = Date.now() < talismanBuffExpiry;
  const talismanCfg           = ITEM_CONFIG.find(i => i.id === 'talisman')!;
  const baseSuccessRate       = getSuccessRate(currentLevel);
  const effectiveSuccessRate  = isTalismanActive
    ? Math.min(0.99, baseSuccessRate + (talismanCfg.buffSuccessBonus ?? 0))
    : baseSuccessRate;
  const currentSuccessRatePercent = Math.round(effectiveSuccessRate * 100);
  const prevReq = currentLevelInfo.reqXp;
  const nextReq = nextLevelInfo ? nextLevelInfo.reqXp : prevReq + 1500;
  const progressPercent = Math.min(100, Math.max(0, ((xp - prevReq) / (nextReq - prevReq)) * 100));
  const totalInventory = Object.values(inventory).reduce((a, b) => a + b, 0);

  // ─── Persist to localStorage ────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(BUNNY_STORAGE_KEY, JSON.stringify({
        xp,
        activeSkin,
        inventory,
        totalMinutes,
        totalDrags,
        totalDeploys,
        totalPillsConsumed,
        deployedServices,
        unlockedAchievements,
        lastPillTime,
        talismanBuffExpiry,
        lastSessionTime: Date.now()
      }));
    } catch { /* noop */ }
  }, [xp, activeSkin, inventory, totalMinutes, totalDrags, totalDeploys, totalPillsConsumed, deployedServices, unlockedAchievements, lastPillTime]);

  // ─── Cooldown Countdown Timer ───────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const remain = Math.max(0, PILL_COOLDOWN_MS - (Date.now() - lastPillTime));
      setCooldownRemain(Math.ceil(remain / 1000));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [lastPillTime]);

  // ─── Talisman Buff Countdown ────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => setTalismanCountdown(Math.max(0, Math.ceil((talismanBuffExpiry - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [talismanBuffExpiry]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const triggerGentleHop = () => { setState('jump_right'); setFrame(0); setTimeout(() => setState('idle'), 1200); };

  // Grant items to inventory (safe, capped at maxStack)
  const grantItem = (itemId: ItemId, amount: number, msg?: string) => {
    const cfg = ITEM_CONFIG.find(i => i.id === itemId)!;
    setInventory(prev => {
      const newAmt = Math.min(cfg.maxStack, (prev[itemId] ?? 0) + amount);
      return { ...prev, [itemId]: newAmt };
    });
    if (msg) setBubbleText(msg);
  };

  // ─── Achievement Unlock Engine ──────────────────────────────────────────────
  const unlockAchievement = (achId: string) => {
    setUnlockedAchievements(prev => {
      if (prev.includes(achId)) return prev;
      const ach = ACHIEVEMENTS.find(a => a.id === achId);
      if (!ach) return prev;

      // Grant reward
      if (ach.reward.itemId && ach.reward.itemAmount) {
        grantItem(ach.reward.itemId, ach.reward.itemAmount);
      }
      if (ach.reward.xp) {
        addXP(ach.reward.xp);
      }

      setRecentAchievementToast(ach);
      setState('dance');
      setFrame(0);

      setTimeout(() => {
        setRecentAchievementToast(curr => (curr?.id === ach.id ? null : curr));
      }, 5000);

      return [...prev, achId];
    });
  };

  // Check achievements automatically based on stats
  useEffect(() => {
    if (currentLevel >= 2) unlockAchievement('cult_lvl2');
    if (currentLevel >= 3) unlockAchievement('cult_lvl3');
    if (currentLevel >= 10) unlockAchievement('cult_lvl10');
    if (currentLevel >= 17) unlockAchievement('cult_lvl17');
    if (totalMinutes >= 60) unlockAchievement('time_60m');
    if (totalMinutes >= 300) unlockAchievement('time_300m');
    if (totalDeploys >= 1) unlockAchievement('dev_first');
    if (totalDeploys >= 10) unlockAchievement('dev_10');
    if (totalDeploys >= 50) unlockAchievement('dev_50');
    if (deployedServices.length >= 3) unlockAchievement('dev_multi_3');
    if (totalDrags >= 20) unlockAchievement('drag_20');
    if (totalPillsConsumed >= 30) unlockAchievement('pill_30');

    // Night Owl Check
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 5) {
      unlockAchievement('secret_night_owl');
    }
  }, [currentLevel, totalMinutes, totalDeploys, deployedServices.length, totalDrags, totalPillsConsumed]);

  const addXP = (amount: number, reasonText?: string) => {
    setXp(prevXp => {
      let newXp = prevXp + amount;
      const prevLvl = (LEVEL_CONFIG.slice().reverse().find(l => prevXp >= l.reqXp) ?? LEVEL_CONFIG[0]).level;
      const nextLvlInfo = LEVEL_CONFIG.find(l => l.level === prevLvl + 1);
      if (nextLvlInfo && newXp >= nextLvlInfo.reqXp) {
        newXp = nextLvlInfo.reqXp - 1;
        if (prevLvl === 1) {
          setBubbleText(`✨ Linh lực dạt dào! Bổn Thỏ sẵn sàng ĐỘT PHÁ lên [${nextLvlInfo.name}]!`);
        } else {
          const r = Math.round(getSuccessRate(prevLvl) * 100);
          setBubbleText(`🌩️ Linh lực dạt dào! Sẵn sàng ĐỘ KIẾP [${nextLvlInfo.name}] (${r}% thành công)!`);
        }
        return newXp;
      }
      if (reasonText) setBubbleText(reasonText);
      return newXp;
    });
  };

  // ─── Item: Consume Pill or Activate Talisman ───────────────────────────────
  const handleConsumePill = (itemId: ItemId) => {
    const cfg = ITEM_CONFIG.find(i => i.id === itemId)!;
    if (inventory[itemId] <= 0) { setBubbleText(`😢 Kho ${cfg.emoji} trống rỗng! Tích thêm đan nhé!`); return; }

    // Talisman: buff type — no cooldown, no XP, just activate buff timer
    if (cfg.isBuff) {
      if (isTalismanActive) { setBubbleText(`🔱 Hộ Kiếp Phù đã đang hiệu lực! Còn ${Math.ceil(talismanCountdown / 60)} phút!`); return; }
      const expiry = Date.now() + (cfg.buffDurationMs ?? 300_000);
      setTalismanBuffExpiry(expiry);
      setInventory(prev => ({ ...prev, [itemId]: prev[itemId] - 1 }));
      setState('dance'); setFrame(0);
      setBubbleText(`🔱 HỘ KIẾP PHÙ KÍCH HOẠT! +${Math.round((cfg.buffSuccessBonus ?? 0) * 100)}% tỉ lệ Độ Kiếp trong 5 phút!`);
      setShowInventory(false);
      return;
    }

    if (cooldownRemain > 0) { setBubbleText(`⏳ Khí Hải chưa tiêu hóa xong! Còn ${cooldownRemain}s nữa...`); return; }
    setInventory(prev => ({ ...prev, [itemId]: prev[itemId] - 1 }));
    setTotalPillsConsumed(prev => prev + 1);
    setLastPillTime(Date.now());
    setState('eat'); setFrame(0);
    addXP(cfg.xpValue);

    if (itemId === 'great') {
      unlockAchievement('secret_first_great_pill');
    }

    const msgs: Record<string, string[]> = {
      basic:   [`💊 Cắn Tụ Linh Đan! Linh lực dâng trào~ (+${cfg.xpValue} XP)`, `💊 Tinh hoa Tụ Linh thấm vào đan điền! (+${cfg.xpValue} XP)`],
      recover: [`🍃 Hồi Phục Đan tan chảy! Chân khí phục hồi~ (+${cfg.xpValue} XP)`, `🍃 Thuần thanh linh khí dâng trào! (+${cfg.xpValue} XP)`],
      great:   [`🌸 Đại Hoàn Đan! Linh lực cuồn cuộn! (+${cfg.xpValue} XP)`, `🌸 Cổ Thần Đan! Khí tức như sấm dậy! (+${cfg.xpValue} XP)`]
    };
    const pool = msgs[itemId] ?? [`${cfg.emoji} Cắn đan! (+${cfg.xpValue} XP)`];
    setBubbleText(pool[Math.floor(Math.random() * pool.length)]);
    setShowInventory(false);
  };

  // ─── Tribulation Handler ────────────────────────────────────────────────────
  const handleBreakthroughOrKiep = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!nextLevelInfo) return;
    const target = nextLevelInfo;

    if (isTribulationLevel) {
      setIsLevelUpAnim(true); triggerGentleHop();
      setBubbleText(`🌩️ OÀNGGG! Cửu Trùng Thiên Kiếp Sấm Sét giáng xuống! Thỏ đang chống chịu...`);
      const success = Math.random() < effectiveSuccessRate;

      setTimeout(() => {
        setIsLevelUpAnim(false);
        if (success) {
          if (isTalismanActive) {
            unlockAchievement('secret_talisman_kiep');
          }
          setXp(target.reqXp + 1); setActiveSkin(target.skinId); triggerGentleHop();
          grantItem('great', 1);
          if (target.level === 10) setBubbleText(`✨ PHI THĂNG TIÊN GIỚI! Thỏ đắc đạo Chân Tiên 🌟! +1 🌸 Đại Hoàn Đan!`);
          else setBubbleText(`✨ ĐỘ KIẾP THÀNH CÔNG! Đột phá [${target.name}]! +1 🌸 Đại Hoàn Đan thưởng!`);
          // Talisman buff consumed after tribulation
          if (isTalismanActive) setTalismanBuffExpiry(0);
        } else {
          unlockAchievement('secret_fail_kiep');
          const gap = target.reqXp - currentLevelInfo.reqXp;
          const penalty = Math.round(gap * 0.10);
          setXp(prev => Math.max(currentLevelInfo.reqXp, prev - penalty));
          setState('sleep');
          setBubbleText(`😿 ĐỘ KIẾP THẤT BẠI! Thỏ bị tổn hại (-${penalty} XP)! Cắn đan hồi phục nhé 💊!`);
        }
      }, 3200);
    } else {
      triggerGentleHop(); setXp(target.reqXp + 1); setActiveSkin(target.skinId);
      setBubbleText(`✨ ĐỘT PHÁ THÀNH CÔNG! Khai phá đan điền, bước vào Trúc Cơ Kỳ 🧘!`);
    }
  };

  // ─── Idle Time XP: +1 Tụ Linh Đan per minute ──────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      setTotalMinutes(m => m + 1);
      grantItem('basic', 1, '⏰ 1 phút Linh Khí! +1 💊 Tụ Linh Đan');
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // ─── Milestone Grants ───────────────────────────────────────────────────────
  useEffect(() => {
    if (totalMinutes > 0 && totalMinutes % 100 === 0) {
      grantItem('great', 1, `🏅 Mốc ${totalMinutes} phút tọa thiền! +1 🌸 Đại Hoàn Đan!`);
    }
    if (totalMinutes > 0 && totalMinutes % 500 === 0) {
      grantItem('talisman', 1, `🔱 Mốc ${totalMinutes} phút tu luyện! +1 🔱 Hộ Kiếp Phù huyền thoại!`);
    }
  }, [totalMinutes]);

  useEffect(() => {
    if (totalDeploys > 0 && totalDeploys % 50 === 0) {
      grantItem('great', 3, `🏅 Mốc ${totalDeploys} lần deploy! +3 🌸 Đại Hoàn Đan!`);
    }
    // Grant Hộ Kiếp Phù at deploy milestones 10/25/50
    if ([10, 25, 50].includes(totalDeploys)) {
      grantItem('talisman', 1, `🔱 Mốc ${totalDeploys} lần deploy! +1 🔱 Hộ Kiếp Phù huyền thoại!`);
    }
  }, [totalDeploys]);

  // ─── Deploy Reaction & Commentary Engine ─────────────────────────────────────
  const wasDeployingRef = useRef(false);
  useEffect(() => {
    const deployList = (activeDeployServices && activeDeployServices.length > 0)
      ? activeDeployServices
      : (selectedService ? [selectedService] : []);
    const deployCount = Math.max(1, deployList.length);

    if (isDeploying && !wasDeployingRef.current) {
      wasDeployingRef.current = true;
      setDirection('left'); setState('run_left');
      if (deployCount > 1) {
        addXP(25 * deployCount, `🚀 Vạn Kiếm Quy Tông! Thần tốc deploy ${deployCount} microservices (+${25 * deployCount} XP)`);
      } else {
        addXP(25, `🚀 Phân Thần Thuật! Thần tốc deploy ${deployList[0] || 'Service'} (+25 XP)`);
      }
    } else if (!isDeploying && wasDeployingRef.current) {
      wasDeployingRef.current = false;
      setState('dance');
      setTotalDeploys(d => d + deployCount);

      if (deployList.length > 0) {
        setDeployedServices(prev => Array.from(new Set([...prev, ...deployList])));
      }
      grantItem('recover', deployCount);

      // Deploy Voice Line Commentary (Single or Multi-Deploy)
      const commentary = getDeployCommentary(deployList[0] || '', deployList);
      setBubbleText(commentary);

      // Check night owl achievement
      const hour = new Date().getHours();
      if (hour >= 23 || hour < 5) {
        unlockAchievement('secret_night_owl');
      }
    }
  }, [isDeploying, selectedService, activeDeployServices]);

  // ─── Row Y offsets ──────────────────────────────────────────────────────────
  const stateRowY: Record<BunnyState, number> = {
    idle: 0, walk_right: 50, walk_left: 100, jump_right: 150, jump_left: 200,
    sleep: 250, eat: 300, run_right: 350, run_left: 400, dance: 450
  };

  useEffect(() => {
    const spd = state.startsWith('run') ? 75 : state.startsWith('walk') ? 110 : 130;
    const id = setInterval(() => setFrame(f => (f + 1) % 10), spd);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    if (isDragging || (!state.startsWith('walk') && !state.startsWith('run'))) return;
    const id = setInterval(() => {
      setPosX(prevX => {
        const step = state.startsWith('run') ? 0.45 : 0.16;
        if (direction === 'left') {
          if (prevX <= 6) { setDirection('right'); setState(state.startsWith('run') ? 'run_right' : 'walk_right'); return 6.5; }
          return prevX - step;
        } else {
          if (prevX >= 92) { setDirection('left'); setState(state.startsWith('run') ? 'run_left' : 'walk_left'); return 91.5; }
          return prevX + step;
        }
      });
    }, 50);
    return () => clearInterval(id);
  }, [state, direction, isDragging]);

  // ─── Autonomous State Machine ────────────────────────────────────────────────
  useEffect(() => {
    if (isDeploying || isDismissed || isDragging) return;
    let tid: NodeJS.Timeout;
    const next = () => {
      const r = Math.random(); const dir = directionRef.current;
      if (state === 'idle') {
        if (r < 0.45) { setState(dir === 'left' ? 'walk_left' : 'walk_right'); setBubbleText('🐰 Tuần du sơn thủy, tìm Linh Thảo...'); tid = setTimeout(next, Math.random() * 6000 + 8000); }
        else if (r < 0.65) { setState('sleep'); addXP(3); setBubbleText('🧘 Tọa thiền bế quan... Khô Thiền Cảnh... Zzz'); tid = setTimeout(next, Math.random() * 8000 + 10000); }
        else if (r < 0.8) { setState('eat'); setBubbleText('🐰 Nhặt được Linh Dược ven đường!'); tid = setTimeout(next, Math.random() * 4000 + 5000); }
        else { setState(dir === 'left' ? 'jump_left' : 'jump_right'); const alt = [12, 45, 95, 140][Math.floor(Math.random() * 4)]; setPosYBottom(alt); setBubbleText(alt > 12 ? '⚔️ Ngự kiếm phi hành lên cao!' : '✨ Vạn Kiếm Quy Tông!'); tid = setTimeout(next, 4000); }
      } else if (state.startsWith('walk')) {
        if (r < 0.5) { setState('idle'); setBubbleText('🐰 Ngưng thần dưỡng khí...'); tid = setTimeout(next, Math.random() * 4000 + 4000); }
        else if (r < 0.75) { setState(dir === 'left' ? 'jump_left' : 'jump_right'); if (Math.random() > 0.5) setPosYBottom([12, 50, 110][Math.floor(Math.random() * 3)]); setBubbleText('🚀 Nhảy vút qua Thiên Hà!'); tid = setTimeout(next, 4000); }
        else { setState('eat'); setBubbleText('🐰 Nhặt được Linh Dược!'); tid = setTimeout(next, 5000); }
      } else if (state === 'sleep') {
        if (r < 0.6) { setState('idle'); setBubbleText('🥱 Xuất quan! Thu hoạch linh khí xong...'); tid = setTimeout(next, 4000); }
        else { setState('eat'); setBubbleText('💊 Xuất quan đói bụng!'); tid = setTimeout(next, 5000); }
      } else { setState('idle'); setBubbleText('🐰 Quan sát thiên địa...'); tid = setTimeout(next, Math.random() * 3000 + 4000); }
      setFrame(0);
    };
    tid = setTimeout(next, 5000);
    return () => clearTimeout(tid);
  }, [isDeploying, isDismissed, isDragging, state]);

  // ─── Pointer: Click = open inventory, Drag = fly ────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); let dragged = false;
    dragStartRef.current = { startX: e.clientX, startY: e.clientY, initPosX: posX, initPosY: posYBottom };

    const onMove = (me: PointerEvent) => {
      const dx = me.clientX - dragStartRef.current.startX;
      const dy = me.clientY - dragStartRef.current.startY;
      if (!dragged && Math.hypot(dx, dy) > 6) { dragged = true; setIsDragging(true); setState(directionRef.current === 'left' ? 'jump_left' : 'jump_right'); setBubbleText('🎈 Thuật Nhiếp Hồn! Đại nhân bế Thỏ bay nè...'); }
      if (dragged) {
        setPosX(Math.max(5, Math.min(95, dragStartRef.current.initPosX + (dx / window.innerWidth) * 100)));
        setPosYBottom(Math.max(10, Math.min(window.innerHeight - 80, dragStartRef.current.initPosY - dy)));
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      if (dragged) {
        setIsDragging(false); triggerGentleHop();
        const newDrags = totalDrags + 1;
        setTotalDrags(newDrags);
        addXP(10, '🎉 Ngự Kiếm đáp đất an toàn! (+10 XP)');
        // Every 5 drags = +1 Tụ Linh Đan
        if (newDrags % 5 === 0) grantItem('basic', 1, `🏅 5 lần ngự kiếm! +1 💊 Tụ Linh Đan!`);
      } else {
        setShowInventory(p => !p);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (isDismissed) return null;

  const bgX = -(frame * 50);
  const bgY = -stateRowY[state];

  const getVerticalOffset = () => {
    if (state.startsWith('jump') || isDragging) return [0,-20,-42,-62,-75,-70,-50,-28,-10,0][frame % 10];
    if (state.startsWith('walk') || state.startsWith('run')) return [0,-2,-4,-2,0,-2,-4,-2,0,0][frame % 10];
    if (state === 'idle') return [0,-1,-3,-1][frame % 4];
    return 0;
  };
  const currentOffsetY = getVerticalOffset();

  const artifactSideStyle: React.CSSProperties = { position: 'absolute', top: '-4px', right: '-24px', zIndex: 20 };

  const canEatAny = totalInventory > 0 && cooldownRemain === 0;

  return (
    <>
      {isLevelUpAnim && (
        <>
          <LightningCanvas bunnyX={posX} bunnyY={posYBottom} />
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none flex flex-col items-center gap-2">
            <div style={{ background: 'rgba(0,0,0,0.92)', border: '2px solid #f59e0b', padding: '14px 24px', borderRadius: '16px', boxShadow: '0 0 60px rgba(245,158,11,0.9)', textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>⚡</span>
                <div>
                  <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: '17px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>🌩️ CỬU TRÙNG THIÊN KIẾP SẤM SÉT 🌩️</div>
                  <div style={{ color: '#fde68a', fontWeight: 600, fontSize: '12px', marginTop: '2px' }}>Bổn Thỏ đang chống chịu lôi đình đột phá {nextLevelInfo?.name ?? currentLevelInfo.name}!</div>
                </div>
                <span style={{ fontSize: '28px' }}>⚡</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Bunny + Bubble ── */}
      <div
        className={`fixed z-[95] flex flex-col items-center select-none ${isDragging ? 'cursor-grabbing transition-none' : 'cursor-grab transition-all duration-300 ease-linear'}`}
        style={{ left: `${posX}%`, bottom: `${posYBottom}px`, transform: 'translateX(-50%)' }}
        onPointerDown={handlePointerDown}
      >
        {/* Speech Bubble — all colors via inline style to avoid light-theme CSS override */}
        <div
          style={{
            position: 'relative', marginBottom: '8px', padding: '6px 12px',
            borderRadius: '12px', background: 'rgba(10,13,22,0.96)',
            border: '1px solid rgba(245,158,11,0.45)', backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.7)', fontSize: '11px',
            display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'nowrap'
          }}
        >
          {/* Cảnh Giới Badge */}
          <button
            onClick={e => { e.stopPropagation(); setShowCostumePicker(p => !p); }}
            onPointerDown={e => e.stopPropagation()}
            title="Xem Cảnh Giới Tu Tiên & Tủ Đồ Pháp Bảo"
            style={{
              background: 'linear-gradient(135deg,rgba(245,158,11,0.28),rgba(168,85,247,0.28),rgba(16,185,129,0.28))',
              border: '1px solid rgba(245,158,11,0.4)', borderRadius: '8px',
              padding: '2px 8px', fontSize: '10.5px', fontWeight: 900,
              color: '#fde68a', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
              boxShadow: '0 0 10px rgba(245,158,11,0.2)'
            }}
          >
            {currentLevelInfo.name}
          </button>

          {/* Bubble Text */}
          <span style={{ color: '#fde68a', fontWeight: 500, whiteSpace: 'nowrap', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {bubbleText}
          </span>

          {/* Inventory / Pill Button */}
          {isReadyToBreakthrough ? (
            <button
              onClick={handleBreakthroughOrKiep}
              onPointerDown={e => e.stopPropagation()}
              title={isTribulationLevel ? `ĐỘ KIẾP! Tỉ lệ thành công: ${currentSuccessRatePercent}%` : 'ĐỘT PHÁ lên Trúc Cơ Kỳ!'}
              style={{
                background: isTribulationLevel
                  ? isTalismanActive
                    ? 'linear-gradient(135deg,#fde047,#f59e0b,#eab308)'
                    : 'linear-gradient(135deg,#f59e0b,#ef4444,#eab308)'
                  : 'linear-gradient(135deg,#34d399,#14b8a6,#fbbf24)',
                border: `1px solid ${isTribulationLevel ? (isTalismanActive ? '#fde047' : '#fde68a') : '#6ee7b7'}`,
                borderRadius: '8px', padding: isTalismanActive ? '2px 10px 3px' : '2px 10px',
                fontWeight: 900, fontSize: '10.5px', color: '#000',
                cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                boxShadow: isTalismanActive && isTribulationLevel
                  ? '0 0 22px rgba(253,224,71,0.9), 0 0 8px rgba(245,158,11,0.8)'
                  : '0 0 14px rgba(245,158,11,0.7)',
                animation: 'pulse 1.5s infinite'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                <span>{isTribulationLevel ? `🌩️ ĐỘ KIẾP (${currentSuccessRatePercent}%)` : '✨ ĐỘT PHÁ'}</span>
                {isTalismanActive && (
                  <span style={{ fontSize: '9px', color: '#fde047', fontWeight: 700 }}>🔱 +{Math.round((talismanCfg.buffSuccessBonus ?? 0) * 100)}% ({Math.ceil(talismanCountdown / 60)}m{talismanCountdown % 60}s)</span>
                )}
              </div>
            </button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setShowInventory(p => !p); }}
              onPointerDown={e => e.stopPropagation()}
              title={cooldownRemain > 0 ? `Cooldown ${cooldownRemain}s` : 'Mở túi Linh Đan'}
              style={{
                background: canEatAny ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.2)',
                border: `1px solid ${canEatAny ? 'rgba(245,158,11,0.5)' : 'rgba(100,116,139,0.3)'}`,
                borderRadius: '8px', padding: '2px 8px',
                fontSize: '10.5px', fontWeight: 700,
                color: canEatAny ? '#fde68a' : '#94a3b8',
                cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
                display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <Package style={{ width: '11px', height: '11px', flexShrink: 0 }} />
              {cooldownRemain > 0 ? `${cooldownRemain}s` : `💊 Túi Đan (${totalInventory})`}
            </button>
          )}

          {/* Dismiss */}
          <button
            onClick={e => { e.stopPropagation(); setIsDismissed(true); }}
            onPointerDown={e => e.stopPropagation()}
            title="Ẩn Thỏ Tiên"
            style={{ color: '#64748b', cursor: 'pointer', padding: '2px', borderRadius: '50%', background: 'none', border: 'none', flexShrink: 0 }}
          >
            <X style={{ width: '12px', height: '12px' }} />
          </button>

          {/* Bubble arrow */}
          <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '8px', height: '8px', background: 'rgba(10,13,22,0.96)', borderRight: '1px solid rgba(245,158,11,0.45)', borderBottom: '1px solid rgba(245,158,11,0.45)' }} />
        </div>

        {/* ── Inventory Panel (Popup above bubble) ── */}
        {showInventory && !isReadyToBreakthrough && (
          <div
            style={{
              position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
              marginBottom: '12px', background: 'rgba(10,13,22,0.97)',
              border: '1px solid rgba(245,158,11,0.4)', borderRadius: '14px',
              padding: '12px', width: '240px', zIndex: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)'
            }}
            onPointerDown={e => e.stopPropagation()}
          >
            <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '11px', marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              🎒 Túi Trữ Vật — Linh Đan
            </div>

            {cooldownRemain > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '5px 8px', marginBottom: '8px', fontSize: '10px', color: '#fca5a5', textAlign: 'center' }}>
                ⏳ Khí Hải đang tiêu hóa... còn <strong>{cooldownRemain}s</strong>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ITEM_CONFIG.map(item => {
                const qty = inventory[item.id];
                const isTalismItem = item.isBuff;
                const isActive = isTalismItem && isTalismanActive;
                // Talisman has no cooldown restriction — pills do
                const disabled = qty === 0 || (isTalismItem ? isActive : cooldownRemain > 0);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleConsumePill(item.id)}
                    disabled={disabled}
                    title={item.description}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: isActive
                        ? 'rgba(253,224,71,0.12)'
                        : disabled ? 'rgba(30,35,50,0.6)' : 'rgba(245,158,11,0.08)',
                      border: `1px solid ${isActive ? '#fde047aa' : disabled ? 'rgba(100,116,139,0.25)' : RARITY_COLORS[item.rarity] + '55'}`,
                      borderRadius: '10px', padding: '7px 10px',
                      cursor: disabled ? 'not-allowed' : 'pointer', width: '100%',
                      opacity: (disabled && !isActive) ? 0.5 : 1, transition: 'all 0.15s',
                      boxShadow: isActive ? '0 0 12px rgba(253,224,71,0.4)' : 'none'
                    }}
                  >
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.emoji}</span>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ color: RARITY_COLORS[item.rarity], fontWeight: 700, fontSize: '11px' }}>
                        {item.name}
                        {isActive && <span style={{ color: '#fde047', fontSize: '9px', marginLeft: '4px' }}>● ĐANG HIỆU LỰC</span>}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '9.5px', marginTop: '1px' }}>
                        {item.isBuff
                          ? isActive
                            ? `⏱️ Còn ${Math.ceil(talismanCountdown / 60)}p${talismanCountdown % 60}s • +${Math.round((item.buffSuccessBonus ?? 0) * 100)}% Độ Kiếp`
                            : `Kích hoạt: +${Math.round((item.buffSuccessBonus ?? 0) * 100)}% Độ Kiếp / 5 phút`
                          : `+${item.xpValue} Linh Lực`
                        }
                      </div>
                    </div>
                    <div style={{
                      background: qty > 0 ? RARITY_COLORS[item.rarity] + '33' : 'rgba(100,116,139,0.2)',
                      color: qty > 0 ? RARITY_COLORS[item.rarity] : '#94a3b8',
                      border: `1px solid ${qty > 0 ? RARITY_COLORS[item.rarity] + '55' : 'transparent'}`,
                      borderRadius: '8px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, flexShrink: 0
                    }}>
                      {qty}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ marginTop: '10px', borderTop: '1px solid rgba(245,158,11,0.15)', paddingTop: '8px' }}>
              <div style={{ color: '#94a3b8', fontSize: '9px', lineHeight: '1.55' }}>
                <div>💊 <strong style={{ color: '#93c5fd' }}>Tụ Linh Đan:</strong> 1/phút ngồi web, kéo thả Thỏ 5 lần</div>
                <div>🍃 <strong style={{ color: '#86efac' }}>Hồi Phục Đan:</strong> Mỗi lần deploy thành công, mở web sau 4h</div>
                <div>🌸 <strong style={{ color: '#f9a8d4' }}>Đại Hoàn Đan:</strong> Độ Kiếp thành công, mốc 100 phút/50 deploy</div>
                <div>🔱 <strong style={{ color: '#fde047' }}>Hộ Kiếp Phù:</strong> Mốc 10/25/50 lần deploy, mốc 500 phút tọa thiền</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Bunny Sprite ── */}
        <div
          className="relative transition-transform duration-200 hover:scale-125 active:scale-95"
          style={{ transform: `translateY(${currentOffsetY}px)` }}
          title="Nhấp chuột mở Túi Đan 🎒 | KÉO THẢ để nhận XP 🎈"
        >
          {/* Artifact Layer */}
          {activeSkin === 'grad_cap'  && <div style={artifactSideStyle} className="text-xl animate-bounce filter drop-shadow-[0_0_8px_#f59e0b]">🧘</div>}
          {activeSkin === 'cap'       && <div style={artifactSideStyle} className="text-xl animate-pulse filter drop-shadow-[0_0_8px_#a855f7]">🔮</div>}
          {activeSkin === 'helmet'    && <div style={artifactSideStyle} className="text-xl animate-pulse filter drop-shadow-[0_0_8px_#38bdf8]">👶</div>}
          {activeSkin === 'astro'     && <div style={artifactSideStyle} className="text-2xl animate-pulse filter drop-shadow-[0_0_10px_#f59e0b]">⚡</div>}
          {activeSkin === 'glasses'   && <div style={artifactSideStyle} className="text-lg animate-bounce filter drop-shadow-[0_0_8px_#38bdf8]">🪐</div>}
          {activeSkin === 'ninja'     && <div style={artifactSideStyle} className="text-lg animate-bounce filter drop-shadow-[0_0_8px_#ef4444]">⚔️</div>}
          {activeSkin === 'crown'     && <div style={artifactSideStyle} className="text-2xl animate-bounce filter drop-shadow-[0_0_10px_#eab308]">☯️</div>}
          {activeSkin === 'aura'      && <><div style={artifactSideStyle} className="text-xl animate-bounce">👑</div><div className="absolute inset-0 rounded-full animate-pulse shadow-[0_0_25px_8px_rgba(245,158,11,0.7)] pointer-events-none" /></>}
          {activeSkin === 'chan_tien' && <div style={artifactSideStyle} className="text-xl animate-pulse filter drop-shadow-[0_0_10px_#eab308]">🎓🌟</div>}
          {activeSkin === 'huyen_tien'&& <div style={artifactSideStyle} className="text-lg animate-bounce filter drop-shadow-[0_0_10px_#a855f7]">🕶️🔮</div>}
          {activeSkin === 'kim_tien'  && <div style={artifactSideStyle} className="text-2xl animate-bounce filter drop-shadow-[0_0_12px_#f59e0b]">👑✨</div>}
          {activeSkin === 'ngoc_tien' && <div style={artifactSideStyle} className="text-xl animate-pulse filter drop-shadow-[0_0_10px_#10b981]">💎</div>}
          {activeSkin === 'thai_at'   && <div style={artifactSideStyle} className="text-xl animate-bounce filter drop-shadow-[0_0_10px_#38bdf8]">⚡🪖</div>}
          {activeSkin === 'dai_la'    && <><div style={artifactSideStyle} className="text-2xl animate-bounce">🌌👑</div><div className="absolute inset-0 rounded-full animate-pulse shadow-[0_0_30px_10px_rgba(56,189,248,0.8)] pointer-events-none" /></>}
          {activeSkin === 'hon_nguyen'&& <><div style={artifactSideStyle} className="text-2xl animate-bounce">🌌✨</div><div className="absolute inset-0 rounded-full animate-pulse shadow-[0_0_35px_12px_rgba(168,85,247,0.8)] pointer-events-none border-2 border-purple-400" /></>}
          {activeSkin === 'god'       && <><div style={artifactSideStyle} className="text-2xl animate-bounce">👑⚡</div><div className="absolute -top-1 -right-2 text-sm z-10 animate-ping">☯️</div><div className="absolute inset-0 rounded-full animate-pulse shadow-[0_0_35px_14px_rgba(234,179,8,0.9)] pointer-events-none border-2 border-amber-300" /></>}

          <div
            className="w-[50px] h-[50px] bg-no-repeat drop-shadow-[0_4px_10px_rgba(245,158,11,0.4)]"
            style={{ backgroundImage: 'url(/bunny_10x10_grid.png)', backgroundSize: '500px 500px', backgroundPosition: `${bgX}px ${bgY}px`, imageRendering: 'pixelated' }}
          />
          {state === 'sleep' && <div className="absolute -top-2 left-0 animate-bounce"><Moon style={{ width: '14px', height: '14px', color: '#f59e0b' }} /></div>}
        </div>
      </div>

      {/* ── Floating Achievement Toast ── */}
      {recentAchievementToast && (
        <div
          className="fixed top-8 left-1/2 -translate-x-1/2 z-[1001] pointer-events-auto flex items-center gap-3 animate-bounce"
          style={{
            background: 'linear-gradient(135deg, rgba(20,25,40,0.97), rgba(10,13,22,0.98))',
            border: '2px solid #f59e0b',
            borderRadius: '16px',
            padding: '12px 20px',
            boxShadow: '0 0 35px rgba(245,158,11,0.6), 0 10px 40px rgba(0,0,0,0.8)',
            backdropFilter: 'blur(16px)',
            cursor: 'pointer'
          }}
          onClick={() => setRecentAchievementToast(null)}
        >
          <div style={{ fontSize: '28px', flexShrink: 0 }}>🏆</div>
          <div>
            <div style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles style={{ width: '13px', height: '13px', color: '#fde047' }} />
              MỞ KHÓA THÀNH TỰU MỚI!
            </div>
            <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>
              {recentAchievementToast.icon} {recentAchievementToast.title}
            </div>
            <div style={{ color: '#86efac', fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>
              🎁 Thưởng: {recentAchievementToast.rewardText}
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); setRecentAchievementToast(null); }}
            style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginLeft: '8px' }}
          >
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      )}

      {/* ── Costume & Achievement Modal ── */}
      {showCostumePicker && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          onPointerDown={e => e.stopPropagation()}
        >
          <div style={{ background: '#0b0f19', border: '1px solid rgba(245,158,11,0.45)', borderRadius: '20px', width: '100%', maxWidth: '680px', padding: '24px', boxShadow: '0 20px 60px rgba(245,158,11,0.22)', color: '#fff', position: 'relative' }}>
            {/* Header Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(245,158,11,0.18)', paddingBottom: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setModalTab('levels')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: modalTab === 'levels' ? 'rgba(245,158,11,0.22)' : 'transparent',
                    border: `1px solid ${modalTab === 'levels' ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700,
                    color: modalTab === 'levels' ? '#fde68a' : '#94a3b8', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <Crown style={{ width: '15px', height: '15px', color: modalTab === 'levels' ? '#f59e0b' : '#64748b' }} />
                  17 Cảnh Giới & Pháp Bảo
                </button>

                <button
                  onClick={() => setModalTab('achievements')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    background: modalTab === 'achievements' ? 'rgba(245,158,11,0.22)' : 'transparent',
                    border: `1px solid ${modalTab === 'achievements' ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px', padding: '6px 14px', fontSize: '12.5px', fontWeight: 700,
                    color: modalTab === 'achievements' ? '#fde68a' : '#94a3b8', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <Trophy style={{ width: '15px', height: '15px', color: modalTab === 'achievements' ? '#fbbf24' : '#64748b' }} />
                  Thành Tựu ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
                </button>
              </div>

              <button onClick={() => setShowCostumePicker(false)} style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            {/* Progress Card */}
            <div style={{ background: 'rgba(22,31,51,0.9)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: '12px', padding: '14px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '28px' }}>{currentLevelInfo.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#fbbf24' }}>Lv.{currentLevel}: {currentLevelInfo.name}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Linh Lực: {xp} XP • Túi Đan: {totalInventory} viên • Thành Tựu: {unlockedAchievements.length}/{ACHIEVEMENTS.length}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: '#f59e0b' }}>{progressPercent.toFixed(0)}%</div>
                  <div style={{ fontSize: '10px', color: '#64748b' }}>{nextLevelInfo ? `${xp}/${nextLevelInfo.reqXp} XP` : 'TIÊN ĐẾ ĐỈNH CAO'}</div>
                </div>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(30,41,59,0.8)', borderRadius: '999px', overflow: 'hidden', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg,#f59e0b,#a855f7,#22d3ee)', borderRadius: '999px', transition: 'width 0.5s ease' }} />
              </div>
              {/* Stats row */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>⏱️ {totalMinutes} phút online</span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>🚀 {totalDeploys} deploys</span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>🎈 {totalDrags} kéo thả</span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>💊 {totalPillsConsumed} cắn đan</span>
              </div>
            </div>

            {/* TAB 1: Realm Grid */}
            {modalTab === 'levels' && (
              <>
                <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(251,191,36,0.7)', marginBottom: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Danh Sách 17 Cảnh Giới & Pháp Bảo</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', maxHeight: '420px', overflowY: 'auto', paddingRight: '6px' }}>
                  {LEVEL_CONFIG.map(lvl => {
                    const unlocked = xp >= lvl.reqXp;
                    const equipped = activeSkin === lvl.skinId;
                    const nextLvlSuccessRate = lvl.level >= 2 ? Math.round(getSuccessRate(lvl.level) * 100) : null;
                    return (
                      <button
                        key={lvl.skinId}
                        disabled={!unlocked}
                        onClick={() => { if (unlocked) { setActiveSkin(lvl.skinId); setShowCostumePicker(false); setBubbleText(`✨ Triệu hồi Pháp Bảo [${lvl.skinName}]!`); } }}
                        style={{
                          padding: '12px', borderRadius: '12px', textAlign: 'left',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: equipped ? 'rgba(245,158,11,0.18)' : unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.35)',
                          border: `1px solid ${equipped ? '#f59e0b' : unlocked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
                          color: equipped ? '#fde68a' : unlocked ? '#e2e8f0' : '#4b5563',
                          cursor: unlocked ? 'pointer' : 'not-allowed', opacity: unlocked ? 1 : 0.5,
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '22px', flexShrink: 0 }}>{lvl.emoji}</span>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 700, fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lvl.name}</div>
                            <div style={{ fontSize: '10px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {unlocked ? lvl.skinName : `Cần ${lvl.reqXp} XP`}
                              {nextLvlSuccessRate !== null && unlocked ? <span style={{ color: nextLvlSuccessRate >= 70 ? '#86efac' : nextLvlSuccessRate >= 50 ? '#fde68a' : '#fca5a5' }}> • Kiếp {nextLvlSuccessRate}%</span> : null}
                            </div>
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, marginLeft: '4px' }}>
                          {equipped ? <div style={{ width: '18px', height: '18px', background: '#f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check style={{ width: '11px', height: '11px', color: '#000' }} /></div>
                            : unlocked ? <span style={{ fontSize: '9.5px', fontWeight: 700, color: '#f59e0b' }}>Dùng</span>
                            : <Lock style={{ width: '12px', height: '12px', color: '#4b5563' }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* TAB 2: Achievements Grid */}
            {modalTab === 'achievements' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(251,191,36,0.7)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    16 Thành Tựu & Huy Chương Ẩn
                  </div>
                  <div style={{ fontSize: '11px', color: '#86efac', fontWeight: 600 }}>
                    🏆 Đã mở khóa: {unlockedAchievements.length}/{ACHIEVEMENTS.length}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '420px', overflowY: 'auto', paddingRight: '6px' }}>
                  {ACHIEVEMENTS.map(ach => {
                    const isUnlocked = unlockedAchievements.includes(ach.id);
                    const isSecret = ach.isSecret && !isUnlocked;

                    return (
                      <div
                        key={ach.id}
                        style={{
                          padding: '12px',
                          borderRadius: '12px',
                          textAlign: 'left',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          background: isUnlocked
                            ? 'rgba(245,158,11,0.12)'
                            : isSecret
                            ? 'rgba(88,28,135,0.18)'
                            : 'rgba(0,0,0,0.3)',
                          border: `1px solid ${
                            isUnlocked
                              ? 'rgba(245,158,11,0.5)'
                              : isSecret
                              ? 'rgba(168,85,247,0.3)'
                              : 'rgba(255,255,255,0.06)'
                          }`,
                          boxShadow: isUnlocked ? '0 0 12px rgba(245,158,11,0.15)' : 'none',
                          opacity: isUnlocked ? 1 : 0.65,
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', overflow: 'hidden' }}>
                          <span style={{ fontSize: '24px', flexShrink: 0, filter: isUnlocked ? 'none' : 'grayscale(80%)' }}>
                            {isSecret ? '❓' : ach.icon}
                          </span>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 700, fontSize: '12px', color: isUnlocked ? '#fbbf24' : isSecret ? '#c084fc' : '#e2e8f0' }}>
                                {isSecret ? 'Thành Tựu Ẩn (Bí Cảnh)' : ach.title}
                              </span>
                              {ach.isSecret && (
                                <span style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '4px', padding: '1px 4px', fontSize: '8.5px', color: '#d8b4fe', fontWeight: 600 }}>
                                  ẨN
                                </span>
                              )}
                            </div>

                            <div style={{ fontSize: '10px', color: isUnlocked ? '#cbd5e1' : '#94a3b8', marginTop: '2px', lineHeight: '1.4' }}>
                              {isSecret ? (ach.hint ?? 'Bí ẩn đang chờ khám phá...') : ach.description}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '9.5px', color: isUnlocked ? '#86efac' : '#fde047', fontWeight: 600 }}>
                              <Gift style={{ width: '10px', height: '10px' }} />
                              {ach.rewardText}
                            </div>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0, marginLeft: '6px', marginTop: '2px' }}>
                          {isUnlocked ? (
                            <div style={{ width: '20px', height: '20px', background: '#f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Check style={{ width: '12px', height: '12px', color: '#000' }} />
                            </div>
                          ) : (
                            <Lock style={{ width: '14px', height: '14px', color: '#64748b' }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
