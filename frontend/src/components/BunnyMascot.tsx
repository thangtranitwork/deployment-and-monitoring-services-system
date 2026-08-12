import React, { useState, useEffect, useRef } from 'react';
import { Moon, X, Crown, Zap, Lock, Check, Package, Trophy, Sparkles, Award, Gift, ShieldAlert, Search } from 'lucide-react';

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
  treasureId: number;
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
    description: '+8 Linh Lực • Nhận: tỉ lệ may mắn khi treo máy, kéo thả Thỏ'
  },
  {
    id: 'recover',
    name: 'Hồi Phục Đan',
    emoji: '🍃',
    xpValue: 20,
    maxStack: 999,
    rarity: 'uncommon',
    description: '+20 Linh Lực • Nhận: deploy thành công, treo máy may mắn'
  },
  {
    id: 'great',
    name: 'Đại Hoàn Đan',
    emoji: '🌸',
    xpValue: 50,
    maxStack: 999,
    rarity: 'rare',
    description: '+50 Linh Lực • Nhận: Độ Kiếp thành công, mốc deploy & thời gian'
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
    description: '+25% tỉ lệ Độ Kiếp trong 5 phút • Nhận: mốc deploy & bế quan cao cấp'
  }
];

const RARITY_COLORS: Record<string, string> = {
  common:    '#93c5fd',   // blue-300
  uncommon:  '#86efac',   // green-300
  rare:      '#f9a8d4',   // pink-300
  legendary: '#fde047',   // yellow-300 (golden)
};

const PILL_COOLDOWN_MS = 0; // 0 seconds (No Cooldown!)

// ─── Achievement System (102 Achievements) ──────────────────────────────────
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
  // ── Tu Tiên (Cultivation) ── 28 Items
  { id: 'cult_lvl2', title: 'Sơ Nhập Đạo Đồ', category: 'cultivation', icon: '🧘', description: 'Đột phá lên Trúc Cơ Kỳ (Lv.2)', rewardText: '+2 💊 Tụ Linh Đan', reward: { itemId: 'basic', itemAmount: 2 } },
  { id: 'cult_lvl3', title: 'Kết Thành Kim Đan', category: 'cultivation', icon: '🔮', description: 'Độ Kiếp thành công lên Kim Đan Kỳ (Lv.3)', rewardText: '+1 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 1 } },
  { id: 'cult_lvl4', title: 'Nguyên Anh Hội Tụ', category: 'cultivation', icon: '👶', description: 'Đột phá lên Nguyên Anh Kỳ (Lv.4)', rewardText: '+2 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 2 } },
  { id: 'cult_lvl5', title: 'Hóa Thần Xuất S窍', category: 'cultivation', icon: '✨', description: 'Độ Kiếp thành công lên Hóa Thần Kỳ (Lv.5)', rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'cult_lvl6', title: 'Luyện Hư Nhập Đạo', category: 'cultivation', icon: '🌌', description: 'Độ Kiếp thành công lên Luyện Hư Kỳ (Lv.6)', rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'cult_lvl7', title: 'Hợp Thể Tam Giới', category: 'cultivation', icon: '⚔️', description: 'Độ Kiếp thành công lên Hợp Thể Kỳ (Lv.7)', rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'cult_lvl8', title: 'Đại Thừa Viên Viên', category: 'cultivation', icon: '👑', description: 'Độ Kiếp thành công lên Đại Thừa Kỳ (Lv.8)', rewardText: '+1 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 1 } },
  { id: 'cult_lvl9', title: 'Cửu Thiên Độ Kiếp', category: 'cultivation', icon: '⚡', description: 'Độ Kiếp thành công lên Độ Kiếp Kỳ (Lv.9)', rewardText: '+1 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 1 } },
  { id: 'cult_lvl10', title: 'Phi Thăng Chân Tiên', category: 'cultivation', icon: '🌟', description: 'Vượt thiên kiếp phi thăng lên Chân Tiên (Lv.10)', rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'cult_lvl11', title: 'Huyền Tiên Vô Song', category: 'cultivation', icon: '💫', description: 'Độ Kiếp thành công lên Huyền Tiên (Lv.11)', rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'cult_lvl12', title: 'Kim Tiên Vạn Thọ', category: 'cultivation', icon: '🏆', description: 'Độ Kiếp thành công lên Kim Tiên (Lv.12)', rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'cult_lvl13', title: 'Thái Ất Thần Quân', category: 'cultivation', icon: '🏺', description: 'Độ Kiếp thành công lên Thái Ất Ngọc Tiên (Lv.13)', rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'cult_lvl14', title: 'Thái Ất Vạn Giới', category: 'cultivation', icon: '🔱', description: 'Độ Kiếp thành công lên Thái Ất Kim Tiên (Lv.14)', rewardText: '+3 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 3 } },
  { id: 'cult_lvl15', title: 'Đại La Chí Tôn', category: 'cultivation', icon: '🌌', description: 'Độ Kiếp thành công lên Đại La Kim Tiên (Lv.15)', rewardText: '+3 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 3 } },
  { id: 'cult_lvl16', title: 'Hỗn Nguyên Đạo Tổ', category: 'cultivation', icon: '☯️', description: 'Độ Kiếp thành công lên Hỗn Nguyên Đại La (Lv.16)', rewardText: '+5 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 5 } },
  { id: 'cult_lvl17', title: 'Tiên Đế Chí Tôn', category: 'cultivation', icon: '👑', description: 'Đạt cảnh giới tối cao Thánh Nhân / Tiên Đế (Lv.17)', rewardText: '+5 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 5 } },
  { id: 'cult_xp_500', title: 'Linh Khí Nhập Thể', category: 'cultivation', icon: '💧', description: 'Tích lũy tổng cộng 500 Linh Lực (XP)', rewardText: '+50 XP', reward: { xp: 50 } },
  { id: 'cult_xp_1500', title: 'Khí Hải Trầm Hùng', category: 'cultivation', icon: '🌊', description: 'Tích lũy tổng cộng 1,500 Linh Lực (XP)', rewardText: '+1 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 1 } },
  { id: 'cult_xp_5000', title: 'Đan Điền Mâu Thẫn', category: 'cultivation', icon: '🔮', description: 'Tích lũy tổng cộng 5,000 Linh Lực (XP)', rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'cult_xp_15000', title: 'Chân Khí Cuồn Cuộn', category: 'cultivation', icon: '💥', description: 'Tích lũy tổng cộng 15,000 Linh Lực (XP)', rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'cult_xp_40000', title: 'Vô Hạn Linh Mạch', category: 'cultivation', icon: '⚡', description: 'Tích lũy tổng cộng 40,000 Linh Lực (XP)', rewardText: '+1 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 1 } },
  { id: 'cult_xp_100000', title: 'Vạn Cổ Linh Thần', category: 'cultivation', icon: '🔥', description: 'Tích lũy tổng cộng 100,000 Linh Lực (XP)', rewardText: '+3 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 3 } },
  { id: 'cult_break_1', title: 'Kiếp Nạn Lần Đầu', category: 'cultivation', icon: '🌩️', description: 'Độ Kiếp thành công lần đầu tiên', rewardText: '+1 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 1 } },
  { id: 'cult_break_5', title: 'Thiên Lôi Bất Biến', category: 'cultivation', icon: '⚡', description: 'Độ Kiếp thành công 5 lần', rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'cult_break_10', title: 'Bất Tử Kim Thân', category: 'cultivation', icon: '🛡️', description: 'Độ Kiếp thành công 10 lần', rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'cult_break_15', title: 'Thiên Đạo Tri Âm', category: 'cultivation', icon: '✨', description: 'Độ Kiếp thành công 15 lần', rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'cult_fail_3', title: 'Bất Khuất Ý Chí', category: 'cultivation', icon: '🩸', description: 'Nếm trải Độ Kiếp thất bại 3 lần', rewardText: '+3 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 3 } },
  { id: 'cult_pity_trigger', title: 'Tích Tụ Vạn Kiếp', category: 'cultivation', icon: '🕯️', description: 'Nhận được điểm thưởng tích lũy tỉ lệ thất bại (+5% trở lên)', rewardText: '+1 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 1 } },

  // ── DevOps & Triển Khai ── 26 Items
  { id: 'dev_1', title: 'Tập Sự DevOps', category: 'devops', icon: '🚀', description: 'Thực hiện 1 lần deploy microservice', rewardText: '+1 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 1 } },
  { id: 'dev_3', title: 'Tác Chiến Khởi Đầu', category: 'devops', icon: '🛰️', description: 'Tích lũy 3 lần deploy microservice', rewardText: '+2 💊 Tụ Linh Đan', reward: { itemId: 'basic', itemAmount: 2 } },
  { id: 'dev_5', title: 'Vận Hành Trơn Tru', category: 'devops', icon: '⚙️', description: 'Tích lũy 5 lần deploy microservice', rewardText: '+1 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 1 } },
  { id: 'dev_10', title: 'Bách Chiến Bách Thắng', category: 'devops', icon: '⚡', description: 'Tích lũy 10 lần deploy microservice', rewardText: '+1 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 1 } },
  { id: 'dev_15', title: 'Tốc Độ Ánh Sáng', category: 'devops', icon: '💨', description: 'Tích lũy 15 lần deploy microservice', rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'dev_20', title: 'Chuyên Gia Triển Khai', category: 'devops', icon: '🛠️', description: 'Tích lũy 20 lần deploy microservice', rewardText: '+2 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 2 } },
  { id: 'dev_25', title: 'Bán Thần DevOps', category: 'devops', icon: '🔮', description: 'Tích lũy 25 lần deploy microservice', rewardText: '+1 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 1 } },
  { id: 'dev_30', title: 'Kiến Trúc Sư Server', category: 'devops', icon: '🏰', description: 'Tích lũy 30 lần deploy microservice', rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'dev_40', title: 'Bát Quái Microservices', category: 'devops', icon: '☯️', description: 'Tích lũy 40 lần deploy microservice', rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'dev_50', title: 'Đại La Deployer', category: 'devops', icon: '⚔️', description: 'Tích lũy 50 lần deploy microservice', rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'dev_75', title: 'Hư Không Pipeline', category: 'devops', icon: '🌀', description: 'Tích lũy 75 lần deploy microservice', rewardText: '+3 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 3 } },
  { id: 'dev_100', title: 'Thần Cấp DevOps', category: 'devops', icon: '👑', description: 'Tích lũy 100 lần deploy microservice', rewardText: '+3 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 3 } },
  { id: 'dev_150', title: 'Vạn Giới Triển Khai', category: 'devops', icon: '🌌', description: 'Tích lũy 150 lần deploy microservice', rewardText: '+4 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 4 } },
  { id: 'dev_200', title: 'Thánh Nhân Pipeline', category: 'devops', icon: '🌟', description: 'Tích lũy 200 lần deploy microservice', rewardText: '+5 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 5 } },
  { id: 'dev_300', title: 'Vô Địch Cluster', category: 'devops', icon: '💥', description: 'Tích lũy 300 lần deploy microservice', rewardText: '+5 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 5 } },
  { id: 'dev_500', title: 'Chúa Tể Đan Điền Server', category: 'devops', icon: '🔥', description: 'Tích lũy 500 lần deploy microservice', rewardText: '+10 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 10 } },
  { id: 'dev_svc_1', title: 'Độc Hành Khách', category: 'devops', icon: '🌱', description: 'Deploy 1 microservice duy nhất', rewardText: '+1 💊 Tụ Linh Đan', reward: { itemId: 'basic', itemAmount: 1 } },
  { id: 'dev_svc_2', title: 'Song Kiếm Hợp Bích', category: 'devops', icon: '⚔️', description: 'Deploy 2 microservice khác nhau', rewardText: '+1 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 1 } },
  { id: 'dev_svc_3', title: 'Tam Đại Trận Pháp', category: 'devops', icon: '🔺', description: 'Deploy 3 microservice khác nhau', rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'dev_svc_5', title: 'Ngũ Hành Tụ Hội', category: 'devops', icon: '🖐️', description: 'Deploy 5 microservice khác nhau', rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'dev_svc_8', title: 'Bát Quái Triển Khai', category: 'devops', icon: '☯️', description: 'Deploy 8 microservice khác nhau', rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'dev_svc_10', title: 'Vạn Pháp Trở Về', category: 'devops', icon: '👑', description: 'Deploy 10 microservice khác nhau', rewardText: '+3 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 3 } },
  { id: 'dev_multi_2', title: 'Song Hành Xuất Kích', category: 'devops', icon: '⚡', description: 'Multi-deploy 2 microservices đồng thời', rewardText: '+1 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 1 } },
  { id: 'dev_multi_3', title: 'Vạn Giới Đồng Bộ', category: 'devops', icon: '🌌', description: 'Multi-deploy từ 3 microservices trở lên', rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'dev_multi_4', title: 'Tứ Đại Thiên Vương', category: 'devops', icon: '🛡️', description: 'Multi-deploy từ 4 microservices trở lên', rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'dev_multi_5', title: 'Vạn Kiếm Quy Tông', category: 'devops', icon: '🗡️', description: 'Multi-deploy từ 5 microservices cùng lúc', rewardText: '+3 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 3 } },

  // ── Tu Luyện & Hoạt Động (Activity) ── 28 Items
  { id: 'time_5m', title: 'Thanh Tâm Quả Tục', category: 'activity', icon: '🍵', description: 'Tọa thiền online tích lũy đủ 5 phút', rewardText: '+1 💊 Tụ Linh Đan', reward: { itemId: 'basic', itemAmount: 1 } },
  { id: 'time_15m', title: 'Thiền Định Khai Tâm', category: 'activity', icon: '🧘', description: 'Tọa thiền online tích lũy đủ 15 phút', rewardText: '+2 💊 Tụ Linh Đan', reward: { itemId: 'basic', itemAmount: 2 } },
  { id: 'time_30m', title: 'Khí Hải Nguyện Vọng', category: 'activity', icon: '⏳', description: 'Tọa thiền online tích lũy đủ 30 phút', rewardText: '+1 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 1 } },
  { id: 'time_60m', title: 'Khô Thiền Nhất Nguyện', category: 'activity', icon: '⏱️', description: 'Tọa thiền online tích lũy đủ 60 phút', rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'time_90m', title: 'Tĩnh Tâm Bế Quan', category: 'activity', icon: '🕯️', description: 'Tọa thiền online tích lũy đủ 90 phút', rewardText: '+2 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 2 } },
  { id: 'time_120m', title: 'Linh Thanh Nhập Định', category: 'activity', icon: '🌌', description: 'Tọa thiền online tích lũy đủ 120 phút', rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'time_180m', title: 'Vạn Vật Tương Thông', category: 'activity', icon: '🔮', description: 'Tọa thiền online tích lũy đủ 180 phút', rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'time_240m', title: 'Tam Thiên Đại Giới', category: 'activity', icon: '🌐', description: 'Tọa thiền online tích lũy đủ 240 phút', rewardText: '+1 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 1 } },
  { id: 'time_300m', title: 'Vạn Niên Bế Quan', category: 'activity', icon: '🧘‍♂️', description: 'Tọa thiền online tích lũy đủ 300 phút', rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'time_450m', title: 'Bất Động Như Sơn', category: 'activity', icon: '🏔️', description: 'Tọa thiền online tích lũy đủ 450 phút', rewardText: '+3 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 3 } },
  { id: 'time_600m', title: 'Thiên Địa Trường Thọ', category: 'activity', icon: '🌅', description: 'Tọa thiền online tích lũy đủ 600 phút (10h)', rewardText: '+3 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 3 } },
  { id: 'time_1000m', title: 'Bất Hủ Tu Sĩ', category: 'activity', icon: '💎', description: 'Tọa thiền online tích lũy đủ 1,000 phút', rewardText: '+5 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 5 } },
  { id: 'time_1440m', title: 'Vạn Cổ Trường Sinh', category: 'activity', icon: '🌟', description: 'Tọa thiền online tích lũy đủ 1,440 phút (24h)', rewardText: '+5 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 5 } },
  { id: 'drag_1', title: 'Lần Đầu Bế Thỏ', category: 'activity', icon: '🐰', description: 'Kéo thả Thỏ lần đầu tiên', rewardText: '+1 💊 Tụ Linh Đan', reward: { itemId: 'basic', itemAmount: 1 } },
  { id: 'drag_5', title: 'Thần Hành Phi Hành', category: 'activity', icon: '🎈', description: 'Kéo thả bế Thỏ 5 lần', rewardText: '+2 💊 Tụ Linh Đan', reward: { itemId: 'basic', itemAmount: 2 } },
  { id: 'drag_10', title: 'Khai Thiên Nhất Khiêu', category: 'activity', icon: '🚀', description: 'Kéo thả bế Thỏ 10 lần', rewardText: '+1 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 1 } },
  { id: 'drag_20', title: 'Ngự Kiếm Phi Hành', category: 'activity', icon: '🗡️', description: 'Kéo thả bế Thỏ bay lượn 20 lần', rewardText: '+3 💊 Tụ Linh Đan', reward: { itemId: 'basic', itemAmount: 3 } },
  { id: 'drag_30', title: 'Phiêu Bạt Giang Hồ', category: 'activity', icon: '✨', description: 'Kéo thả bế Thỏ bay lượn 30 lần', rewardText: '+2 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 2 } },
  { id: 'drag_50', title: 'Bồ Đề Du Hý', category: 'activity', icon: '🎡', description: 'Kéo thả bế Thỏ bay lượn 50 lần', rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'drag_75', title: 'Vân Du Bát Phương', category: 'activity', icon: '☁️', description: 'Kéo thả bế Thỏ bay lượn 75 lần', rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'drag_100', title: 'Vô Nhất Thố Tiên', category: 'activity', icon: '👑', description: 'Kéo thả bế Thỏ bay lượn 100 lần', rewardText: '+1 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 1 } },
  { id: 'drag_200', title: 'Ngự Thố Tông Master', category: 'activity', icon: '🏆', description: 'Kéo thả bế Thỏ bay lượn 200 lần', rewardText: '+3 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 3 } },
  { id: 'drag_500', title: 'Thần Thố Thượng Cổ', category: 'activity', icon: '🌌', description: 'Kéo thả bế Thỏ bay lượn 500 lần', rewardText: '+5 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 5 } },
  { id: 'pill_1', title: 'Sơ Thử Linh Đan', category: 'activity', icon: '💊', description: 'Cắn 1 viên đan dược đầu tiên', rewardText: '+10 XP', reward: { xp: 10 } },
  { id: 'pill_10', title: 'Đan Dược Khởi Đầu', category: 'activity', icon: '🍃', description: 'Nuốt tổng cộng 10 viên đan dược', rewardText: '+1 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 1 } },
  { id: 'pill_30', title: 'Dược Vương Tái Thế', category: 'activity', icon: '🧪', description: 'Nuốt tổng cộng 30 viên đan dược bất kỳ', rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'pill_100', title: 'Thần Dược Tông Chủ', category: 'activity', icon: '👑', description: 'Nuốt tổng cộng 100 viên đan dược', rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'pill_300', title: 'Bách Đan Chi Tôn', category: 'activity', icon: '🔥', description: 'Nuốt tổng cộng 300 viên đan dược', rewardText: '+5 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 5 } },

  // ── Bí Cảnh & Nhân Duyên (Secret) ── 20 Items
  { id: 'secret_fail_kiep', title: 'Thiên Lôi Thối Thể', category: 'secret', icon: '⚡', description: 'Độ Kiếp thất bại lần đầu tiên (Tổn hại kinh mạch hóa thành đại đạo)', hint: 'Trải qua thử thách sấm sét bất thành...', isSecret: true, rewardText: '+2 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 2 } },
  { id: 'secret_talisman_kiep', title: 'Nghịch Thiên Cải Mệnh', category: 'secret', icon: '🔱', description: 'Độ Kiếp thành công khi đang kích hoạt Hộ Kiếp Phù', hint: 'Dùng pháp bảo huyền thoại trợ lực vượt qua kiếp nạn...', isSecret: true, rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'secret_night_owl', title: 'Dạ Du Thần Quân', category: 'secret', icon: '🌙', description: 'Deploy hoặc tu luyện trong khung giờ đêm (23:00 - 05:00)', hint: 'Hấp thu nguyệt hoa lúc nửa đêm...', isSecret: true, rewardText: '+1 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 1 } },
  { id: 'secret_early_bird', title: 'Ninh Sương Chi Tác', category: 'secret', icon: '🌅', description: 'Deploy hoặc tu luyện sáng sớm (05:00 - 07:00)', hint: 'Đón bình minh hấp thụ thái dương khí...', isSecret: true, rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'secret_noon_master', title: 'Thái Dương Chân Hỏa', category: 'secret', icon: '☀️', description: 'Deploy hoặc tu luyện giữa trưa (12:00 - 13:00)', hint: 'Hấp thu cực dương hỏa khí lúc giữa trưa...', isSecret: true, rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'secret_first_great_pill', title: 'Cổ Thần Chi Lực', category: 'secret', icon: '🌸', description: 'Nuốt 1 viên Đại Hoàn Đan (+50 XP) lần đầu tiên', hint: 'Thưởng thức linh đan cực phẩm...', isSecret: true, rewardText: '+2 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 2 } },
  { id: 'secret_first_talisman', title: 'Phù Lục Huyền Diệu', category: 'secret', icon: '📜', description: 'Kích hoạt Hộ Kiếp Phù lần đầu tiên', hint: 'Dùng bùa hộ thể bảo vệ kinh mạch...', isSecret: true, rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'secret_sky_soarer', title: 'Xung Thiên Chi Kính', category: 'secret', icon: '🌌', description: 'Bế Thỏ bay vút lên đỉnh cao nhất trên màn hình', hint: 'Kéo Thỏ bay lên chín tầng mây...', isSecret: true, rewardText: '+2 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 2 } },
  { id: 'secret_ground_roller', title: 'Địa Khí Trầm Hùng', category: 'secret', icon: '🍂', description: 'Bế Thỏ thả sát mặt đất', hint: 'Cho Thỏ tiếp đất sát thương đại địa...', isSecret: true, rewardText: '+1 💊 Tụ Linh Đan', reward: { itemId: 'basic', itemAmount: 1 } },
  { id: 'secret_pill_spree', title: 'Cuồng Đan Chi Thánh', category: 'secret', icon: '💊', description: 'Cắn liên tiếp 5 viên đan dược thần tốc', hint: 'Thưởng thức đan dược liên tục không nghỉ...', isSecret: true, rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'secret_fail_streak', title: 'Tâm Ma Thối Luyện', category: 'secret', icon: '🔥', description: 'Độ Kiếp thất bại 2 lần liên tiếp tại cùng một cảnh giới', hint: 'Chịu đựng kiếp nạn vạn lần không sụp đổ...', isSecret: true, rewardText: '+2 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 2 } },
  { id: 'secret_lucky_break', title: 'Cực Hạn May Mắn', category: 'secret', icon: '🎲', description: 'Độ Kiếp thành công khi tỉ lệ cơ bản cực thấp (<15%)', hint: 'Vượt qua thử thách với tỉ lệ sống sót mong manh...', isSecret: true, rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'secret_pity_god', title: 'Tích Khí Vận Hoàng Đế', category: 'secret', icon: '👑', description: 'Độ Kiếp thành công khi điểm tích lũy thất bại (pity) đạt +15% trở lên', hint: 'Dùng kiên trì tích lũy khí vận đổi lấy chiến thắng...', isSecret: true, rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'secret_treasure_master', title: 'Đại Pháp Bảo Sư', category: 'secret', icon: '🔮', description: 'Mở khóa 5 Pháp Bảo Hộ Thể', hint: 'Thu thập đủ 5 bảo vật hộ thân...', isSecret: true, rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'secret_skin_collector', title: 'Bách Biến Thân Pháp', category: 'secret', icon: '🥋', description: 'Mở khóa 5 Thân Pháp / Skin Thỏ', hint: 'Sở hữu 5 trang phục cảnh giới...', isSecret: true, rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'secret_full_inventory', title: 'Tiên Gia Bảo Kho', category: 'secret', icon: '🎒', description: 'Tích trữ tổng cộng 20+ viên đan dược trong túi', hint: 'Sở hữu kho đan dược dạt dào...', isSecret: true, rewardText: '+1 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 1 } },
  { id: 'secret_multi_deploy_master', title: 'Vạn Giới Triệu Hồi', category: 'secret', icon: '🌌', description: 'Thực hiện 3 lần Multi-Deploy', hint: 'Điều khiển đồng thời nhiều đại trận microservices 3 lần...', isSecret: true, rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'secret_marathon', title: 'Bất Tĩnh Bế Quan', category: 'secret', icon: '🧘‍♀️', description: 'Bế quan liên tục trong phiên làm việc đủ 100 phút', hint: 'Thiền định trong 1 phiên bế quan lâu dài...', isSecret: true, rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'secret_devops_guru', title: 'DevOps Đạo Tổ', category: 'secret', icon: '⚔️', description: 'Tích lũy 30 lần deploy thành công', hint: 'Trở thành huyền thoại triển khai hệ thống...', isSecret: true, rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'secret_supreme_immortal', title: 'Độc Tôn Tam Giới', category: 'secret', icon: '🏆', description: 'Mở khóa hơn 50 thành tựu các loại', hint: 'Chinh phục hơn nửa chặng đường thành tựu...', isSecret: true, rewardText: '+5 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 5 } }
];

// ─── Deploy Commentary Voice Lines ────────────────────────────────────────────
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

  const genericLines = [
    `🚀 Triển khai ${serviceName || 'Service'} viên mãn! Thiên địa dị tượng, công đức vô lượng!`,
    `⚡ Tốc độ deploy ${serviceName || 'Service'} quả là Súc Địa Thành Thốn, chớp mắt là hoàn tất!`,
    `✨ Bổn Thỏ đã đứng canh gác log ${serviceName || 'Service'} an toàn! Mau thưởng đan đi đại nhân 🐰`,
    `🧘 Pháp bảo ${serviceName || 'Service'} đã ổn định vận hành, khí vận đại tăng!`
  ];
  return genericLines[Math.floor(Math.random() * genericLines.length)];
};

// ─── Cultivation Levels (Scaled EXP Curve) ───────────────────────────────────
export const LEVEL_CONFIG: LevelInfo[] = [
  { level: 1,  name: 'Luyện Khí Kỳ',           reqXp: 0,      skinId: 'none',      skinName: 'Mộc Linh Kiếm',        treasureId: 1 },
  { level: 2,  name: 'Trúc Cơ Kỳ',              reqXp: 100,    skinId: 'grad_cap',  skinName: 'Tụ Linh Phù',          treasureId: 2 },
  { level: 3,  name: 'Kim Đan Kỳ',              reqXp: 300,    skinId: 'cap',       skinName: 'Kim Đan Phi Kiếm',      treasureId: 3 },
  { level: 4,  name: 'Nguyên Anh Kỳ',           reqXp: 700,    skinId: 'helmet',    skinName: 'Nguyên Anh Liên Đài',  treasureId: 4 },
  { level: 5,  name: 'Hóa Thần Kỳ',             reqXp: 1500,   skinId: 'astro',     skinName: 'Hóa Thần Linh Trượng', treasureId: 5 },
  { level: 6,  name: 'Luyện Hư Kỳ',             reqXp: 3000,   skinId: 'glasses',   skinName: 'Hư Không Luân',        treasureId: 6 },
  { level: 7,  name: 'Hợp Thể Kỳ',              reqXp: 5500,   skinId: 'ninja',     skinName: 'Thiên Đạo Thương',     treasureId: 7 },
  { level: 8,  name: 'Đại Thừa Kỳ',             reqXp: 9000,   skinId: 'crown',     skinName: 'Bát Quái Kính',        treasureId: 8 },
  { level: 9,  name: 'Độ Kiếp Kỳ',              reqXp: 14000,  skinId: 'aura',      skinName: 'Cửu Thiên Lôi Ấn',     treasureId: 9 },
  { level: 10, name: 'Chân Tiên',               reqXp: 20000,  skinId: 'chan_tien', skinName: 'Bồ Đề Thần Thụ',      treasureId: 10 },
  { level: 11, name: 'Huyền Tiên',              reqXp: 28000,  skinId: 'huyen_tien',skinName: 'Huyền Thiên Đạo Luân',treasureId: 11 },
  { level: 12, name: 'Kim Tiên',                reqXp: 38000,  skinId: 'kim_tien',  skinName: 'Kim Tiên Đế Ấn',      treasureId: 12 },
  { level: 13, name: 'Thái Ất Ngọc Tiên',       reqXp: 50000,  skinId: 'ngoc_tien', skinName: 'Thái Ất Ngọc Hồ',     treasureId: 13 },
  { level: 14, name: 'Thái Ất Kim Tiên',         reqXp: 65000,  skinId: 'thai_at',  skinName: 'Thái Ất Thần Kích',    treasureId: 14 },
  { level: 15, name: 'Đại La Kim Tiên',          reqXp: 85000,  skinId: 'dai_la',   skinName: 'Vạn Giới Thiên Luân', treasureId: 15 },
  { level: 16, name: 'Hỗn Nguyên Đại La',      reqXp: 110000, skinId: 'hon_nguyen',skinName: 'Hỗn Nguyên Đạo Đỉnh',  treasureId: 16 },
  { level: 17, name: 'Thánh Nhân (Tiên Đế)',  reqXp: 150000, skinId: 'god',      skinName: 'Vạn Giới Đạo Bảo',      treasureId: 17 }
];

// Higher Failure Rate at Higher Realms
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

// ─── Mascot Constants ────────────────────────────────────────────────────────
export const MASCOT_SIZE = 80;

export const BUNNY_STATE_ROW_INDEX: Record<BunnyState, number> = {
  idle: 0, walk_right: 1, walk_left: 2, jump_right: 3, jump_left: 4,
  sleep: 5, eat: 6, run_right: 7, run_left: 8, dance: 9
};

// ─── Bunny Skin Sprite Component ─────────────────────────────────────────────
export const BunnySkinSprite: React.FC<{
  level: number;
  size?: number;
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}> = ({ level, size = 48, animated = true, className = '', style = {} }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!animated) return;
    const timer = setInterval(() => setFrame((f) => (f + 1) % 10), 130);
    return () => clearInterval(timer);
  }, [animated]);

  const bgX = -frame * size;

  return (
    <div
      className={`select-none pointer-events-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: `url(/skins/${level}.png)`,
        backgroundSize: `${size * 10}px ${size * 10}px`,
        backgroundPosition: `${bgX}px 0px`,
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'transparent',
        imageRendering: 'pixelated',
        ...style
      }}
    />
  );
};

// ─── Treasure Sprite Component ───────────────────────────────────────────────
export const TreasureSprite: React.FC<{
  treasureId: number;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ treasureId, size = 48, className = '', style = {} }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % 10), 100);
    return () => clearInterval(timer);
  }, []);

  const bgX = -frame * size;

  return (
    <div
      className={`select-none pointer-events-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundImage: `url(/treasures/${treasureId}.png)`,
        backgroundSize: `${size * 10}px ${size}px`,
        backgroundPosition: `${bgX}px 0px`,
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'transparent',
        imageRendering: 'pixelated',
        ...style
      }}
    />
  );
};

// ─── Treasure Orbiting Component ─────────────────────────────────────────────
export const TreasureOrbit: React.FC<{
  treasureId: number;
  isDeploying?: boolean;
}> = ({ treasureId, isDeploying }) => {
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const update = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      const speed = isDeploying ? 3.5 : 1.5;
      setAngle((prev) => (prev + speed * delta) % (Math.PI * 2));
      animId = requestAnimationFrame(update);
    };

    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [isDeploying]);

  const radiusX = 64;
  const radiusY = 22;

  const offsetX = Math.cos(angle) * radiusX;
  const offsetY = Math.sin(angle) * radiusY - 14;

  const isFront = Math.sin(angle) >= 0;
  const zIndex = isFront ? 30 : -1;
  const scale = 0.8 + (Math.sin(angle) + 1) * 0.25;
  const opacity = 0.8 + (Math.sin(angle) + 1) * 0.1;

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${scale})`,
        zIndex,
        opacity,
        transition: 'transform 0.05s linear',
        filter: isDeploying
          ? 'drop-shadow(0 0 16px rgba(245,158,11,0.9))'
          : 'drop-shadow(0 0 10px rgba(245,158,11,0.5))',
        pointerEvents: 'none'
      }}
    >
      <TreasureSprite treasureId={treasureId} size={50} />
    </div>
  );
};

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

const BUNNY_STORAGE_KEY = 'ids_bunny_progress_v3';

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
  const [activeTreasureId, setActiveTreasureId]             = useState<number>(() => loadSaved().activeTreasureId ?? 1);
  const [inventory, setInventory]                           = useState<Inventory>(() => ({ basic: loadSaved().inventory?.basic ?? 5, recover: loadSaved().inventory?.recover ?? 2, great: loadSaved().inventory?.great ?? 1, talisman: loadSaved().inventory?.talisman ?? 1 }));
  const [totalMinutes, setTotalMinutes]                     = useState<number>(() => loadSaved().totalMinutes ?? 0);
  const [totalDrags, setTotalDrags]                         = useState<number>(() => loadSaved().totalDrags ?? 0);
  const [totalDeploys, setTotalDeploys]                     = useState<number>(() => loadSaved().totalDeploys ?? 0);
  const [totalPillsConsumed, setTotalPillsConsumed]         = useState<number>(() => loadSaved().totalPillsConsumed ?? 0);
  const [deployedServices, setDeployedServices]             = useState<string[]>(() => loadSaved().deployedServices ?? []);
  const [unlockedAchievements, setUnlockedAchievements]     = useState<string[]>(() => loadSaved().unlockedAchievements ?? []);
  const [talismanBuffExpiry, setTalismanBuffExpiry]         = useState<number>(() => loadSaved().talismanBuffExpiry ?? 0);
  const [talismanCountdown, setTalismanCountdown]           = useState<number>(0);
  const [failCountAtCurrentLevel, setFailCountAtCurrentLevel] = useState<number>(() => loadSaved().failCountAtCurrentLevel ?? 0);
  const [breakthroughSuccessCount, setBreakthroughSuccessCount] = useState<number>(() => loadSaved().breakthroughSuccessCount ?? 0);
  const [breakthroughFailCount, setBreakthroughFailCount]   = useState<number>(() => loadSaved().breakthroughFailCount ?? 0);
  const [multiDeployCount, setMultiDeployCount]             = useState<number>(() => loadSaved().multiDeployCount ?? 0);
  const [pillSpreeTimes, setPillSpreeTimes]                 = useState<number[]>([]);

  // Modal achievements search & filter
  const [achSearchQuery, setAchSearchQuery]                 = useState('');
  const [achCategoryFilter, setAchCategoryFilter]           = useState<string>('all');

  // ─── UI State ───────────────────────────────────────────────────────────────
  const [isLevelUpAnim, setIsLevelUpAnim]                   = useState(false);
  const [showCostumePicker, setShowCostumePicker]           = useState(false);
  const [modalTab, setModalTab]                             = useState<'skins' | 'treasures' | 'achievements'>('skins');
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

  const directionRef = useRef<'left' | 'right'>('left');
  directionRef.current = direction;

  const dragStartRef = useRef({ startX: 0, startY: 0, initPosX: 82, initPosY: 12 });

  // ─── Computed ───────────────────────────────────────────────────────────────
  const currentLevelInfo   = LEVEL_CONFIG.slice().reverse().find(l => xp >= l.reqXp) ?? LEVEL_CONFIG[0];
  const currentLevel       = currentLevelInfo.level;
  const activeSkinInfo     = LEVEL_CONFIG.find(l => l.skinId === activeSkin) ?? currentLevelInfo;
  const activeTreasureInfo = LEVEL_CONFIG.find(l => l.treasureId === activeTreasureId) ?? currentLevelInfo;
  const nextLevelInfo      = LEVEL_CONFIG.find(l => l.level === currentLevel + 1);
  const isReadyToBreakthrough = Boolean(nextLevelInfo && xp >= nextLevelInfo.reqXp - 1);
  const isTribulationLevel    = currentLevel >= 2;
  const isTalismanActive      = Date.now() < talismanBuffExpiry;
  const talismanCfg           = ITEM_CONFIG.find(i => i.id === 'talisman')!;
  
  // Base success rate + Talisman buff + Fail Pity Bonus (+5% per failed attempt at this level)
  const baseSuccessRate       = getSuccessRate(currentLevel);
  const talismanBonus         = isTalismanActive ? (talismanCfg.buffSuccessBonus ?? 0) : 0;
  const pityBonus             = failCountAtCurrentLevel * 0.05;
  const effectiveSuccessRate  = Math.min(0.95, baseSuccessRate + talismanBonus + pityBonus);
  const currentSuccessRatePercent = Math.round(effectiveSuccessRate * 100);

  const prevReq = currentLevelInfo.reqXp;
  const nextReq = nextLevelInfo ? nextLevelInfo.reqXp : prevReq + 20000;
  const progressPercent = Math.min(100, Math.max(0, ((xp - prevReq) / (nextReq - prevReq)) * 100));
  const totalInventory = Object.values(inventory).reduce((a, b) => a + b, 0);

  // ─── Persist to localStorage ────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(BUNNY_STORAGE_KEY, JSON.stringify({
        xp,
        activeSkin,
        activeTreasureId,
        inventory,
        totalMinutes,
        totalDrags,
        totalDeploys,
        totalPillsConsumed,
        deployedServices,
        unlockedAchievements,
        talismanBuffExpiry,
        failCountAtCurrentLevel,
        breakthroughSuccessCount,
        breakthroughFailCount,
        multiDeployCount,
        lastSessionTime: Date.now()
      }));
    } catch { /* noop */ }
  }, [xp, activeSkin, activeTreasureId, inventory, totalMinutes, totalDrags, totalDeploys, totalPillsConsumed, deployedServices, unlockedAchievements, talismanBuffExpiry, failCountAtCurrentLevel, breakthroughSuccessCount, breakthroughFailCount, multiDeployCount]);

  // ─── Talisman Buff Countdown ────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => setTalismanCountdown(Math.max(0, Math.ceil((talismanBuffExpiry - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [talismanBuffExpiry]);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  const triggerGentleHop = () => { setState('jump_right'); setFrame(0); setTimeout(() => setState('idle'), 1200); };

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

  // Automatic Stat Checks for 102 Achievements
  useEffect(() => {
    // Cultivation levels
    for (let i = 2; i <= 17; i++) {
      if (currentLevel >= i) unlockAchievement(`cult_lvl${i}`);
    }

    // Cultivation XP milestones
    if (xp >= 500) unlockAchievement('cult_xp_500');
    if (xp >= 1500) unlockAchievement('cult_xp_1500');
    if (xp >= 5000) unlockAchievement('cult_xp_5000');
    if (xp >= 15000) unlockAchievement('cult_xp_15000');
    if (xp >= 40000) unlockAchievement('cult_xp_40000');
    if (xp >= 100000) unlockAchievement('cult_xp_100000');

    // Breakthrough counts
    if (breakthroughSuccessCount >= 1) unlockAchievement('cult_break_1');
    if (breakthroughSuccessCount >= 5) unlockAchievement('cult_break_5');
    if (breakthroughSuccessCount >= 10) unlockAchievement('cult_break_10');
    if (breakthroughSuccessCount >= 15) unlockAchievement('cult_break_15');
    if (breakthroughFailCount >= 3) unlockAchievement('cult_fail_3');
    if (failCountAtCurrentLevel >= 1) unlockAchievement('cult_pity_trigger');

    // DevOps deploys
    const devMilestones = [1, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500];
    devMilestones.forEach(m => {
      if (totalDeploys >= m) unlockAchievement(`dev_${m}`);
    });

    // Unique microservices
    const svcCount = deployedServices.length;
    if (svcCount >= 1) unlockAchievement('dev_svc_1');
    if (svcCount >= 2) unlockAchievement('dev_svc_2');
    if (svcCount >= 3) unlockAchievement('dev_svc_3');
    if (svcCount >= 5) unlockAchievement('dev_svc_5');
    if (svcCount >= 8) unlockAchievement('dev_svc_8');
    if (svcCount >= 10) unlockAchievement('dev_svc_10');

    // Activity - Minutes
    const timeMilestones = [5, 15, 30, 60, 90, 120, 180, 240, 300, 450, 600, 1000, 1440];
    timeMilestones.forEach(m => {
      if (totalMinutes >= m) unlockAchievement(`time_${m}m`);
    });

    // Activity - Drags
    const dragMilestones = [1, 5, 10, 20, 30, 50, 75, 100, 200, 500];
    dragMilestones.forEach(m => {
      if (totalDrags >= m) unlockAchievement(`drag_${m}`);
    });

    // Activity - Pills
    const pillMilestones = [1, 10, 30, 100, 300];
    pillMilestones.forEach(m => {
      if (totalPillsConsumed >= m) unlockAchievement(`pill_${m}`);
    });

    // Multi-deploy master
    if (multiDeployCount >= 3) unlockAchievement('secret_multi_deploy_master');

    // Secrets: Time based
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 5) unlockAchievement('secret_night_owl');
    if (hour >= 5 && hour < 7) unlockAchievement('secret_early_bird');
    if (hour >= 12 && hour < 13) unlockAchievement('secret_noon_master');

    // Secret: Full inventory
    if (totalInventory >= 20) unlockAchievement('secret_full_inventory');

    // Secret: Overall achievement completion
    if (unlockedAchievements.length >= 50) unlockAchievement('secret_supreme_immortal');

    // Secret: Unlocked skins & treasures count
    const unlockedSkins = LEVEL_CONFIG.filter(l => xp >= l.reqXp).length;
    if (unlockedSkins >= 5) {
      unlockAchievement('secret_skin_collector');
      unlockAchievement('secret_treasure_master');
    }
  }, [currentLevel, xp, breakthroughSuccessCount, breakthroughFailCount, failCountAtCurrentLevel, totalDeploys, deployedServices.length, totalMinutes, totalDrags, totalPillsConsumed, multiDeployCount, totalInventory, unlockedAchievements.length]);

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
          setBubbleText(`🌩️ Linh lực dạt dào! Sẵn sàng ĐỘ KIẾP [${nextLvlInfo.name}] (${currentSuccessRatePercent}% thành công)!`);
        }
        return newXp;
      }
      if (reasonText) setBubbleText(reasonText);
      return newXp;
    });
  };

  // ─── Item: Consume Pill or Activate Talisman (No Cooldown!) ─────────────────
  const handleConsumePill = (itemId: ItemId) => {
    const cfg = ITEM_CONFIG.find(i => i.id === itemId)!;
    if (inventory[itemId] <= 0) { setBubbleText(`😢 Kho ${cfg.emoji} trống rỗng! Tích thêm đan nhé!`); return; }

    if (cfg.isBuff) {
      if (isTalismanActive) { setBubbleText(`🔱 Hộ Kiếp Phù đã đang hiệu lực! Còn ${Math.ceil(talismanCountdown / 60)} phút!`); return; }
      const expiry = Date.now() + (cfg.buffDurationMs ?? 300_000);
      setTalismanBuffExpiry(expiry);
      setInventory(prev => ({ ...prev, [itemId]: prev[itemId] - 1 }));
      setState('dance'); setFrame(0);
      setBubbleText(`🔱 HỘ KIẾP PHÙ KÍCH HOẠT! +${Math.round((cfg.buffSuccessBonus ?? 0) * 100)}% tỉ lệ Độ Kiếp trong 5 phút!`);
      unlockAchievement('secret_first_talisman');
      setShowInventory(false);
      return;
    }

    setInventory(prev => ({ ...prev, [itemId]: prev[itemId] - 1 }));
    setTotalPillsConsumed(prev => prev + 1);
    setState('eat'); setFrame(0);
    addXP(cfg.xpValue);

    const now = Date.now();
    setPillSpreeTimes(prev => {
      const recent = [...prev, now].filter(t => now - t <= 10000);
      if (recent.length >= 5) unlockAchievement('secret_pill_spree');
      return recent;
    });

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
  };

  // ─── Tribulation Handler (Breakthrough & Bad Luck Pity System) ─────────────
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
          setBreakthroughSuccessCount(c => c + 1);
          if (isTalismanActive) {
            unlockAchievement('secret_talisman_kiep');
          }
          if (baseSuccessRate < 0.15) {
            unlockAchievement('secret_lucky_break');
          }
          if (failCountAtCurrentLevel >= 4) {
            unlockAchievement('secret_pity_god');
          }

          setFailCountAtCurrentLevel(0);
          setXp(target.reqXp + 1); setActiveSkin(target.skinId); setActiveTreasureId(target.treasureId); triggerGentleHop();
          grantItem('great', 1);
          if (target.level === 10) setBubbleText(`✨ PHI THĂNG TIÊN GIỚI! Thỏ đắc đạo Chân Tiên 🌟! +1 🌸 Đại Hoàn Đan!`);
          else setBubbleText(`✨ ĐỘ KIẾP THÀNH CÔNG! Đột phá [${target.name}]! +1 🌸 Đại Hoàn Đan thưởng!`);
          if (isTalismanActive) setTalismanBuffExpiry(0);
        } else {
          setBreakthroughFailCount(c => c + 1);
          setFailCountAtCurrentLevel(c => {
            const nextCount = c + 1;
            if (nextCount >= 2) unlockAchievement('secret_fail_streak');
            return nextCount;
          });
          unlockAchievement('secret_fail_kiep');

          const gap = target.reqXp - currentLevelInfo.reqXp;
          const penalty = Math.round(gap * 0.10);
          setXp(prev => Math.max(currentLevelInfo.reqXp, prev - penalty));
          setState('sleep');
          const newPityBonus = Math.round((failCountAtCurrentLevel + 1) * 5);
          setBubbleText(`😿 ĐỘ KIẾP THẤT BẠI! Bị tổn hại (-${penalty} XP)! Khí vận tích lũy +${newPityBonus}% tỉ lệ cho lần sau! 💊`);
        }
      }, 3200);
    } else {
      triggerGentleHop(); setXp(target.reqXp + 1); setActiveSkin(target.skinId); setActiveTreasureId(target.treasureId);
      setFailCountAtCurrentLevel(0);
      setBubbleText(`✨ ĐỘT PHÁ THÀNH CÔNG! Khai phá đan điền, bước vào Trúc Cơ Kỳ 🧘!`);
    }
  };

  // ─── Idle Time Rewards: 80% Raw Linh Khí (+5 XP), 20% Pill Drop ─────────────
  useEffect(() => {
    const id = setInterval(() => {
      setTotalMinutes(m => m + 1);
      const roll = Math.random();
      if (roll < 0.12) {
        grantItem('basic', 1, '💊 1 phút Linh Khí: Nhận 1 Tụ Linh Đan!');
      } else if (roll < 0.17) {
        grantItem('recover', 1, '🍃 1 phút Linh Khí: Nhận 1 Hồi Phục Đan!');
      } else if (roll < 0.19) {
        grantItem('great', 1, '🌸 Linh quang chợt lóe: Nhận 1 Đại Hoàn Đan!');
      } else if (roll < 0.20) {
        grantItem('talisman', 1, '🔱 Thần minh chiếu cố: Nhận 1 Hộ Kiếp Phù!');
      } else {
        // ~80% chance: Hấp thu Linh Khí (+5 XP)
        addXP(5, '✨ 1 phút Ngộ Đạo: Hấp thu Linh Khí thiên địa (+5 XP)');
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);

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

      if (deployCount > 1) {
        setMultiDeployCount(c => c + 1);
      }

      if (deployList.length > 0) {
        setDeployedServices(prev => Array.from(new Set([...prev, ...deployList])));
      }
      grantItem('recover', deployCount);

      const commentary = getDeployCommentary(deployList[0] || '', deployList);
      setBubbleText(commentary);
    }
  }, [isDeploying, selectedService, activeDeployServices]);

  // ─── Movement & Autonomous State Machine ──────────────────────────────────
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

  // Pointer Interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); let dragged = false;
    dragStartRef.current = { startX: e.clientX, startY: e.clientY, initPosX: posX, initPosY: posYBottom };

    const onMove = (me: PointerEvent) => {
      const dx = me.clientX - dragStartRef.current.startX;
      const dy = me.clientY - dragStartRef.current.startY;
      if (!dragged && Math.hypot(dx, dy) > 6) { dragged = true; setIsDragging(true); setState(directionRef.current === 'left' ? 'jump_left' : 'jump_right'); setBubbleText('🎈 Thuật Nhiếp Hồn! Đại nhân bế Thỏ bay nè...'); }
      if (dragged) {
        const newX = Math.max(5, Math.min(95, dragStartRef.current.initPosX + (dx / window.innerWidth) * 100));
        const newY = Math.max(10, Math.min(window.innerHeight - 80, dragStartRef.current.initPosY - dy));
        setPosX(newX);
        setPosYBottom(newY);

        if (newY > 220) unlockAchievement('secret_sky_soarer');
        if (newY <= 15) unlockAchievement('secret_ground_roller');
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      if (dragged) {
        setIsDragging(false); triggerGentleHop();
        const newDrags = totalDrags + 1;
        setTotalDrags(newDrags);
        addXP(10, '🎉 Ngự Kiếm đáp đất an toàn! (+10 XP)');
        if (newDrags % 5 === 0) grantItem('basic', 1, `🏅 5 lần ngự kiếm! +1 💊 Tụ Linh Đan!`);
      } else {
        setShowInventory(p => !p);
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (isDismissed) return null;

  const bgX = -(frame * MASCOT_SIZE);
  const bgY = -(BUNNY_STATE_ROW_INDEX[state] * MASCOT_SIZE);

  const getVerticalOffset = () => {
    if (state.startsWith('jump') || isDragging) return [0,-20,-42,-62,-75,-70,-50,-28,-10,0][frame % 10];
    if (state.startsWith('walk') || state.startsWith('run')) return [0,-2,-4,-2,0,-2,-4,-2,0,0][frame % 10];
    if (state === 'idle') return [0,-1,-3,-1][frame % 4];
    return 0;
  };
  const currentOffsetY = getVerticalOffset();

  // Filter achievements for achievements modal tab
  const filteredAchievements = ACHIEVEMENTS.filter(ach => {
    const matchesCat = achCategoryFilter === 'all' || ach.category === achCategoryFilter;
    const matchesSearch = !achSearchQuery.trim() || 
      ach.title.toLowerCase().includes(achSearchQuery.toLowerCase()) || 
      ach.description.toLowerCase().includes(achSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

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
        {/* Speech Bubble */}
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
            title="Xem Cảnh Giới Tu Tiên, Thân Pháp & Pháp Bảo"
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

          {/* Breakthrough or Inventory Button */}
          {isReadyToBreakthrough ? (
            <button
              onClick={handleBreakthroughOrKiep}
              onPointerDown={e => e.stopPropagation()}
              title={isTribulationLevel ? `ĐỘ KIẾP! Tỉ lệ thành công: ${currentSuccessRatePercent}% (${failCountAtCurrentLevel > 0 ? `+${failCountAtCurrentLevel * 5}% Pity` : 'Cơ bản'})` : 'ĐỘT PHÁ lên Trúc Cơ Kỳ!'}
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
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                <span>{isTribulationLevel ? `🌩️ ĐỘ KIẾP (${currentSuccessRatePercent}%)` : '✨ ĐỘT PHÁ'}</span>
                {failCountAtCurrentLevel > 0 && (
                  <span style={{ fontSize: '8.5px', color: '#7f1d1d', fontWeight: 900 }}>+${failCountAtCurrentLevel * 5}% Tích Tụ</span>
                )}
                {isTalismanActive && (
                  <span style={{ fontSize: '8.5px', color: '#854d0e', fontWeight: 800 }}>🔱 +25% Phù</span>
                )}
              </div>
            </button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); setShowInventory(p => !p); }}
              onPointerDown={e => e.stopPropagation()}
              title="Mở túi Linh Đan"
              style={{
                background: totalInventory > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.2)',
                border: `1px solid ${totalInventory > 0 ? 'rgba(245,158,11,0.5)' : 'rgba(100,116,139,0.3)'}`,
                borderRadius: '8px', padding: '2px 8px',
                fontSize: '11px', fontWeight: 700, color: totalInventory > 0 ? '#fbbf24' : '#94a3b8',
                cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <Package style={{ width: '13px', height: '13px', color: totalInventory > 0 ? '#fbbf24' : '#94a3b8' }} />
              <span>{totalInventory}</span>
            </button>
          )}

          {/* Dismiss button */}
          <button
            onClick={e => { e.stopPropagation(); setIsDismissed(true); }}
            onPointerDown={e => e.stopPropagation()}
            title="Ẩn Thỏ"
            style={{ color: '#64748b', cursor: 'pointer', padding: '2px', borderRadius: '50%', background: 'none', border: 'none', flexShrink: 0 }}
          >
            <X style={{ width: '11px', height: '11px' }} />
          </button>

          {/* Bubble arrow */}
          <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '8px', height: '8px', background: 'rgba(10,13,22,0.96)', borderRight: '1px solid rgba(245,158,11,0.45)', borderBottom: '1px solid rgba(245,158,11,0.45)' }} />
        </div>

        {/* ── Inventory Panel ── */}
        {showInventory && !isReadyToBreakthrough && (
          <div
            style={{
              position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
              marginBottom: '12px', background: 'rgba(10,13,22,0.97)',
              border: '1px solid rgba(245,158,11,0.4)', borderRadius: '14px',
              padding: '12px', width: '250px', zIndex: 200,
              boxShadow: '0 8px 32px rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)'
            }}
            onPointerDown={e => e.stopPropagation()}
          >
            <div style={{ color: '#fbbf24', fontWeight: 800, fontSize: '11px', marginBottom: '8px', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>🎒 Túi Trữ Vật — Linh Đan</span>
              <span style={{ fontSize: '9px', color: '#86efac' }}>⚡ BỎ CD</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {ITEM_CONFIG.map(item => {
                const qty = inventory[item.id];
                const isTalismItem = item.isBuff;
                const isActive = isTalismItem && isTalismanActive;
                const disabled = qty === 0 || isActive;
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
                        {isActive && <span style={{ color: '#fde047', fontSize: '9px', marginLeft: '4px' }}>● HIỆU LỰC</span>}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '9.5px', marginTop: '1px' }}>
                        {item.isBuff
                          ? isActive
                            ? `⏱️ Còn ${Math.ceil(talismanCountdown / 60)}p${talismanCountdown % 60}s • +25% Độ Kiếp`
                            : `Kích hoạt: +25% Độ Kiếp / 5 phút`
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
                <div>💊 <strong style={{ color: '#93c5fd' }}>Tụ Linh Đan:</strong> Tỉ lệ treo máy, kéo thả Thỏ 5 lần</div>
                <div>🍃 <strong style={{ color: '#86efac' }}>Hồi Phục Đan:</strong> Deploy thành công, treo máy may mắn</div>
                <div>🌸 <strong style={{ color: '#f9a8d4' }}>Đại Hoàn Đan:</strong> Độ Kiếp thành công, mốc thiền/deploy</div>
                <div>🔱 <strong style={{ color: '#fde047' }}>Hộ Kiếp Phù:</strong> Mốc deploy & bế quan lâu dài</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Bunny Sprite + Orbiting Cultivation Treasure ── */}
        <div
          className="relative transition-transform duration-200 hover:scale-110 active:scale-95 flex items-center justify-center"
          style={{
            transform: `translateY(${currentOffsetY}px)`,
            width: `${MASCOT_SIZE}px`,
            height: `${MASCOT_SIZE}px`
          }}
          title="Nhấp chuột mở Túi Đan 🎒 | KÉO THẢ để nhận XP 🎈"
        >
          {activeTreasureId && (
            <TreasureOrbit treasureId={activeTreasureId} isDeploying={isDeploying} />
          )}

          {activeSkinInfo.skinId === 'aura'       && <div className="absolute inset-0 rounded-full animate-pulse shadow-[0_0_30px_10px_rgba(245,158,11,0.7)] pointer-events-none" />}
          {activeSkinInfo.skinId === 'dai_la'     && <div className="absolute inset-0 rounded-full animate-pulse shadow-[0_0_35px_12px_rgba(56,189,248,0.8)] pointer-events-none" />}
          {activeSkinInfo.skinId === 'hon_nguyen' && <div className="absolute inset-0 rounded-full animate-pulse shadow-[0_0_40px_14px_rgba(168,85,247,0.8)] pointer-events-none border-2 border-purple-400" />}
          {activeSkinInfo.skinId === 'god'        && <><div className="absolute -top-2 -right-3 text-base z-10 animate-ping">☯️</div><div className="absolute inset-0 rounded-full animate-pulse shadow-[0_0_40px_16px_rgba(234,179,8,0.9)] pointer-events-none border-2 border-amber-300" /></>}

          <div
            className="bg-no-repeat"
            style={{
              width: `${MASCOT_SIZE}px`,
              height: `${MASCOT_SIZE}px`,
              backgroundImage: `url(/skins/${activeSkinInfo.level}.png)`,
              backgroundSize: `${MASCOT_SIZE * 10}px ${MASCOT_SIZE * 10}px`,
              backgroundPosition: `${bgX}px ${bgY}px`,
              backgroundRepeat: 'no-repeat',
              backgroundColor: 'transparent',
              imageRendering: 'pixelated'
            }}
          />
          {state === 'sleep' && <div className="absolute -top-2 left-0 animate-bounce"><Moon style={{ width: '16px', height: '16px', color: '#f59e0b' }} /></div>}
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

      {/* ── Costume & Achievement Modal (Large 4-Column Layout) ── */}
      {showCostumePicker && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)' }}
          onPointerDown={e => e.stopPropagation()}
        >
          <div style={{ background: '#0b0f19', border: '1px solid rgba(245,158,11,0.45)', borderRadius: '22px', width: '96%', maxWidth: '1180px', padding: '24px', boxShadow: '0 20px 60px rgba(245,158,11,0.25)', color: '#fff', position: 'relative', overflowX: 'hidden' }}>
            {/* Header Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(245,158,11,0.18)', paddingBottom: '14px', marginBottom: '16px', justifyContent: 'space-between', overflowX: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setModalTab('skins')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: modalTab === 'skins' ? 'rgba(245,158,11,0.22)' : 'transparent',
                    border: `1px solid ${modalTab === 'skins' ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: 800,
                    color: modalTab === 'skins' ? '#fde68a' : '#94a3b8', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <Crown style={{ width: '15px', height: '15px', color: modalTab === 'skins' ? '#f59e0b' : '#64748b' }} />
                  🥋 Thân Pháp ({LEVEL_CONFIG.filter(l => xp >= l.reqXp).length}/{LEVEL_CONFIG.length})
                </button>

                <button
                  onClick={() => setModalTab('treasures')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: modalTab === 'treasures' ? 'rgba(245,158,11,0.22)' : 'transparent',
                    border: `1px solid ${modalTab === 'treasures' ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: 800,
                    color: modalTab === 'treasures' ? '#bae6fd' : '#94a3b8', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <Zap style={{ width: '15px', height: '15px', color: modalTab === 'treasures' ? '#38bdf8' : '#64748b' }} />
                  🔮 Pháp Bảo ({LEVEL_CONFIG.filter(l => xp >= l.reqXp).length}/{LEVEL_CONFIG.length})
                </button>

                <button
                  onClick={() => setModalTab('achievements')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: modalTab === 'achievements' ? 'rgba(245,158,11,0.22)' : 'transparent',
                    border: `1px solid ${modalTab === 'achievements' ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: 800,
                    color: modalTab === 'achievements' ? '#fde68a' : '#94a3b8', cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  <Trophy style={{ width: '15px', height: '15px', color: modalTab === 'achievements' ? '#fbbf24' : '#64748b' }} />
                  🏆 Thành Tựu ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
                </button>
              </div>

              <button onClick={() => setShowCostumePicker(false)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '6px', flexShrink: 0 }}>
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            {/* Progress Card */}
            <div style={{ background: 'rgba(22,31,51,0.9)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: '14px', padding: '14px 18px', marginBottom: '16px', overflowX: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden' }}>
                  <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BunnySkinSprite level={activeSkinInfo.level} size={52} />
                    <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}>
                      <TreasureSprite treasureId={activeTreasureId} size={28} />
                    </div>
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: '#fbbf24', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Lv.{currentLevel}: {currentLevelInfo.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 600, marginTop: '3px', display: 'flex', gap: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span>🥋 Thân Pháp: <strong style={{ color: '#fde68a' }}>{activeSkinInfo.name}</strong></span>
                      <span>🔮 Pháp Bảo: <strong style={{ color: '#38bdf8' }}>{activeTreasureInfo.skinName}</strong></span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Linh Lực: {xp} XP • Túi Đan: {totalInventory} viên • Thành Tựu: {unlockedAchievements.length}/{ACHIEVEMENTS.length}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#f59e0b' }}>{progressPercent.toFixed(0)}%</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{nextLevelInfo ? `${xp}/${nextLevelInfo.reqXp} XP` : 'TIÊN ĐẾ ĐỈNH CAO'}</div>
                </div>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(30,41,59,0.8)', borderRadius: '999px', overflow: 'hidden', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div style={{ height: '100%', width: `${progressPercent}%`, background: 'linear-gradient(90deg,#f59e0b,#a855f7,#22d3ee)', borderRadius: '999px', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', gap: '14px', marginTop: '10px', overflowX: 'hidden', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>⏱️ {totalMinutes}m thiền</span>
                <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>🚀 {totalDeploys} deploys</span>
                <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>🎈 {totalDrags} kéo</span>
                <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>💊 {totalPillsConsumed} đan</span>
                {failCountAtCurrentLevel > 0 && <span style={{ fontSize: '10.5px', color: '#fbbf24', fontWeight: 700 }}>🕯️ Pity: +{failCountAtCurrentLevel * 5}% Tích Tụ</span>}
              </div>
            </div>

            {/* TAB 1: Skins (Thân Pháp) Grid - 4 Columns */}
            {modalTab === 'skins' && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(251,191,36,0.85)', marginBottom: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  DANH SÁCH 17 THÂN PHÁP / SKIN THỎ
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(245px, 1fr))', gap: '10px', maxHeight: '460px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
                  {LEVEL_CONFIG.map(lvl => {
                    const unlocked = xp >= lvl.reqXp;
                    const equipped = activeSkin === lvl.skinId;
                    return (
                      <button
                        key={lvl.skinId}
                        disabled={!unlocked}
                        onClick={() => {
                          if (unlocked) {
                            setActiveSkin(lvl.skinId);
                            setShowCostumePicker(false);
                            setBubbleText(`✨ Đã thay Thân Pháp [${lvl.name}]! 🐰`);
                          }
                        }}
                        style={{
                          padding: '10px 12px', borderRadius: '12px', textAlign: 'left',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: equipped
                            ? 'rgba(245,158,11,0.18)'
                            : unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.35)',
                          border: `1px solid ${equipped ? '#f59e0b' : unlocked ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.04)'}`,
                          color: equipped ? '#fde68a' : unlocked ? '#e2e8f0' : '#4b5563',
                          cursor: unlocked ? 'pointer' : 'not-allowed', opacity: unlocked ? 1 : 0.5,
                          transition: 'all 0.15s', width: '100%', boxSizing: 'border-box'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          <div style={{ width: '44px', height: '44px', filter: unlocked ? 'none' : 'grayscale(100%) opacity(0.4)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BunnySkinSprite level={lvl.level} size={42} />
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 800, fontSize: '12px', color: equipped ? '#fbbf24' : unlocked ? '#f1f5f9' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Lv.{lvl.level}: {lvl.name}
                            </div>
                            <div style={{ fontSize: '10.5px', fontWeight: 600, color: unlocked ? '#fde68a' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                              {unlocked ? `Thân Pháp Cảnh Giới ${lvl.level}` : `Khóa (Cần ${lvl.reqXp} XP)`}
                            </div>
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, marginLeft: '6px' }}>
                          {equipped ? (
                            <div style={{ background: '#f59e0b', color: '#000', padding: '3px 8px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Check style={{ width: '10px', height: '10px', strokeWidth: 3 }} />
                              Mặc
                            </div>
                          ) : unlocked ? (
                            <div style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.4)', color: '#fde68a', padding: '3px 8px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 800 }}>
                              Mặc
                            </div>
                          ) : (
                            <Lock style={{ width: '13px', height: '13px', color: '#475569' }} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* TAB 2: Treasures (Pháp Bảo) Grid - 4 Columns */}
            {modalTab === 'treasures' && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(56,189,248,0.85)', marginBottom: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  DANH SÁCH 17 PHÁP BẢO HỘ THỂ
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(245px, 1fr))', gap: '10px', maxHeight: '460px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
                  {LEVEL_CONFIG.map(lvl => {
                    const unlocked = xp >= lvl.reqXp;
                    const equipped = activeTreasureId === lvl.treasureId;
                    return (
                      <button
                        key={lvl.treasureId}
                        disabled={!unlocked}
                        onClick={() => {
                          if (unlocked) {
                            setActiveTreasureId(lvl.treasureId);
                            setShowCostumePicker(false);
                            setBubbleText(`✨ Đã ngự Pháp Bảo [${lvl.skinName}] gia trì hộ thể! 🔮`);
                          }
                        }}
                        style={{
                          padding: '10px 12px', borderRadius: '12px', textAlign: 'left',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: equipped
                            ? 'rgba(56,189,248,0.18)'
                            : unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.35)',
                          border: `1px solid ${equipped ? '#38bdf8' : unlocked ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.04)'}`,
                          color: equipped ? '#bae6fd' : unlocked ? '#e2e8f0' : '#4b5563',
                          cursor: unlocked ? 'pointer' : 'not-allowed', opacity: unlocked ? 1 : 0.5,
                          transition: 'all 0.15s', width: '100%', boxSizing: 'border-box'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          <div style={{ width: '44px', height: '44px', filter: unlocked ? 'none' : 'grayscale(100%) opacity(0.4)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <TreasureSprite treasureId={lvl.treasureId} size={42} />
                          </div>
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 800, fontSize: '12px', color: equipped ? '#38bdf8' : unlocked ? '#f1f5f9' : '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lvl.skinName}
                            </div>
                            <div style={{ fontSize: '10.5px', fontWeight: 600, color: unlocked ? '#94a3b8' : '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                              {unlocked ? `Cảnh Giới Lv.${lvl.level}: ${lvl.name}` : `Khóa (Cần ${lvl.reqXp} XP)`}
                            </div>
                          </div>
                        </div>
                        <div style={{ flexShrink: 0, marginLeft: '6px' }}>
                          {equipped ? (
                            <div style={{ background: '#38bdf8', color: '#000', padding: '3px 8px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Check style={{ width: '10px', height: '10px', strokeWidth: 3 }} />
                              Ngự
                            </div>
                          ) : unlocked ? (
                            <div style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.4)', color: '#38bdf8', padding: '3px 8px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 800 }}>
                              Ngự
                            </div>
                          ) : (
                            <Lock style={{ width: '13px', height: '13px', color: '#475569' }} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* TAB 3: Achievements Grid - 4 Columns */}
            {modalTab === 'achievements' && (
              <>
                {/* Search & Category Filter Row */}
                <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#64748b' }} />
                      <input
                        type="text"
                        placeholder="🔍 Tìm kiếm trong 102 thành tựu..."
                        value={achSearchQuery}
                        onChange={e => setAchSearchQuery(e.target.value)}
                        style={{
                          width: '100%', background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(245,158,11,0.28)',
                          borderRadius: '10px', padding: '7px 12px 7px 32px', fontSize: '12px', color: '#fff',
                          outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '12px', color: '#86efac', fontWeight: 800, flexShrink: 0 }}>
                      🏆 {unlockedAchievements.length}/102 Thành Tựu
                    </div>
                  </div>

                  {/* Category Filter Pills */}
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                    {[
                      { key: 'all', label: 'Tất Cả (102)' },
                      { key: 'cultivation', label: '🧘 Tu Tiên (28)' },
                      { key: 'devops', label: '🚀 DevOps (26)' },
                      { key: 'activity', label: '⏱️ Hoạt Động (28)' },
                      { key: 'secret', label: '🔮 Bí Cảnh (20)' }
                    ].map(cat => (
                      <button
                        key={cat.key}
                        onClick={() => setAchCategoryFilter(cat.key)}
                        style={{
                          background: achCategoryFilter === cat.key ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${achCategoryFilter === cat.key ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 700,
                          color: achCategoryFilter === cat.key ? '#fde68a' : '#94a3b8', cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(245px, 1fr))', gap: '10px', maxHeight: '420px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
                  {filteredAchievements.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b', fontSize: '13px', padding: '32px 0' }}>
                      Không tìm thấy thành tựu nào khớp với từ khóa "{achSearchQuery}"
                    </div>
                  ) : (
                    filteredAchievements.map(ach => {
                      const isUnlocked = unlockedAchievements.includes(ach.id);
                      const isSecret = ach.isSecret && !isUnlocked;

                      return (
                        <div
                          key={ach.id}
                          style={{
                            padding: '10px 12px',
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
                            opacity: isUnlocked ? 1 : 0.7,
                            transition: 'all 0.15s',
                            boxSizing: 'border-box',
                            width: '100%'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', overflow: 'hidden' }}>
                            <span style={{ fontSize: '22px', flexShrink: 0, filter: isUnlocked ? 'none' : 'grayscale(80%)' }}>
                              {isSecret ? '❓' : ach.icon}
                            </span>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '11.5px', color: isUnlocked ? '#fbbf24' : isSecret ? '#c084fc' : '#e2e8f0' }}>
                                  {isSecret ? 'Thành Tựu Ẩn (Bí Cảnh)' : ach.title}
                                </span>
                                {ach.isSecret && (
                                  <span style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '4px', padding: '0px 4px', fontSize: '8px', color: '#d8b4fe', fontWeight: 600 }}>
                                    ẨN
                                  </span>
                                )}
                              </div>

                              <div style={{ fontSize: '10px', color: isUnlocked ? '#cbd5e1' : '#94a3b8', marginTop: '2px', lineHeight: '1.35' }}>
                                {isSecret ? (ach.hint ?? 'Bí ẩn đang chờ khám phá...') : ach.description}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '9.5px', color: isUnlocked ? '#86efac' : '#fde047', fontWeight: 600 }}>
                                <Gift style={{ width: '10px', height: '10px' }} />
                                {ach.rewardText}
                              </div>
                            </div>
                          </div>

                          <div style={{ flexShrink: 0, marginLeft: '4px', marginTop: '2px' }}>
                            {isUnlocked ? (
                              <div style={{ width: '19px', height: '19px', background: '#f59e0b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Check style={{ width: '11px', height: '11px', color: '#000', strokeWidth: 3 }} />
                              </div>
                            ) : (
                              <Lock style={{ width: '13px', height: '13px', color: '#64748b' }} />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
