import React, { useState, useEffect, useRef } from 'react';
import { Moon, X, Crown, Zap, Lock, Check, Package, Trophy, Sparkles, Award, Gift, ShieldAlert, Search, RefreshCw, Compass } from 'lucide-react';

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
type ItemId = 'basic' | 'recover' | 'great' | 'talisman' | 'revive';

interface ItemConfig {
  id: ItemId;
  name: string;
  emoji: string;
  xpValue: number;
  maxStack: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'supreme';
  description: string;
  isBuff?: boolean;
  buffDurationMs?: number;
  buffSuccessBonus?: number;
}

export const ITEM_CONFIG: ItemConfig[] = [
  { id: 'basic', name: 'Tụ Linh Đan', emoji: '💊', xpValue: 8, maxStack: 999, rarity: 'common', description: '+8 Linh Lực • Nhận: tỉ lệ may mắn khi treo máy, kéo thả Thỏ' },
  { id: 'recover', name: 'Hồi Phục Đan', emoji: '🍃', xpValue: 20, maxStack: 999, rarity: 'uncommon', description: '+20 Linh Lực • Nhận: deploy thành công, Lò Bát Quái' },
  { id: 'great', name: 'Đại Hoàn Đan', emoji: '🌸', xpValue: 50, maxStack: 999, rarity: 'rare', description: '+50 Linh Lực • Nhận: Độ Kiếp thành công, Lò Bát Quái' },
  { id: 'talisman', name: 'Hộ Kiếp Phù', emoji: '🔱', xpValue: 0, maxStack: 99, rarity: 'legendary', isBuff: true, buffDurationMs: 5 * 60 * 1000, buffSuccessBonus: 0.25, description: '+25% tỉ lệ Độ Kiếp trong 5 phút • Luyện từ Lò Bát Quái' },
  { id: 'revive', name: 'Cửu Chuyển Hoàn Hồn Đan', emoji: '🔮', xpValue: 100, maxStack: 99, rarity: 'supreme', isBuff: true, buffDurationMs: 10 * 60 * 1000, buffSuccessBonus: 0.35, description: '+35% Tỉ lệ Độ Kiếp & Bảo hộ 100% không tổn hại XP khi thất bại (10 phút) • Luyện từ Lò Bát Quái' }
];

// ─── Xianxia Raw Herbal & Mineral Alchemy Ingredients ─────────────────────────
export type HerbId =
  | 'herb_lingzhi'
  | 'herb_ginseng'
  | 'mineral_iron'
  | 'herb_lotus'
  | 'herb_fire_fruit'
  | 'mineral_crystal'
  | 'herb_bamboo'
  | 'herb_dragon_grass'
  | 'mineral_gold'
  | 'herb_phoenix_flower'
  | 'mineral_star_stone'
  | 'herb_immortal_root';

export interface HerbConfig {
  id: HerbId;
  name: string;
  emoji: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'supreme';
  dropChance: number;
  description: string;
}

export const HERB_CONFIG: HerbConfig[] = [
  { id: 'herb_lingzhi',        name: 'Linh Tuyền Thảo',      emoji: '🌿', rarity: 'common',    dropChance: 0.12,  description: 'Thảo dược ven bờ linh tuyền hấp thụ khí cơ (Tỉ lệ rớt 12%/phút)' },
  { id: 'herb_ginseng',        name: 'Bách Niên Nhân Sâm',  emoji: '🪵', rarity: 'common',    dropChance: 0.10,  description: 'Nhân sâm trăm tuổi hút linh khí đất trời (Tỉ lệ rớt 10%/phút)' },
  { id: 'mineral_iron',        name: 'Huyền Thiết Quặng',    emoji: '🪨', rarity: 'common',    dropChance: 0.09,  description: 'Quặng sắt linh khí chứa hắc kim cổ xưa (Tỉ lệ rớt 9%/phút)' },
  { id: 'herb_lotus',          name: 'Cửu Phẩm Băng Liên',   emoji: '🪷', rarity: 'uncommon',  dropChance: 0.07,  description: 'Băng liên sen tuyết ngàn năm trên đỉnh tuyết sơn (Tỉ lệ rớt 7%/phút)' },
  { id: 'herb_fire_fruit',     name: 'Xích Diệm Hỏa Quả',   emoji: '🍎', rarity: 'uncommon',  dropChance: 0.06,  description: 'Hỏa quả ngưng tụ từ cực dương hỏa (Tỉ lệ rớt 6%/phút)' },
  { id: 'mineral_crystal',     name: 'Thạch Anh Linh Tinh',  emoji: '💎', rarity: 'uncommon',  dropChance: 0.05,  description: 'Tinh thể ngọc bích phát sáng linh quang (Tỉ lệ rớt 5%/phút)' },
  { id: 'herb_bamboo',         name: 'Ninh Sương Trúc Chồi', emoji: '🎍', rarity: 'rare',      dropChance: 0.035, description: 'Trúc tiên đọng sương mai lúc rạng đông (Tỉ lệ rớt 3.5%/phút)' },
  { id: 'herb_dragon_grass',   name: 'Long Kế Thảo',        emoji: '🐉', rarity: 'rare',      dropChance: 0.025, description: 'Cỏ thiêng thấm huyết mạch linh long (Tỉ lệ rớt 2.5%/phút)' },
  { id: 'mineral_gold',        name: 'Thái Cổ Kim Tinh',    emoji: '🌟', rarity: 'rare',      dropChance: 0.02,  description: 'Tinh quặng vàng Thái Cổ chói lọi (Tỉ lệ rớt 2%/phút)' },
  { id: 'herb_phoenix_flower', name: 'Phượng Hoàng Hỏa Hoa', emoji: '🌺', rarity: 'legendary', dropChance: 0.01,  description: 'Hoa lửa thần phượng tắm từ biển lửa (Tỉ lệ rớt 1%/phút)' },
  { id: 'mineral_star_stone',  name: 'Cửu Thiên Tinh Thạch', emoji: '🌌', rarity: 'legendary', dropChance: 0.007, description: 'Đá thiên thạch rơi từ cửu trùng thiên (Tỉ lệ rớt 0.7%/phút)' },
  { id: 'herb_immortal_root',  name: 'Hỗn Nguyên Thần Căn',  emoji: '👑', rarity: 'supreme',   dropChance: 0.003, description: 'Rễ cây thần Thái Cổ thuở khai thiên lập địa (Tỉ lệ rớt 0.3%/phút)' }
];

export type IngredientId = ItemId | HerbId;

export interface CraftingRecipe {
  id: string;
  name: string;
  emoji: string;
  resultItemId: ItemId;
  resultAmount: number;
  ingredients: { id: IngredientId; amount: number }[];
  spiritStonesCost: number;
  successRate: number;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'supreme';
}

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    id: 'craft_basic',
    name: 'Luyện Tụ Linh Đan',
    emoji: '💊',
    resultItemId: 'basic',
    resultAmount: 2,
    ingredients: [{ id: 'herb_lingzhi', amount: 2 }, { id: 'herb_ginseng', amount: 1 }],
    spiritStonesCost: 10,
    successRate: 0.98,
    description: 'Chế tạo 2x Tụ Linh Đan (+16 XP) từ 2x Linh Tuyền Thảo + 1x Bách Niên Nhân Sâm & 10 Linh Thạch (Thành công 98%).',
    rarity: 'common'
  },
  {
    id: 'craft_recover',
    name: 'Luyện Hồi Phục Đan',
    emoji: '🍃',
    resultItemId: 'recover',
    resultAmount: 2,
    ingredients: [{ id: 'herb_lotus', amount: 2 }, { id: 'herb_fire_fruit', amount: 2 }, { id: 'mineral_iron', amount: 1 }],
    spiritStonesCost: 25,
    successRate: 0.90,
    description: 'Chế tạo 2x Hồi Phục Đan (+40 XP) từ 2x Cửu Phẩm Băng Liên + 2x Xích Diệm Hỏa Quả + 1x Huyền Thiết Quặng & 25 Linh Thạch (Thành công 90%).',
    rarity: 'uncommon'
  },
  {
    id: 'craft_great',
    name: 'Luyện Đại Hoàn Đan',
    emoji: '🌸',
    resultItemId: 'great',
    resultAmount: 1,
    ingredients: [{ id: 'herb_dragon_grass', amount: 2 }, { id: 'herb_bamboo', amount: 2 }, { id: 'mineral_gold', amount: 1 }],
    spiritStonesCost: 50,
    successRate: 0.85,
    description: 'Chế tạo 1x Đại Hoàn Đan (+50 XP) từ 2x Long Kế Thảo + 2x Ninh Sương Trúc Chồi + 1x Thái Cổ Kim Tinh & 50 Linh Thạch (Thành công 85%).',
    rarity: 'rare'
  },
  {
    id: 'craft_talisman',
    name: 'Luyện Hộ Kiếp Phù',
    emoji: '🔱',
    resultItemId: 'talisman',
    resultAmount: 1,
    ingredients: [{ id: 'herb_phoenix_flower', amount: 2 }, { id: 'mineral_star_stone', amount: 1 }],
    spiritStonesCost: 100,
    successRate: 0.75,
    description: 'Chế tạo 1x Hộ Kiếp Phù (+25% Độ Kiếp) từ 2x Phượng Hoàng Hỏa Hoa + 1x Cửu Thiên Tinh Thạch & 100 Linh Thạch (Thành công 75%).',
    rarity: 'legendary'
  },
  {
    id: 'craft_revive',
    name: 'Cửu Chuyển Hoàn Hồn Đan',
    emoji: '🔮',
    resultItemId: 'revive',
    resultAmount: 1,
    ingredients: [{ id: 'herb_immortal_root', amount: 2 }, { id: 'mineral_star_stone', amount: 2 }, { id: 'herb_phoenix_flower', amount: 2 }],
    spiritStonesCost: 200,
    successRate: 0.65,
    description: 'Đan Cực Phẩm! Bảo hộ 100% không tổn hại XP khi Độ Kiếp thất bại & +35% Tỉ lệ Độ Kiếp từ 2x Hỗn Nguyên Thần Căn + 2x Cửu Thiên Tinh Thạch + 2x Phượng Hoàng Hỏa Hoa & 200 Linh Thạch (Thành công 65%).',
    rarity: 'supreme'
  }
];

const RARITY_COLORS: Record<string, string> = {
  common:    '#93c5fd',
  uncommon:  '#86efac',
  rare:      '#f9a8d4',
  legendary: '#fde047',
  supreme:   '#c084fc'
};

const PILL_COOLDOWN_MS = 0; // No Cooldown

// ─── 10 Xianxia Fantasy Mounts System ──────────────────────────────────────────
export interface MountConfig {
  id: string;
  name: string;
  species: string;
  element: string;
  emoji: string;
  spriteFile: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'supreme';
  dragXpBonus: number;
  dropRate: number; // Percentage probability in Gacha
  buffName: string;
  buffDescription: string;
  breakthroughBonus?: number;
  description: string;
  auraColor: string;
  elementParticles: string[];
}

export const MOUNT_CONFIG: MountConfig[] = [
  {
    id: 'wolf',
    name: 'Thanh Phong Linh Lang',
    species: 'Spirit Wolf',
    element: 'Wind 🌪️',
    emoji: '🐺',
    spriteFile: 'thanh_phong_lang.png',
    rarity: 'common',
    dragXpBonus: 5,
    dropRate: 8.0,
    buffName: 'Tật Phong Thần Hành',
    buffDescription: '+5 XP / lần kéo thả Thỏ',
    description: 'Bạch lang cuộn vầng phong khí, phi hành nhanh như chớp lốc.',
    auraColor: '#38bdf8',
    elementParticles: ['💨', '🌀', '✨']
  },
  {
    id: 'deer',
    name: 'Ngọc Linh Lộc',
    species: 'Jade Spirit Deer',
    element: 'Nature 🍃',
    emoji: '🦌',
    spriteFile: 'ngoc_linh_loc.png',
    rarity: 'common',
    dragXpBonus: 8,
    dropRate: 6.0,
    buffName: 'Mộc Linh Dưỡng Tâm',
    buffDescription: '+8 XP / lần kéo & Bồ đề dưỡng khí',
    description: 'Hươu tiên sừng ngọc lục bảo tỏa ánh thuần thanh linh khí.',
    auraColor: '#4ade80',
    elementParticles: ['🍃', '🌿', '✨']
  },
  {
    id: 'tiger',
    name: 'Kim Văn Linh Hổ',
    species: 'Golden Spirit Tiger',
    element: 'Earth 🌾',
    emoji: '🐯',
    spriteFile: 'kim_van_ho.png',
    rarity: 'uncommon',
    dragXpBonus: 12,
    dropRate: 4.0,
    buffName: 'Kim Cương Bạt Nhụy',
    buffDescription: '+12 XP / kéo & Triển khai Đan Điền gia tăng',
    description: 'Thần hổ mang bạch kim văn, khí tức dạt dào thối luyện đan điền.',
    auraColor: '#fbbf24',
    elementParticles: ['✨', '🔥', '🌾']
  },
  {
    id: 'fox',
    name: 'Cửu Vĩ Linh Hồ',
    species: 'Nine-Tailed Celestial Fox',
    element: 'Spirit 🔮',
    emoji: '🦊',
    spriteFile: 'cuu_vi_ho.png',
    rarity: 'uncommon',
    dragXpBonus: 15,
    dropRate: 2.5,
    buffName: 'Cửu Vĩ Âm Dương',
    buffDescription: '+15 XP / kéo & Tăng +3% Tỉ lệ Độ Kiếp vĩnh viễn',
    breakthroughBonus: 0.03,
    description: 'Cáo chín đuôi bồng bềnh hoa nguyệt, ảo mộng tam giới.',
    auraColor: '#c084fc',
    elementParticles: ['🔮', '💜', '✨']
  },
  {
    id: 'dragon_azure',
    name: 'Thanh Vân Giao Long',
    species: 'Azure Chinese Dragon',
    element: 'Water & Cloud 🌊',
    emoji: '🐲',
    spriteFile: 'thanh_lan_long.png',
    rarity: 'rare',
    dragXpBonus: 20,
    dropRate: 1.5,
    buffName: 'Long Vực Cam Lồ',
    buffDescription: '+20 XP / kéo & Gia trì 15% Đan Dược thần hiệu',
    description: 'Thần long mình xanh ngọc uốn lượn cưỡi mây đạp sóng.',
    auraColor: '#06b6d4',
    elementParticles: ['🌊', '💧', '☁️']
  },
  {
    id: 'eagle',
    name: 'Tử Điện Lôi Ưng',
    species: 'Thunder Eagle',
    element: 'Lightning ⚡',
    emoji: '🦅',
    spriteFile: 'tu_dien_loi_ung.png',
    rarity: 'rare',
    dragXpBonus: 25,
    dropRate: 1.0,
    buffName: 'Cuồng Lôi Thối Thể',
    buffDescription: '+25 XP / kéo & Tăng +5% Tỉ lệ Độ Kiếp thành công',
    breakthroughBonus: 0.05,
    description: 'Đại ưng cuồng lôi cánh tím, xé rách tầng mây giáng lôi đình.',
    auraColor: '#a855f7',
    elementParticles: ['⚡', '🌩️', '💜']
  },
  {
    id: 'horse',
    name: 'Thiên Lý Long Mã',
    species: 'Celestial Dragon Horse',
    element: 'Heavenly Wind 🌤️',
    emoji: '🐴',
    spriteFile: 'thien_ma_tinh_van.png',
    rarity: 'legendary',
    dragXpBonus: 30,
    dropRate: 0.5,
    buffName: 'Súc Địa Thành Thốn',
    buffDescription: '+30 XP / kéo & Multi-deploy nhận X2 Linh Lực',
    description: 'Long mã sừng rồng vảy vàng, vó đạp thái dương khí.',
    auraColor: '#fef08a',
    elementParticles: ['🌤️', '✨', '⚡']
  },
  {
    id: 'turtle',
    name: 'Huyền Vũ Linh Quy',
    species: 'Sacred Black Tortoise',
    element: 'Defense & Water 🛡️',
    emoji: '🐢',
    spriteFile: 'huyen_vu_linh_quy.png',
    rarity: 'legendary',
    dragXpBonus: 35,
    dropRate: 0.35,
    buffName: 'Huyền Vũ Hộ Tâm',
    buffDescription: '+35 XP / kéo & Tăng +8% Tỉ lệ Độ Kiếp & Bảo hộ kinh mạch',
    breakthroughBonus: 0.08,
    description: 'Linh quy mang mai Bát Quái, rắn tiên cuộn quanh bất tử.',
    auraColor: '#3b82f6',
    elementParticles: ['🛡️', '☯️', '🌊']
  },
  {
    id: 'dragon_thunder',
    name: 'Cửu Thiên Lôi Long',
    species: 'Heavenly Thunder Dragon',
    element: 'Celestial Thunder 🌩️',
    emoji: '🐉',
    spriteFile: 'thai_co_chien_ky_lan.png',
    rarity: 'supreme',
    dragXpBonus: 45,
    dropRate: 0.15,
    buffName: 'Cửu Trùng Thiên Kiếp',
    buffDescription: '+45 XP / kéo & Tăng hẳn +12% Tỉ lệ Độ Kiếp vĩnh viễn',
    breakthroughBonus: 0.12,
    description: 'Thượng cổ Lôi Long vảy lam thẫm gia trì cửu trùng thiên kiếp.',
    auraColor: '#eab308',
    elementParticles: ['⚡', '🌩️', '🔥']
  },
  {
    id: 'qilin',
    name: 'Bạch Ngọc Kỳ Lân',
    species: 'Celestial Qilin',
    element: 'Divine Blessing ☯️',
    emoji: '🦄',
    spriteFile: 'ky_lan_ngu_sac.png',
    rarity: 'supreme',
    dragXpBonus: 50,
    dropRate: 0.08,
    buffName: 'Vạn Cổ Hồng Hoang',
    buffDescription: '+50 XP / kéo & Tăng +15% Tỉ lệ Độ Kiếp & Phúc duyên vô lượng',
    breakthroughBonus: 0.15,
    description: 'Kỳ Lân bồ đề tỏa liên hoa ngát hương, công đức vô lượng.',
    auraColor: '#2dd4bf',
    elementParticles: ['☯️', '🌸', '✨']
  }
];

// ─── 10-Frame Animated Mount Sprite Component ─────────────────────────────────
export const AnimatedMountSprite: React.FC<{
  mountId: string;
  size?: number;
  direction?: 'left' | 'right';
  className?: string;
}> = ({ mountId, size = 80, direction = 'left', className = '' }) => {
  const mount = MOUNT_CONFIG.find(m => m.id === mountId) ?? MOUNT_CONFIG[0];
  const [frame, setFrame] = useState(0);

  // 10-Frame step loop timer (10 FPS)
  useEffect(() => {
    const timer = setInterval(() => setFrame(f => (f + 1) % 10), 100);
    return () => clearInterval(timer);
  }, []);

  const bounceY = Math.sin((frame / 10) * Math.PI * 2) * 5;
  const bgX = -frame * size;

  return (
    <div
      className={`relative select-none pointer-events-none flex items-center justify-center ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transform: `scaleX(${direction === 'right' ? 1 : -1})`,
        filter: `drop-shadow(0 0 14px ${mount.auraColor})`
      }}
    >
      {/* Dynamic 10-Frame Visual Animation Renderer */}
      <div
        style={{
          transform: `translateY(${bounceY}px)`,
          transition: 'transform 0.08s ease-out',
          display: 'flex', flexDirection: 'column', alignItems: 'center'
        }}
      >
        {/* Animated Mount Sprite (1280x128 10-frame horizontal sprite sheet) */}
        <div
          style={{
            width: `${size}px`,
            height: `${size}px`,
            backgroundImage: `url(/mounts/${mount.spriteFile})`,
            backgroundSize: `${size * 10}px ${size}px`,
            backgroundPosition: `${bgX}px 0px`,
            backgroundRepeat: 'no-repeat',
            backgroundColor: 'transparent',
            imageRendering: 'pixelated'
          }}
        />

        {/* Frame Cloud Base */}
        <div
          style={{
            width: `${size * 0.75}px`,
            height: '8px',
            borderRadius: '50%',
            background: `radial-gradient(ellipse at center, ${mount.auraColor}aa 0%, transparent 80%)`,
            marginTop: '2px'
          }}
        />
      </div>
    </div>
  );
};

// ─── Achievement System (102 Achievements) ──────────────────────────────────
export type AchievementCategory = 'cultivation' | 'devops' | 'activity' | 'secret';

export interface Achievement {
  id: string;
  title: string;
  category: AchievementCategory;
  icon: string;
  description: string;
  hint?: string;
  isSecret?: boolean;
  rewardText: string;
  reward: {
    itemId?: ItemId;
    itemAmount?: number;
    xp?: number;
    spiritStones?: number;
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  // Tu Tiên (28)
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

  // DevOps (26)
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

  // Activity (28)
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
  { id: 'mount_owner_1', title: 'Ngự Thần Thú Tố', category: 'activity', icon: '🐴', description: 'Sở hữu 1 Thú Cưỡi Tiên Gia đầu tiên', rewardText: '+2 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 2 } },
  { id: 'mount_owner_3', title: 'Tam Đại Linh Thú', category: 'activity', icon: '🐾', description: 'Thu phục đủ 3 Thú Cưỡi Tiên Gia', rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'mount_owner_5', title: 'Ngũ Hành Thần Thú', category: 'activity', icon: '🌟', description: 'Thu phục đủ 5 Thú Cưỡi Tiên Gia', rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'mount_owner_10', title: 'Vạn Cổ Ngự Thần Tông', category: 'activity', icon: '👑', description: 'Thu phục trọn bộ 10 Thú Cưỡi Tiên Gia', rewardText: '+3 🔱 Hộ Kiếp Phù & +1,000 Linh Thạch', reward: { itemId: 'talisman', itemAmount: 3 } },
  { id: 'pet_1', title: 'Sơ Thử Vuốt Ve', category: 'activity', icon: '🥰', description: 'Vuốt ve Thỏ Tiên lần đầu tiên', rewardText: '+1 💊 Tụ Linh Đan & +50 💎', reward: { itemId: 'basic', itemAmount: 1 } },
  { id: 'pet_10', title: 'Tiên Tình Thâm Hậu', category: 'activity', icon: '❤️', description: 'Vuốt ve Thỏ Tiên 10 lần', rewardText: '+1 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 1 } },
  { id: 'pet_50', title: 'Linh Thú Tri Âm', category: 'activity', icon: '✨', description: 'Vuốt ve Thỏ Tiên 50 lần', rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'craft_1', title: 'Luyện Đan Sơ Cấp', category: 'activity', icon: '🧪', description: 'Chế tạo đan dược trong Lò Bát Quái lần đầu tiên', rewardText: '+1 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 1 } },
  { id: 'craft_10', title: 'Dược Tông Đại Sư', category: 'activity', icon: '🔥', description: 'Luyện chế đan dược 10 lần trong Lò Bát Quái', rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'craft_revive', title: 'Cửu Chuyển Thần Đan', category: 'activity', icon: '🔮', description: 'Luyện thành công Cửu Chuyển Hoàn Hồn Đan cực phẩm', rewardText: '+2 🔱 Hộ Kiếp Phù & +500 💎', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'forge_1', title: 'Rèn Thần Binh', category: 'activity', icon: '🔨', description: 'Nâng cấp Pháp Bảo Hộ Thể lên Cấp 2 lần đầu', rewardText: '+100 💎 Linh Thạch', reward: { spiritStones: 100 } },
  { id: 'forge_max', title: 'Đại La Pháp Bảo', category: 'activity', icon: '✨', description: 'Nâng cấp 1 Pháp Bảo Hộ Thể lên Cấp 10 Tối Cao', rewardText: '+3 🔱 Hộ Kiếp Phù & +1,000 💎', reward: { itemId: 'talisman', itemAmount: 3 } },

  // Secret (20)
  { id: 'secret_fail_kiep', title: 'Thiên Lôi Thối Thể', category: 'secret', icon: '⚡', description: 'Độ Kiếp thất bại lần đầu tiên', hint: 'Trải qua thử thách sấm sét bất thành...', isSecret: true, rewardText: '+2 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 2 } },
  { id: 'secret_talisman_kiep', title: 'Nghịch Thiên Cải Mệnh', category: 'secret', icon: '🔱', description: 'Độ Kiếp thành công khi đang kích hoạt Hộ Kiếp Phù', hint: 'Dùng pháp bảo huyền thoại trợ lực...', isSecret: true, rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'secret_night_owl', title: 'Dạ Du Thần Quân', category: 'secret', icon: '🌙', description: 'Deploy hoặc tu luyện khung giờ đêm (23:00 - 05:00)', hint: 'Hấp thu nguyệt hoa lúc nửa đêm...', isSecret: true, rewardText: '+1 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 1 } },
  { id: 'secret_early_bird', title: 'Ninh Sương Chi Tác', category: 'secret', icon: '🌅', description: 'Deploy hoặc tu luyện sáng sớm (05:00 - 07:00)', hint: 'Đón bình minh hấp thụ thái dương khí...', isSecret: true, rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'secret_noon_master', title: 'Thái Dương Chân Hỏa', category: 'secret', icon: '☀️', description: 'Deploy hoặc tu luyện giữa trưa (12:00 - 13:00)', hint: 'Hấp thu cực dương hỏa khí lúc giữa trưa...', isSecret: true, rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'secret_first_great_pill', title: 'Cổ Thần Chi Lực', category: 'secret', icon: '🌸', description: 'Nuốt 1 viên Đại Hoàn Đan (+50 XP) lần đầu tiên', hint: 'Thưởng thức linh đan cực phẩm...', isSecret: true, rewardText: '+2 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 2 } },
  { id: 'secret_first_talisman', title: 'Phù Lục Huyền Diệu', category: 'secret', icon: '📜', description: 'Kích hoạt Hộ Kiếp Phù lần đầu tiên', hint: 'Dùng bùa hộ thể bảo vệ kinh mạch...', isSecret: true, rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'secret_sky_soarer', title: 'Xung Thiên Chi Kính', category: 'secret', icon: '🌌', description: 'Bế Thỏ bay vút lên đỉnh cao nhất trên màn hình', hint: 'Kéo Thỏ bay lên chín tầng mây...', isSecret: true, rewardText: '+2 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 2 } },
  { id: 'secret_ground_roller', title: 'Địa Khí Trầm Hùng', category: 'secret', icon: '🍂', description: 'Bế Thỏ thả sát mặt đất', hint: 'Cho Thỏ tiếp đất sát thương đại địa...', isSecret: true, rewardText: '+1 💊 Tụ Linh Đan', reward: { itemId: 'basic', itemAmount: 1 } },
  { id: 'secret_pill_spree', title: 'Cuồng Đan Chi Thánh', category: 'secret', icon: '💊', description: 'Cắn liên tiếp 5 viên đan dược thần tốc', hint: 'Thưởng thức đan dược liên tục không nghỉ...', isSecret: true, rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'secret_fail_streak', title: 'Tâm Ma Thối Luyện', category: 'secret', icon: '🔥', description: 'Độ Kiếp thất bại 2 lần liên tiếp tại cùng một cảnh giới', hint: 'Chịu đựng kiếp nạn vạn lần...', isSecret: true, rewardText: '+2 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 2 } },
  { id: 'secret_lucky_break', title: 'Cực Hạn May Mắn', category: 'secret', icon: '🎲', description: 'Độ Kiếp thành công khi tỉ lệ cơ bản cực thấp (<15%)', hint: 'Vượt qua thử thách với tỉ lệ mong manh...', isSecret: true, rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'secret_pity_god', title: 'Tích Khí Vận Hoàng Đế', category: 'secret', icon: '👑', description: 'Độ Kiếp thành công khi điểm tích lũy thất bại đạt +15% trở lên', hint: 'Dùng kiên trì tích lũy khí vận...', isSecret: true, rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'secret_treasure_master', title: 'Đại Pháp Bảo Sư', category: 'secret', icon: '🔮', description: 'Mở khóa 5 Pháp Bảo Hộ Thể', hint: 'Thu thập đủ 5 bảo vật hộ thân...', isSecret: true, rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'secret_skin_collector', title: 'Bách Biến Thân Pháp', category: 'secret', icon: '🥋', description: 'Mở khóa 5 Thân Pháp / Skin Thỏ', hint: 'Sở hữu 5 trang phục cảnh giới...', isSecret: true, rewardText: '+1 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 1 } },
  { id: 'secret_full_inventory', title: 'Tiên Gia Bảo Kho', category: 'secret', icon: '🎒', description: 'Tích trữ tổng cộng 20+ viên đan dược trong túi', hint: 'Sở hữu kho đan dược dạt dào...', isSecret: true, rewardText: '+1 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 1 } },
  { id: 'secret_multi_deploy_master', title: 'Vạn Giới Triệu Hồi', category: 'secret', icon: '🌌', description: 'Thực hiện 3 lần Multi-Deploy', hint: 'Điều khiển đồng thời nhiều đại trận 3 lần...', isSecret: true, rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'secret_marathon', title: 'Bất Tĩnh Bế Quan', category: 'secret', icon: '🧘‍♀️', description: 'Bế quan liên tục trong phiên làm việc đủ 100 phút', hint: 'Thiền định trong 1 phiên lâu dài...', isSecret: true, rewardText: '+2 🌸 Đại Hoàn Đan', reward: { itemId: 'great', itemAmount: 2 } },
  { id: 'secret_devops_guru', title: 'DevOps Đạo Tổ', category: 'secret', icon: '⚔️', description: 'Tích lũy 30 lần deploy thành công', hint: 'Trở thành huyền thoại triển khai...', isSecret: true, rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'secret_mount_supreme', title: 'Thượng Cổ Thần Phục', category: 'secret', icon: '🐉', description: 'Sở hữu Thú Cưỡi phẩm Supreme (Bạch Ngọc Kỳ Lân hoặc Cửu Thiên Lôi Long)', hint: 'Thu phục thần thú tối cao phẩm Supreme...', isSecret: true, rewardText: '+2 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'secret_mount_gacha_5', title: 'Bí Cảnh Linh Thú', category: 'secret', icon: '🔮', description: 'Quay Gacha Rương Linh Thú tích lũy đủ 5 lần', hint: 'Khám phá bí cảnh Linh Thú 5 lần...', isSecret: true, rewardText: '+200 Linh Thạch', reward: { spiritStones: 200 } },
  { id: 'secret_pet_100', title: 'Thần Thố Sủng Ái', category: 'secret', icon: '👑', description: 'Vuốt ve Thỏ Tiên 100 lần', hint: 'Bày tỏ tình cảm vuốt ve Thỏ 100 lần...', isSecret: true, rewardText: '+2 🔱 Hộ Kiếp Phù & +500 💎', reward: { itemId: 'talisman', itemAmount: 2 } },
  { id: 'secret_craft_god', title: 'Đạo Tổ Luyện Đan', category: 'secret', icon: '👑', description: 'Luyện chế đan dược 50 lần trong Lò Bát Quái', hint: 'Khái niệm Luyện Đan Tông Sư 50 lần...', isSecret: true, rewardText: '+5 🔱 Hộ Kiếp Phù & +2,000 💎', reward: { itemId: 'talisman', itemAmount: 5 } },
  { id: 'craft_fail_1', title: '💥 Nổ Lò Sơ Cấp', category: 'activity', icon: '💥', description: 'Luyện đan thất bại bị nổ lò 1 lần', rewardText: '+1 💊 Tụ Linh Đan', reward: { itemId: 'basic', itemAmount: 1 } },
  { id: 'craft_fail_5', title: '💣 Đạo Tổ Nổ Lò', category: 'activity', icon: '💣', description: 'Luyện đan thất bại bị nổ lò 5 lần', rewardText: '+2 🍃 Hồi Phục Đan', reward: { itemId: 'recover', itemAmount: 2 } },
  { id: 'secret_forge_fail', title: '🌩️ Lôi Kiếp Rèn Thần Binh', category: 'secret', icon: '⚡', description: 'Rèn Pháp Bảo thất bại do lôi điện bạo tạc 1 lần', hint: 'Thử thách độ may mắn khi rèn thần binh...', isSecret: true, rewardText: '+50 💎 Linh Thạch', reward: { spiritStones: 50 } },
  { id: 'secret_supreme_immortal', title: 'Độc Tôn Tam Giới', category: 'secret', icon: '🏆', description: 'Mở khóa hơn 50 thành tựu các loại', hint: 'Chinh phục hơn nửa chặng đường thành tựu...', isSecret: true, rewardText: '+5 🔱 Hộ Kiếp Phù', reward: { itemId: 'talisman', itemAmount: 5 } }
];

const AnimatedFurnaceSprite: React.FC<{ isCrafting?: boolean; size?: number }> = ({ isCrafting = true, size = 180 }) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!isCrafting) return;
    const interval = setInterval(() => {
      setFrameIndex(f => (f + 1) % 4);
    }, 180);
    return () => clearInterval(interval);
  }, [isCrafting]);

  const col = frameIndex % 2;
  const row = Math.floor(frameIndex / 2);

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        overflow: 'hidden',
        position: 'relative',
        filter: 'drop-shadow(0 0 30px rgba(239,68,68,0.95)) drop-shadow(0 0 15px rgba(245,158,11,0.85))'
      }}
    >
      <img
        src="/dan_lo_than_khi.png"
        alt="Đan Lô Thần Khí"
        style={{
          width: `${size * 2}px`,
          height: `${size * 2}px`,
          position: 'absolute',
          left: `-${col * size}px`,
          top: `-${row * size}px`,
          imageRendering: 'smooth',
          maxWidth: 'none'
        }}
      />
    </div>
  );
};

// ─── Animated Thunder Anvil Forge Component (4-Frame Sprite Sheet) ───────────────
const AnimatedThunderAnvil: React.FC<{ isForging?: boolean; size?: number }> = ({ isForging = true, size = 180 }) => {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!isForging) return;
    const interval = setInterval(() => {
      setFrameIndex(f => (f + 1) % 4);
    }, 180);
    return () => clearInterval(interval);
  }, [isForging]);

  const col = frameIndex % 2;
  const row = Math.floor(frameIndex / 2);

  return (
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        overflow: 'hidden',
        position: 'relative',
        filter: isForging
          ? 'drop-shadow(0 0 32px rgba(56,189,248,0.95)) drop-shadow(0 0 16px rgba(168,85,247,0.85))'
          : 'drop-shadow(0 0 18px rgba(56,189,248,0.6))'
      }}
    >
      <img
        src="/de_ren_loi_dinh.png"
        alt="Đe Rèn Lôi Đình"
        style={{
          width: `${size * 2}px`,
          height: `${size * 2}px`,
          position: 'absolute',
          left: `-${col * size}px`,
          top: `-${row * size}px`,
          imageRendering: 'smooth',
          maxWidth: 'none'
        }}
      />
    </div>
  );
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

// ─── Cultivation Levels ────────────────────────────────────────────────────────
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

export const getSuccessRate = (level: number): number => {
  const rates: Record<number, number> = { 1: 1.00, 2: 0.85, 3: 0.75, 4: 0.65, 5: 0.55, 6: 0.45, 7: 0.38, 8: 0.32, 9: 0.26, 10: 0.20, 11: 0.16, 12: 0.13, 13: 0.10, 14: 0.08, 15: 0.06, 16: 0.04, 17: 0.02 };
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

export const MASCOT_SIZE = 80;
export const BUNNY_STATE_ROW_INDEX: Record<BunnyState, number> = { idle: 0, walk_right: 1, walk_left: 2, jump_right: 3, jump_left: 4, sleep: 5, eat: 6, run_right: 7, run_left: 8, dance: 9 };

export const BunnySkinSprite: React.FC<{ level: number; action?: BunnyState; size?: number; animated?: boolean; className?: string; style?: React.CSSProperties; }> = ({ level, action = 'idle', size = 48, animated = true, className = '', style = {} }) => {
  const [frame, setFrame] = useState(0);
  useEffect(() => { if (!animated) return; const timer = setInterval(() => setFrame((f) => (f + 1) % 10), 130); return () => clearInterval(timer); }, [animated]);
  const safeLevel = level || 1;
  const safeAction = action || 'idle';
  const bgX = -frame * size;
  return <div className={`select-none pointer-events-none ${className}`} style={{ width: `${size}px`, height: `${size}px`, flexShrink: 0, flexGrow: 0, backgroundImage: `url(/skins/${safeLevel}/${safeAction}.png)`, backgroundSize: `${size * 10}px ${size}px`, backgroundPosition: `${bgX}px 0px`, backgroundRepeat: 'no-repeat', backgroundColor: 'transparent', imageRendering: 'pixelated', ...style }} />;
};

export const TreasureSprite: React.FC<{ treasureId: number; size?: number; className?: string; style?: React.CSSProperties; }> = ({ treasureId, size = 48, className = '', style = {} }) => {
  const [frame, setFrame] = useState(0);
  useEffect(() => { const timer = setInterval(() => setFrame((f) => (f + 1) % 10), 100); return () => clearInterval(timer); }, []);
  const safeTreasureId = treasureId || 1;
  const bgX = -frame * size;
  return <div className={`select-none pointer-events-none ${className}`} style={{ width: `${size}px`, height: `${size}px`, flexShrink: 0, flexGrow: 0, backgroundImage: `url(/treasures/${safeTreasureId}.png)`, backgroundSize: `${size * 10}px ${size}px`, backgroundPosition: `${bgX}px 0px`, backgroundRepeat: 'no-repeat', backgroundColor: 'transparent', imageRendering: 'pixelated', ...style }} />;
};

export const TreasureOrbit: React.FC<{ treasureId: number; treasureLevel?: number; isDeploying?: boolean; }> = ({ treasureId, treasureLevel = 1, isDeploying }) => {
  const [angle, setAngle] = useState(0);
  useEffect(() => {
    let animId: number; let lastTime = performance.now();
    const update = (now: number) => { const delta = (now - lastTime) / 1000; lastTime = now; const speed = isDeploying ? 3.5 : 1.5 + (treasureLevel - 1) * 0.1; setAngle((prev) => (prev + speed * delta) % (Math.PI * 2)); animId = requestAnimationFrame(update); };
    animId = requestAnimationFrame(update); return () => cancelAnimationFrame(animId);
  }, [isDeploying, treasureLevel]);
  const radiusX = 64; const radiusY = 22;
  const offsetX = Math.cos(angle) * radiusX; const offsetY = Math.sin(angle) * radiusY - 14;
  const isFront = Math.sin(angle) >= 0; const zIndex = isFront ? 30 : -1;
  const scale = 0.8 + (Math.sin(angle) + 1) * 0.25; const opacity = 0.8 + (Math.sin(angle) + 1) * 0.1;

  const auraGlow = treasureLevel >= 8
    ? 'drop-shadow(0 0 22px rgba(192,132,252,0.95)) drop-shadow(0 0 10px rgba(245,158,11,0.9))'
    : treasureLevel >= 4
    ? 'drop-shadow(0 0 16px rgba(56,189,248,0.85))'
    : isDeploying ? 'drop-shadow(0 0 16px rgba(245,158,11,0.9))' : 'drop-shadow(0 0 10px rgba(245,158,11,0.5))';

  return (
    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${scale})`, zIndex, opacity, transition: 'transform 0.05s linear', filter: auraGlow, pointerEvents: 'none' }}>
      <TreasureSprite treasureId={treasureId} size={50} />
      {treasureLevel >= 8 && (
        <div style={{ position: 'absolute', inset: '-6px', borderRadius: '50%', border: '1.5px dashed #c084fc', animation: 'spin 6s linear infinite', opacity: 0.85 }} />
      )}
    </div>
  );
};

const LightningCanvas: React.FC<{ bunnyX: number; bunnyY: number }> = ({ bunnyX, bunnyY }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext('2d'); if (!ctx) return;
    let animId: number; let w = (canvas.width = window.innerWidth); let h = (canvas.height = window.innerHeight);
    const onResize = () => { if (canvas) { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; } };
    window.addEventListener('resize', onResize);
    const tx = (bunnyX / 100) * w; const ty = h - bunnyY - 25;
    const makeBolt = (x1: number, y1: number, x2: number, y2: number, rough: number) => {
      const pts: { x: number; y: number }[] = [{ x: x1, y: y1 }]; const dx = x2 - x1; const dy = y2 - y1;
      const steps = Math.max(8, Math.floor(Math.hypot(dx, dy) / 25));
      for (let i = 1; i < steps; i++) { const r = i / steps; pts.push({ x: x1 + dx * r + (Math.random() - 0.5) * rough * 30, y: y1 + dy * r + (Math.random() - 0.5) * rough * 12 }); }
      pts.push({ x: x2, y: y2 }); return pts;
    };
    let flashA = 0, lastT = 0; let bolts: { pts: { x: number; y: number }[]; main: boolean }[] = [];
    const render = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      if (t - lastT > 130 + Math.random() * 120) {
        lastT = t; flashA = 0.4; bolts = [];
        const sx = tx + (Math.random() - 0.5) * w * 0.4; const main = makeBolt(sx, 0, tx, ty, 1.8); bolts.push({ pts: main, main: true });
        for (let i = 1; i < main.length - 2; i += 2) { if (Math.random() > 0.35) { bolts.push({ pts: makeBolt(main[i].x, main[i].y, main[i].x + (Math.random() - 0.5) * 280, main[i].y + Math.random() * 220 + 60, 1.4), main: false }); } }
      }
      if (flashA > 0) { ctx.fillStyle = `rgba(255,255,235,${flashA})`; ctx.fillRect(0, 0, w, h); flashA *= 0.82; }
      bolts.forEach(({ pts, main }) => {
        if (pts.length < 2) return;
        [[main ? 'rgba(245,158,11,0.6)' : 'rgba(192,132,252,0.5)', main ? 16 : 8, main ? '#f59e0b' : '#c084fc', 35], [main ? '#fde047' : '#f0abfc', main ? 6 : 3, '', 15], ['#ffffff', main ? 3 : 1.5, '', 0]].forEach(([color, lw, shadow, blur]) => {
          ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
          ctx.strokeStyle = color as string; ctx.lineWidth = lw as number; ctx.shadowColor = shadow as string; ctx.shadowBlur = blur as number; ctx.stroke();
        });
      });
      ctx.save(); ctx.beginPath(); ctx.arc(tx, ty, 42 + Math.random() * 18, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(245,158,11,0.8)'; ctx.lineWidth = 4; ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 25; ctx.stroke(); ctx.restore();
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render); return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(animId); };
  }, [bunnyX, bunnyY]);
  return <canvas ref={canvasRef} className="fixed inset-0 z-[999] pointer-events-none w-full h-full" />;
};

const BUNNY_STORAGE_KEY = 'ids_bunny_progress_v5';

// ─── Main Component ────────────────────────────────────────────────────────────
export const BunnyMascot: React.FC<BunnyMascotProps> = ({
  isDeploying = false,
  selectedService = '',
  activeDeployServices = []
}) => {
  type Inventory = Record<ItemId, number>;

  const loadSaved = () => {
    try { const s = localStorage.getItem(BUNNY_STORAGE_KEY); return s ? JSON.parse(s) : {}; } catch { return {}; }
  };

  const [xp, setXp]                                         = useState<number>(() => loadSaved().xp ?? 0);
  const [activeSkin, setActiveSkin]                         = useState<string>(() => loadSaved().activeSkin ?? 'none');
  const [activeTreasureId, setActiveTreasureId]             = useState<number>(() => loadSaved().activeTreasureId ?? 1);
  const [inventory, setInventory]                           = useState<Inventory>(() => ({ basic: loadSaved().inventory?.basic ?? 5, recover: loadSaved().inventory?.recover ?? 2, great: loadSaved().inventory?.great ?? 1, talisman: loadSaved().inventory?.talisman ?? 1, revive: loadSaved().inventory?.revive ?? 0 }));
  const [totalMinutes, setTotalMinutes]                     = useState<number>(() => loadSaved().totalMinutes ?? 0);
  const [totalDrags, setTotalDrags]                         = useState<number>(() => loadSaved().totalDrags ?? 0);
  const [totalPets, setTotalPets]                           = useState<number>(() => loadSaved().totalPets ?? 0);
  const [lastPetRewardTime, setLastPetRewardTime]           = useState<number>(() => loadSaved().lastPetRewardTime ?? 0);
  const [lastRideRewardTime, setLastRideRewardTime]         = useState<number>(() => loadSaved().lastRideRewardTime ?? 0);
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

  // ─── Gacha & Flying Mount State ─────────────────────────────────────────────
  const [spiritStones, setSpiritStones]                     = useState<number>(() => loadSaved().spiritStones ?? 500);
  const [ownedMounts, setOwnedMounts]                       = useState<string[]>(() => loadSaved().ownedMounts ?? ['wolf']);
  const [activeMountId, setActiveMountId]                   = useState<string | null>(() => loadSaved().activeMountId ?? 'wolf');
  const [gachaSpinCount, setGachaSpinCount]                 = useState<number>(() => loadSaved().gachaSpinCount ?? 0);
  const [recentGachaRewards, setRecentGachaRewards]         = useState<{ type: 'mount' | 'item'; mountId?: string; name: string; icon: string; rarity: string }[] | null>(null);

  const [treasureLevels, setTreasureLevels]                 = useState<Record<number, number>>(() => loadSaved().treasureLevels ?? {});
  const [craftCount, setCraftCount]                         = useState<number>(() => loadSaved().craftCount ?? 0);
  const [craftFailCount, setCraftFailCount]                 = useState<number>(() => loadSaved().craftFailCount ?? 0);
  const [herbsInventory, setHerbsInventory]                 = useState<Record<HerbId, number>>(() => loadSaved().herbsInventory ?? {});
  const [isCraftingAnim, setIsCraftingAnim]                 = useState(false);
  const [activeCraftingRecipe, setActiveCraftingRecipe]     = useState<CraftingRecipe | null>(null);
  const [craftingResult, setCraftingResult]                 = useState<{ success: boolean; message: string; pillName: string; pillEmoji: string } | null>(null);

  const [isForgingAnim, setIsForgingAnim]                   = useState(false);
  const [activeForgingTreasureId, setActiveForgingTreasureId] = useState<number | null>(null);
  const [forgingResult, setForgingResult]                   = useState<{ success: boolean; message: string; targetLevel: number; newBonus: number } | null>(null);

  // Modal achievements search & filter
  const [achSearchQuery, setAchSearchQuery]                 = useState('');
  const [achCategoryFilter, setAchCategoryFilter]           = useState<string>('all');

  // UI State
  const [isLevelUpAnim, setIsLevelUpAnim]                   = useState(false);
  const [showCostumePicker, setShowCostumePicker]           = useState(false);
  const [modalTab, setModalTab]                             = useState<'skins' | 'treasures' | 'mounts' | 'crafting' | 'achievements'>('skins');
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

  // Computed
  const currentLevelInfo   = LEVEL_CONFIG.slice().reverse().find(l => xp >= l.reqXp) ?? LEVEL_CONFIG[0];
  const currentLevel       = currentLevelInfo.level;
  const activeSkinInfo     = LEVEL_CONFIG.find(l => l.skinId === activeSkin) ?? currentLevelInfo;
  const activeTreasureInfo = LEVEL_CONFIG.find(l => l.treasureId === activeTreasureId) ?? currentLevelInfo;
  const activeMountConfig  = MOUNT_CONFIG.find(m => m.id === activeMountId);
  const nextLevelInfo      = LEVEL_CONFIG.find(l => l.level === currentLevel + 1);
  const isReadyToBreakthrough = Boolean(nextLevelInfo && xp >= nextLevelInfo.reqXp - 1);
  const isTribulationLevel    = currentLevel >= 2;
  const isTalismanActive      = Date.now() < talismanBuffExpiry;
  const talismanCfg           = ITEM_CONFIG.find(i => i.id === 'talisman')!;
  
  const baseSuccessRate       = getSuccessRate(currentLevel);
  const talismanBonus         = isTalismanActive ? (talismanCfg.buffSuccessBonus ?? 0) : 0;
  const pityBonus             = failCountAtCurrentLevel * 0.05;
  const mountBonus            = activeMountConfig?.breakthroughBonus ?? 0;
  const effectiveSuccessRate  = Math.min(0.95, baseSuccessRate + talismanBonus + pityBonus + mountBonus);
  const currentSuccessRatePercent = Math.round(effectiveSuccessRate * 100);

  const prevReq = currentLevelInfo.reqXp;
  const nextReq = nextLevelInfo ? nextLevelInfo.reqXp : prevReq + 20000;
  const progressPercent = Math.min(100, Math.max(0, ((xp - prevReq) / (nextReq - prevReq)) * 100));
  const totalInventory = Object.values(inventory).reduce((a, b) => a + b, 0);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(BUNNY_STORAGE_KEY, JSON.stringify({
        xp,
        activeSkin,
        activeTreasureId,
        inventory,
        totalMinutes,
        totalDrags,
        totalPets,
        lastPetRewardTime,
        lastRideRewardTime,
        totalDeploys,
        totalPillsConsumed,
        deployedServices,
        unlockedAchievements,
        talismanBuffExpiry,
        failCountAtCurrentLevel,
        breakthroughSuccessCount,
        breakthroughFailCount,
        multiDeployCount,
        spiritStones,
        ownedMounts,
        activeMountId,
        gachaSpinCount,
        treasureLevels,
        craftCount,
        herbsInventory,
        lastSessionTime: Date.now()
      }));
    } catch { /* noop */ }
  }, [xp, activeSkin, activeTreasureId, inventory, totalMinutes, totalDrags, totalPets, lastPetRewardTime, lastRideRewardTime, totalDeploys, totalPillsConsumed, deployedServices, unlockedAchievements, talismanBuffExpiry, failCountAtCurrentLevel, breakthroughSuccessCount, breakthroughFailCount, multiDeployCount, spiritStones, ownedMounts, activeMountId, gachaSpinCount, treasureLevels, craftCount, herbsInventory]);

  useEffect(() => {
    const tick = () => setTalismanCountdown(Math.max(0, Math.ceil((talismanBuffExpiry - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [talismanBuffExpiry]);

  const triggerGentleHop = () => { setState('jump_right'); setFrame(0); setTimeout(() => setState('idle'), 1200); };

  const grantItem = (itemId: ItemId, amount: number, msg?: string) => {
    const cfg = ITEM_CONFIG.find(i => i.id === itemId)!;
    setInventory(prev => ({ ...prev, [itemId]: Math.min(cfg.maxStack, (prev[itemId] ?? 0) + amount) }));
    if (msg) setBubbleText(msg);
  };

  const addSpiritStones = (amount: number) => {
    setSpiritStones(s => s + amount);
  };

  // ─── Gacha Engine (Single & 10x Spin) ──────────────────────────────────────
  const handleSpinGacha = (count: number = 1) => {
    const cost = count === 10 ? 900 : 100 * count;
    if (spiritStones < cost) {
      setBubbleText(`😢 Không đủ Linh Thạch 💎! Cần ${cost} Linh Thạch (Hiện có ${spiritStones} 💎)!`);
      return;
    }

    addSpiritStones(-cost);
    const newRewards: { type: 'mount' | 'item'; mountId?: string; name: string; icon: string; rarity: string }[] = [];
    let currentSpinCount = gachaSpinCount;
    let newOwnedMounts = [...ownedMounts];

    for (let i = 0; i < count; i++) {
      currentSpinCount++;
      const isPityTrigger = currentSpinCount % 50 === 0;
      const roll = Math.random() * 100;

      if (isPityTrigger) {
        // Guaranteed High-tier Mount Drop
        const supremeMounts = MOUNT_CONFIG.filter(m => m.rarity === 'supreme' || m.rarity === 'legendary');
        const picked = supremeMounts[Math.floor(Math.random() * supremeMounts.length)];
        if (!newOwnedMounts.includes(picked.id)) {
          newOwnedMounts.push(picked.id);
        }
        newRewards.push({ type: 'mount', mountId: picked.id, name: `${picked.name} (BẢO HIỂM 👑)`, icon: picked.emoji, rarity: picked.rarity });
      } else {
        // Standard Gacha Roll Table
        let accumulatedRate = 0;
        let wonMount: MountConfig | null = null;

        for (const mount of MOUNT_CONFIG) {
          accumulatedRate += mount.dropRate;
          if (roll <= accumulatedRate) {
            wonMount = mount;
            break;
          }
        }

        if (wonMount) {
          if (!newOwnedMounts.includes(wonMount.id)) {
            newOwnedMounts.push(wonMount.id);
          }
          newRewards.push({ type: 'mount', mountId: wonMount.id, name: wonMount.name, icon: wonMount.emoji, rarity: wonMount.rarity });
        } else {
          // Consumable Pill Drop
          const itemRoll = Math.random();
          if (itemRoll < 0.45) {
            grantItem('basic', 3);
            newRewards.push({ type: 'item', name: '3x Tụ Linh Đan', icon: '💊', rarity: 'common' });
          } else if (itemRoll < 0.75) {
            grantItem('recover', 2);
            newRewards.push({ type: 'item', name: '2x Hồi Phục Đan', icon: '🍃', rarity: 'uncommon' });
          } else if (itemRoll < 0.90) {
            grantItem('great', 1);
            newRewards.push({ type: 'item', name: '1x Đại Hoàn Đan', icon: '🌸', rarity: 'rare' });
          } else {
            grantItem('talisman', 1);
            newRewards.push({ type: 'item', name: '1x Hộ Kiếp Phù', icon: '🔱', rarity: 'legendary' });
          }
        }
      }
    }

    setGachaSpinCount(currentSpinCount);
    setOwnedMounts(newOwnedMounts);
    setRecentGachaRewards(newRewards);

    const mountWins = newRewards.filter(r => r.type === 'mount');
    if (mountWins.length > 0) {
      setBubbleText(`🎉 CHÚC MỪNG! Mở Rương nhận Thần Thú [${mountWins[0].name}]! 🐴✨`);
    } else {
      setBubbleText(`🔮 Đã mở ${count} Rương Linh Thú! Thu hoạch nhiều đan dược thần tiên! 💎`);
    }
  };

  const getIngredientQty = (id: IngredientId): number => {
    if (ITEM_CONFIG.some(i => i.id === id)) return inventory[id as ItemId] || 0;
    return herbsInventory[id as HerbId] || 0;
  };

  const getIngredientInfo = (id: IngredientId) => {
    const pill = ITEM_CONFIG.find(i => i.id === id);
    if (pill) return { name: pill.name, emoji: pill.emoji, qty: inventory[pill.id as ItemId] || 0 };
    const herb = HERB_CONFIG.find(h => h.id === id);
    if (herb) return { name: herb.name, emoji: herb.emoji, qty: herbsInventory[herb.id as HerbId] || 0 };
    return { name: id, emoji: '📦', qty: 0 };
  };

  const getMaxCraftCount = (recipe: CraftingRecipe): number => {
    let max = Math.floor(spiritStones / recipe.spiritStonesCost);
    recipe.ingredients.forEach(ing => {
      const available = getIngredientQty(ing.id);
      max = Math.min(max, Math.floor(available / ing.amount));
    });
    return Math.max(0, max);
  };

  const handleCraftPill = (recipe: CraftingRecipe, requestedCount: number = 1) => {
    const maxAfford = getMaxCraftCount(recipe);
    if (maxAfford < 1) {
      if (spiritStones < recipe.spiritStonesCost) {
        setBubbleText(`😢 Không đủ Linh Thạch! Cần ${recipe.spiritStonesCost} 💎 Linh Thạch!`);
      } else {
        setBubbleText(`😢 Thiếu nguyên liệu dược liệu/quặng để chế tạo đan dược!`);
      }
      return;
    }

    const actualCount = Math.min(requestedCount, maxAfford);
    const totalStones = recipe.spiritStonesCost * actualCount;

    addSpiritStones(-totalStones);

    recipe.ingredients.forEach(ing => {
      const totalIngAmount = ing.amount * actualCount;
      if (ITEM_CONFIG.some(i => i.id === ing.id)) {
        setInventory(prev => ({ ...prev, [ing.id as ItemId]: Math.max(0, (prev[ing.id as ItemId] || 0) - totalIngAmount) }));
      } else {
        setHerbsInventory(prev => ({ ...prev, [ing.id as HerbId]: Math.max(0, (prev[ing.id as HerbId] || 0) - totalIngAmount) }));
      }
    });

    setActiveCraftingRecipe(recipe);
    setIsCraftingAnim(true);
    setCraftingResult(null);

    setTimeout(() => {
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < actualCount; i++) {
        if (Math.random() <= recipe.successRate) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        setInventory(prev => ({
          ...prev,
          [recipe.resultItemId]: (prev[recipe.resultItemId] || 0) + (recipe.resultAmount * successCount)
        }));
        setCraftCount(c => {
          const nextCount = c + successCount;
          if (nextCount >= 1) unlockAchievement('craft_1');
          if (nextCount >= 10) unlockAchievement('craft_10');
          if (nextCount >= 50) unlockAchievement('secret_craft_god');
          return nextCount;
        });
        if (recipe.resultItemId === 'revive') unlockAchievement('craft_revive');
      }

      if (failCount > 0) {
        setCraftFailCount(f => {
          const next = f + failCount;
          if (next >= 1) unlockAchievement('craft_fail_1');
          if (next >= 5) unlockAchievement('craft_fail_5');
          return next;
        });
        unlockAchievement('secret_tro_dan');
        addXP(2 * failCount, `🌪️ Tro Đan (x${failCount}): Nổ lò nhưng ngộ ra quy luật (+${2 * failCount} XP)`);
      }

      const isOverallSuccess = successCount > 0;
      const resultMessage = actualCount > 1
        ? `🔥 LUYỆN BÁT QUÁI HÀNG LOẠT (x${actualCount})\n✅ Thành công: ${successCount * recipe.resultAmount}x ${recipe.name}\n💥 Nổ lò thất bại: ${failCount}x (Nhận ${failCount}x Tro Đan +${failCount * 2} XP)`
        : isOverallSuccess
          ? `🔥 LUYỆN ĐAN THÀNH CÔNG! Ngưng tụ tinh hoa đất trời thành ${recipe.resultAmount}x ${recipe.name}!`
          : `💥 THẤT BẠI NỔ LÒ! Dược lực không cân bằng bùng khói đen! Mất nguyên liệu & nhận 1x Tro Đan (+2 XP)!`;

      setCraftingResult({
        success: isOverallSuccess,
        message: resultMessage,
        pillName: recipe.name,
        pillEmoji: recipe.emoji
      });

      if (successCount > 0 && failCount === 0) {
        setBubbleText(`🔥 Nổi lửa Bát Quái! Luyện thành công x${actualCount} [${recipe.name}]! 🔮✨`);
      } else if (successCount > 0 && failCount > 0) {
        setBubbleText(`🔥 Luyện đan x${actualCount}: Thu hoạch ${successCount}x [${recipe.name}] & ${failCount}x Tro Đan! 🌪️`);
      } else {
        setBubbleText(`💥 NỔ LÒ BÁT QUÁI! Luyện x${actualCount} [${recipe.name}] thất bại hoàn toàn! 🌪️`);
      }
    }, 2600);
  };

  const handleUpgradeTreasure = (treasureId: number) => {
    const currentLvl = treasureLevels[treasureId] || 1;
    if (currentLvl >= 10) {
      setBubbleText(`✨ Pháp Bảo này đã đạt Cấp 10 Tối Cao!`);
      return;
    }
    const cost = currentLvl * 100;
    if (spiritStones < cost) {
      setBubbleText(`😢 Cần ${cost} 💎 Linh Thạch để rèn Pháp Bảo!`);
      return;
    }

    const nextLvl = currentLvl + 1;
    const successRate = getTreasureUpgradeSuccessRate(nextLvl);
    const targetTreasure = LEVEL_CONFIG.find(l => l.treasureId === treasureId);
    const treasureName = targetTreasure?.skinName || 'Pháp Bảo';

    // Trừ Linh Thạch và bật animation rèn Đe Lôi Đình
    addSpiritStones(-cost);
    setActiveForgingTreasureId(treasureId);
    setIsForgingAnim(true);
    setForgingResult(null);

    setTimeout(() => {
      const isSuccess = Math.random() < successRate;
      const newBonus = getTreasureExpBonusPercent(treasureId, nextLvl);

      if (isSuccess) {
        setTreasureLevels(prev => {
          const next = { ...prev, [treasureId]: nextLvl };
          if (nextLvl >= 2) unlockAchievement('forge_1');
          if (nextLvl >= 10) unlockAchievement('forge_max');
          return next;
        });

        setForgingResult({
          success: true,
          message: `⚡ LÔI QUANG ĐẠI THÀNH! [${treasureName}] đã tôi luyện đột phá Cấp ${nextLvl} (+${newBonus}% EXP)!`,
          targetLevel: nextLvl,
          newBonus
        });
        setBubbleText(`🔨 Rèn [${treasureName}] lên Cấp ${nextLvl} đại thành công! Buff: +${newBonus}% EXP! ⚡✨`);
      } else {
        unlockAchievement('secret_forge_fail');
        setForgingResult({
          success: false,
          message: `🌩️ LÔI ĐÌNH BẠO TẠC! Rèn [${treasureName}] lên Cấp ${nextLvl} thất bại! Tiêu hao ${cost} 💎 Linh Thạch nhưng cấp độ bảo toàn. Hãy thử lại!`,
          targetLevel: currentLvl,
          newBonus: getTreasureExpBonusPercent(treasureId, currentLvl)
        });
        setBubbleText(`🌩️ Lôi điện bạo tạc! Rèn [${treasureName}] lên Cấp ${nextLvl} thất bại! 😢`);
      }
    }, 2400);
  };

  // Achievement Engine
  const unlockAchievement = (achId: string) => {
    setUnlockedAchievements(prev => {
      if (prev.includes(achId)) return prev;
      const ach = ACHIEVEMENTS.find(a => a.id === achId);
      if (!ach) return prev;

      if (ach.reward.itemId && ach.reward.itemAmount) grantItem(ach.reward.itemId, ach.reward.itemAmount);
      if (ach.reward.xp) addXP(ach.reward.xp);
      addSpiritStones(ach.reward.spiritStones ?? 100);

      setRecentAchievementToast(ach);
      setState('dance'); setFrame(0);
      setTimeout(() => setRecentAchievementToast(curr => (curr?.id === ach.id ? null : curr)), 5000);
      return [...prev, achId];
    });
  };

  // Auto Stat Checks for 102 Achievements
  useEffect(() => {
    for (let i = 2; i <= 17; i++) { if (currentLevel >= i) unlockAchievement(`cult_lvl${i}`); }
    if (xp >= 500) unlockAchievement('cult_xp_500');
    if (xp >= 1500) unlockAchievement('cult_xp_1500');
    if (xp >= 5000) unlockAchievement('cult_xp_5000');
    if (xp >= 15000) unlockAchievement('cult_xp_15000');
    if (xp >= 40000) unlockAchievement('cult_xp_40000');
    if (xp >= 100000) unlockAchievement('cult_xp_100000');

    if (breakthroughSuccessCount >= 1) unlockAchievement('cult_break_1');
    if (breakthroughSuccessCount >= 5) unlockAchievement('cult_break_5');
    if (breakthroughSuccessCount >= 10) unlockAchievement('cult_break_10');
    if (breakthroughSuccessCount >= 15) unlockAchievement('cult_break_15');
    if (breakthroughFailCount >= 3) unlockAchievement('cult_fail_3');
    if (failCountAtCurrentLevel >= 1) unlockAchievement('cult_pity_trigger');

    const devMilestones = [1, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500];
    devMilestones.forEach(m => { if (totalDeploys >= m) unlockAchievement(`dev_${m}`); });

    const svcCount = deployedServices.length;
    if (svcCount >= 1) unlockAchievement('dev_svc_1');
    if (svcCount >= 2) unlockAchievement('dev_svc_2');
    if (svcCount >= 3) unlockAchievement('dev_svc_3');
    if (svcCount >= 5) unlockAchievement('dev_svc_5');
    if (svcCount >= 8) unlockAchievement('dev_svc_8');
    if (svcCount >= 10) unlockAchievement('dev_svc_10');

    const timeMilestones = [5, 15, 30, 60, 90, 120, 180, 240, 300, 450, 600, 1000, 1440];
    timeMilestones.forEach(m => { if (totalMinutes >= m) unlockAchievement(`time_${m}m`); });

    const dragMilestones = [1, 5, 10, 20, 30, 50, 75, 100, 200, 500];
    dragMilestones.forEach(m => { if (totalDrags >= m) unlockAchievement(`drag_${m}`); });

    const pillMilestones = [1, 10, 30, 100, 300];
    pillMilestones.forEach(m => { if (totalPillsConsumed >= m) unlockAchievement(`pill_${m}`); });

    if (multiDeployCount >= 3) unlockAchievement('secret_multi_deploy_master');

    const hour = new Date().getHours();
    if (hour >= 23 || hour < 5) unlockAchievement('secret_night_owl');
    if (hour >= 5 && hour < 7) unlockAchievement('secret_early_bird');
    if (hour >= 12 && hour < 13) unlockAchievement('secret_noon_master');

    if (totalInventory >= 20) unlockAchievement('secret_full_inventory');
    if (unlockedAchievements.length >= 50) unlockAchievement('secret_supreme_immortal');

    const unlockedSkins = LEVEL_CONFIG.filter(l => xp >= l.reqXp).length;
    if (unlockedSkins >= 5) { unlockAchievement('secret_skin_collector'); unlockAchievement('secret_treasure_master'); }

    if (ownedMounts.length >= 1) unlockAchievement('mount_owner_1');
    if (ownedMounts.length >= 3) unlockAchievement('mount_owner_3');
    if (ownedMounts.length >= 5) unlockAchievement('mount_owner_5');
    if (ownedMounts.length >= 10) unlockAchievement('mount_owner_10');
    if (gachaSpinCount >= 5) unlockAchievement('secret_mount_gacha_5');
    const hasSupremeMount = ownedMounts.some(id => {
      const cfg = MOUNT_CONFIG.find(m => m.id === id);
      return cfg?.rarity === 'supreme';
    });
    if (totalPets >= 1) unlockAchievement('pet_1');
    if (totalPets >= 10) unlockAchievement('pet_10');
    if (totalPets >= 50) unlockAchievement('pet_50');
    if (totalPets >= 100) unlockAchievement('secret_pet_100');
  }, [currentLevel, xp, breakthroughSuccessCount, breakthroughFailCount, failCountAtCurrentLevel, totalDeploys, deployedServices.length, totalMinutes, totalDrags, totalPets, totalPillsConsumed, multiDeployCount, totalInventory, unlockedAchievements.length, ownedMounts.length, gachaSpinCount]);

  const addXP = (amount: number, reasonText?: string) => {
    // Chỉ nhận buff EXP từ Pháp Bảo đang mặc (activeTreasureId) ở cấp độ tương ứng
    const currentTreasureLvl = treasureLevels[activeTreasureId] || 1;
    const bonusPercent = getTreasureExpBonusPercent(activeTreasureId, currentTreasureLvl);
    const boostedAmount = Number((amount * (1 + bonusPercent / 100)).toFixed(2));

    setXp(prevXp => {
      let newXp = Number((prevXp + boostedAmount).toFixed(2));
      const prevLvl = (LEVEL_CONFIG.slice().reverse().find(l => prevXp >= l.reqXp) ?? LEVEL_CONFIG[0]).level;
      const nextLvlInfo = LEVEL_CONFIG.find(l => l.level === prevLvl + 1);
      if (nextLvlInfo && newXp >= nextLvlInfo.reqXp) {
        newXp = nextLvlInfo.reqXp - 1;
        if (prevLvl === 1) setBubbleText(`✨ Linh lực dạt dào! Bổn Thỏ sẵn sàng ĐỘT PHÁ lên [${nextLvlInfo.name}]!`);
        else setBubbleText(`🌩️ Linh lực dạt dào! Sẵn sàng ĐỘ KIẾP [${nextLvlInfo.name}] (${currentSuccessRatePercent}% thành công)!`);
        return newXp;
      }
      if (reasonText) setBubbleText(reasonText);
      return newXp;
    });
  };

  const handleConsumePill = (itemId: ItemId) => {
    const cfg = ITEM_CONFIG.find(i => i.id === itemId)!;
    if (inventory[itemId] <= 0) { setBubbleText(`😢 Kho ${cfg.emoji} trống rỗng! Tích thêm đan nhé!`); return; }

    if (cfg.isBuff) {
      if (isTalismanActive) { setBubbleText(`🔱 Hộ Kiếp Phù đã đang hiệu lực! Còn ${Math.ceil(talismanCountdown / 60)} phút!`); return; }
      const expiry = Date.now() + (cfg.buffDurationMs ?? 300_000);
      setTalismanBuffExpiry(expiry); setInventory(prev => ({ ...prev, [itemId]: prev[itemId] - 1 }));
      setState('dance'); setFrame(0);
      setBubbleText(`🔱 HỘ KIẾP PHÙ KÍCH HOẠT! +25% tỉ lệ Độ Kiếp trong 5 phút!`);
      unlockAchievement('secret_first_talisman'); setShowInventory(false); return;
    }

    setInventory(prev => ({ ...prev, [itemId]: prev[itemId] - 1 }));
    setTotalPillsConsumed(prev => prev + 1); setState('eat'); setFrame(0);
    addXP(cfg.xpValue);

    const now = Date.now();
    setPillSpreeTimes(prev => {
      const recent = [...prev, now].filter(t => now - t <= 10000);
      if (recent.length >= 5) unlockAchievement('secret_pill_spree');
      return recent;
    });
    if (itemId === 'great') unlockAchievement('secret_first_great_pill');

    const msgs: Record<string, string[]> = {
      basic:   [`💊 Cắn Tụ Linh Đan! Linh lực dâng trào~ (+${cfg.xpValue} XP)`, `💊 Tinh hoa Tụ Linh thấm vào đan điền! (+${cfg.xpValue} XP)`],
      recover: [`🍃 Hồi Phục Đan tan chảy! Chân khí phục hồi~ (+${cfg.xpValue} XP)`, `🍃 Thuần thanh linh khí dâng trào! (+${cfg.xpValue} XP)`],
      great:   [`🌸 Đại Hoàn Đan! Linh lực cuồn cuộn! (+${cfg.xpValue} XP)`, `🌸 Cổ Thần Đan! Khí tức như sấm dậy! (+${cfg.xpValue} XP)`]
    };
    const pool = msgs[itemId] ?? [`${cfg.emoji} Cắn đan! (+${cfg.xpValue} XP)`];
    setBubbleText(pool[Math.floor(Math.random() * pool.length)]);
  };

  const handleBreakthroughOrKiep = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!nextLevelInfo) return; const target = nextLevelInfo;

    if (isTribulationLevel) {
      setIsLevelUpAnim(true); triggerGentleHop();
      setBubbleText(`🌩️ OÀNGGG! Cửu Trùng Thiên Kiếp Sấm Sét giáng xuống! Thỏ đang chống chịu...`);
      const success = Math.random() < effectiveSuccessRate;

      setTimeout(() => {
        setIsLevelUpAnim(false);
        if (success) {
          setBreakthroughSuccessCount(c => c + 1);
          if (isTalismanActive) unlockAchievement('secret_talisman_kiep');
          if (baseSuccessRate < 0.15) unlockAchievement('secret_lucky_break');
          if (failCountAtCurrentLevel >= 4) unlockAchievement('secret_pity_god');

          setFailCountAtCurrentLevel(0); setXp(target.reqXp + 1); setActiveSkin(target.skinId); setActiveTreasureId(target.treasureId); triggerGentleHop();
          grantItem('great', 1); addSpiritStones(200);
          if (target.level === 10) setBubbleText(`✨ PHI THĂNG TIÊN GIỚI! Thỏ đắc đạo Chân Tiên 🌟! +1 🌸 Đại Hoàn Đan & +200 💎!`);
          else setBubbleText(`✨ ĐỘ KIẾP THÀNH CÔNG! Đột phá [${target.name}]! +1 🌸 Đại Hoàn Đan & +200 💎!`);
          if (isTalismanActive) setTalismanBuffExpiry(0);
        } else {
          setBreakthroughFailCount(c => c + 1);
          setFailCountAtCurrentLevel(c => { const nextCount = c + 1; if (nextCount >= 2) unlockAchievement('secret_fail_streak'); return nextCount; });
          unlockAchievement('secret_fail_kiep');
          const gap = target.reqXp - currentLevelInfo.reqXp; const penalty = Math.round(gap * 0.10);
          setXp(prev => Math.max(currentLevelInfo.reqXp, prev - penalty)); setState('sleep');
          const newPityBonus = Math.round((failCountAtCurrentLevel + 1) * 5);
          setBubbleText(`😿 ĐỘ KIẾP THẤT BẠI! Bị tổn hại (-${penalty} XP)! Khí vận tích lũy +${newPityBonus}% tỉ lệ cho lần sau! 💊`);
        }
      }, 3200);
    } else {
      triggerGentleHop(); setXp(target.reqXp + 1); setActiveSkin(target.skinId); setActiveTreasureId(target.treasureId);
      setFailCountAtCurrentLevel(0); addSpiritStones(100);
      setBubbleText(`✨ ĐỘT PHÁ THÀNH CÔNG! Khai phá đan điền, bước vào Trúc Cơ Kỳ 🧘! +100 💎!`);
    }
  };

  // Idle Time Rewards (Herbal/Mineral Drops & Spirit Stones per minute)
  useEffect(() => {
    const id = setInterval(() => {
      setTotalMinutes(m => m + 1);
      addSpiritStones(10);

      // Roll Herbal & Mineral drops each minute (tối đa 1 loại / phút, có tỉ lệ không rơi)
      const roll = Math.random();
      let cumulative = 0;
      let pickedHerb: HerbConfig | null = null;

      for (const herb of HERB_CONFIG) {
        cumulative += herb.dropChance;
        if (roll < cumulative) {
          pickedHerb = herb;
          break;
        }
      }

      if (pickedHerb) {
        const qty = Math.random() < 0.2 ? 2 : 1;
        setHerbsInventory(prev => ({ ...prev, [pickedHerb.id]: (prev[pickedHerb.id] || 0) + qty }));
        setBubbleText(`🌿 Bế quan kỳ ngộ! Thu hoạch: ${pickedHerb.emoji} ${pickedHerb.name} x${qty}! ✨ (+10 💎)`);
      } else {
        addXP(5, '✨ 1 phút Bế Quan: Hấp thu Linh Khí thiên địa (+5 XP & +10 💎)');
      }
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  // Deploy Reaction Engine (+50 Spirit Stones per deploy)
  const wasDeployingRef = useRef(false);
  useEffect(() => {
    const deployList = (activeDeployServices && activeDeployServices.length > 0) ? activeDeployServices : (selectedService ? [selectedService] : []);
    const deployCount = Math.max(1, deployList.length);

    if (isDeploying && !wasDeployingRef.current) {
      wasDeployingRef.current = true; setDirection('left'); setState('run_left');
      if (deployCount > 1) addXP(25 * deployCount, `🚀 Vạn Kiếm Quy Tông! Thần tốc deploy ${deployCount} microservices (+${25 * deployCount} XP)`);
      else addXP(25, `🚀 Phân Thần Thuật! Thần tốc deploy ${deployList[0] || 'Service'} (+25 XP)`);
    } else if (!isDeploying && wasDeployingRef.current) {
      wasDeployingRef.current = false; setState('dance'); setTotalDeploys(d => d + deployCount);
      addSpiritStones(50 * deployCount);

      if (deployCount > 1) setMultiDeployCount(c => c + 1);
      if (deployList.length > 0) setDeployedServices(prev => Array.from(new Set([...prev, ...deployList])));
      grantItem('recover', deployCount);

      const commentary = getDeployCommentary(deployList[0] || '', deployList);
      setBubbleText(`${commentary} (+${50 * deployCount} 💎)`);
    }
  }, [isDeploying, selectedService, activeDeployServices]);

  // Movement & Autonomous State Machine
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
      const r = Math.random();
      const randomDir = Math.random() < 0.5 ? 'left' : 'right';
      setDirection(randomDir);

      if (state === 'idle') {
        if (r < 0.35) { setState(randomDir === 'left' ? 'walk_left' : 'walk_right'); setBubbleText('🐰 Tuần du sơn thủy, tìm Linh Thảo...'); tid = setTimeout(next, Math.random() * 6000 + 8000); }
        else if (r < 0.55) { setState(randomDir === 'left' ? 'run_left' : 'run_right'); setBubbleText('⚡ Thăng hoa thần tốc, tuần tra vạn giới!'); tid = setTimeout(next, Math.random() * 4000 + 4000); }
        else if (r < 0.70) { setState('sleep'); addXP(3); setBubbleText('🧘 Tọa thiền bế quan... Khô Thiền Cảnh... Zzz'); tid = setTimeout(next, Math.random() * 8000 + 10000); }
        else if (r < 0.85) { setState('eat'); setBubbleText('🐰 Nhặt được Linh Dược ven đường!'); tid = setTimeout(next, Math.random() * 4000 + 5000); }
        else { setState(randomDir === 'left' ? 'jump_left' : 'jump_right'); setBubbleText('⚔️ Ngự kiếm phi hành!'); tid = setTimeout(next, 4000); }
      } else if (state.startsWith('walk') || state.startsWith('run')) {
        if (r < 0.4) { setState('idle'); setBubbleText('🐰 Ngưng thần dưỡng khí...'); tid = setTimeout(next, Math.random() * 4000 + 4000); }
        else if (r < 0.7) { setState(randomDir === 'left' ? 'jump_left' : 'jump_right'); setBubbleText('🚀 Nhảy vút qua Thiên Hà!'); tid = setTimeout(next, 4000); }
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

  // Pointer Interaction (+5 Spirit Stones per drag + Mount Bonus XP)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); let dragged = false;
    let lastX = e.clientX;
    dragStartRef.current = { startX: e.clientX, startY: e.clientY, initPosX: posX, initPosY: posYBottom };

    const onMove = (me: PointerEvent) => {
      const dx = me.clientX - dragStartRef.current.startX;
      const dy = me.clientY - dragStartRef.current.startY;
      const stepX = me.clientX - lastX;
      lastX = me.clientX;

      if (Math.abs(stepX) > 2) {
        const newDir = stepX < 0 ? 'left' : 'right';
        if (newDir !== directionRef.current) {
          setDirection(newDir);
          setState(newDir === 'left' ? 'walk_left' : 'walk_right');
        }
      }

      if (!dragged && Math.hypot(dx, dy) > 6) {
        dragged = true; setIsDragging(true);
        const initialDir = stepX < 0 ? 'left' : directionRef.current;
        setDirection(initialDir);
        setState(initialDir === 'left' ? 'walk_left' : 'walk_right');
        const mountName = activeMountConfig ? activeMountConfig.name : 'Bổn Thỏ';
        setBubbleText(`🎈 Cưỡi ${mountName}! Đại nhân bế Thỏ phi hành...`);
      }
      if (dragged) {
        const newX = Math.max(5, Math.min(95, dragStartRef.current.initPosX + (dx / window.innerWidth) * 100));
        const newY = Math.max(10, Math.min(window.innerHeight - 80, dragStartRef.current.initPosY - dy));
        setPosX(newX); setPosYBottom(newY);

        if (newY > 220) unlockAchievement('secret_sky_soarer');
        if (newY <= 15) unlockAchievement('secret_ground_roller');
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
      if (dragged) {
        setIsDragging(false); triggerGentleHop();
        const newDrags = totalDrags + 1; setTotalDrags(newDrags);

        const now = Date.now();
        const elapsedRide = now - lastRideRewardTime;
        const RIDE_COOLDOWN_MS = 60 * 1000; // 60s CD

        if (elapsedRide >= RIDE_COOLDOWN_MS) {
          setLastRideRewardTime(now);
          addSpiritStones(5);
          const mountBonusXp = activeMountConfig ? activeMountConfig.dragXpBonus : 0;
          const totalEarnedXp = 10 + mountBonusXp;
          addXP(totalEarnedXp, `🎉 Đáp đất an toàn cùng ${activeMountConfig?.name ?? 'Thỏ'}! (+${totalEarnedXp} XP & +5 💎)`);

          if (newDrags % 5 === 0) grantItem('basic', 1, `🏅 5 lần ngự kiếm! +1 💊 Tụ Linh Đan!`);
        } else {
          const remSec = Math.ceil((RIDE_COOLDOWN_MS - elapsedRide) / 1000);
          const min = Math.floor(remSec / 60);
          const sec = remSec % 60;
          const mountName = activeMountConfig ? activeMountConfig.name : 'Thỏ';
          const cdText = min > 0 ? `${min}p${sec}s` : `${sec}s`;
          setBubbleText(`🎈 Phù... Bay cùng ${mountName} đã mệt! ⏱️ Hồi quà phi hành sau ${cdText}`);
        }
      } else {
        setState('dance');
        setTotalPets(p => p + 1);
        const now = Date.now();
        const elapsed = now - lastPetRewardTime;
        const PET_COOLDOWN_MS = 5 * 60 * 1000;

        if (elapsed >= PET_COOLDOWN_MS) {
          setLastPetRewardTime(now);
          addSpiritStones(15);
          addXP(20, `🥰 Bổn Thỏ nhận quà vuốt ve! (+20 XP & +15 💎)`);
        } else {
          const remSec = Math.ceil((PET_COOLDOWN_MS - elapsed) / 1000);
          const min = Math.floor(remSec / 60);
          const sec = remSec % 60;
          setBubbleText(`🥰 Vuốt ve sướng quá nhảy múa! ⏱️ Hồi quà vuốt ve sau ${min}p${sec}s`);
        }
      }
    };

    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
  };

  if (isDismissed) return null;

  const bgX = -(frame * MASCOT_SIZE);

  const getVerticalOffset = () => {
    if (isDragging) return 0;
    if (state.startsWith('jump')) return [0,-20,-42,-62,-75,-70,-50,-28,-10,0][frame % 10];
    if (state.startsWith('walk') || state.startsWith('run')) return [0,-2,-4,-2,0,-2,-4,-2,0,0][frame % 10];
    if (state === 'idle') return [0,-1,-3,-1][frame % 4];
    return 0;
  };
  const currentOffsetY = getVerticalOffset();

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

      {/* ── ALCHEMY CRAFTING ANIMATION MODAL ── */}
      {isCraftingAnim && activeCraftingRecipe && (
        <div
          className="mascot-modal fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={e => e.stopPropagation()}
        >
          <div
            style={{
              background: 'radial-gradient(circle at center, rgba(35,10,15,0.98), rgba(8,10,16,0.99))',
              border: '2px solid rgba(239,68,68,0.6)',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '440px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 0 80px rgba(239,68,68,0.45)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Header Title */}
            <div style={{ color: '#ef4444', fontWeight: 900, fontSize: '18px', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔥 LÒ LUYỆN ĐAN BÁT QUÁI HỎA 🔥</span>
            </div>

            <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600 }}>
              Đang luyện chế: <span style={{ color: RARITY_COLORS[activeCraftingRecipe.rarity], fontWeight: 800 }}>{activeCraftingRecipe.emoji} {activeCraftingRecipe.name}</span>
            </div>

            {/* Furnace Sprite Animation Container */}
            <div style={{ position: 'relative', margin: '10px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <AnimatedFurnaceSprite isCrafting={!craftingResult} size={160} />
              
              {!craftingResult && (
                <div style={{ position: 'absolute', inset: -12, borderRadius: '50%', border: '2px dashed rgba(239,68,68,0.5)', animation: 'spin 6s linear infinite', pointerEvents: 'none' }} />
              )}
            </div>

            {/* Progress / Status text */}
            {!craftingResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '13px', color: '#fca5a5', fontWeight: 700, animation: 'pulse 1s infinite' }}>
                  🔥 Chân Hỏa tôi luyện... Ngưng tụ đan khí...
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  Tỉ lệ thành công: <strong style={{ color: activeCraftingRecipe.successRate >= 0.7 ? '#86efac' : activeCraftingRecipe.successRate >= 0.4 ? '#fde047' : '#f87171' }}>{Math.round(activeCraftingRecipe.successRate * 100)}%</strong>
                  <span style={{ color: '#64748b', marginLeft: '6px' }}>(Hao hụt nếu bạo đan: 50% NVL)</span>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                <div
                  style={{
                    padding: '12px 18px', borderRadius: '14px', width: '100%',
                    background: craftingResult.success ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    border: `1px solid ${craftingResult.success ? '#10b981' : '#ef4444'}`,
                    color: craftingResult.success ? '#86efac' : '#fca5a5',
                    fontSize: '13px', fontWeight: 700
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 900, marginBottom: '4px' }}>
                    {craftingResult.success ? '✨ ĐAN THÀNH XUẤT LÔ ✨' : '💥 ĐAN LÔ BẠO TẠC 💥'}
                  </div>
                  <div>{craftingResult.message}</div>
                </div>

                <button
                  onClick={() => { setIsCraftingAnim(false); setCraftingResult(null); }}
                  style={{
                    background: craftingResult.success ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                    color: '#fff', padding: '10px 24px', borderRadius: '12px', fontWeight: 900, fontSize: '13px',
                    border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', width: '100%'
                  }}
                >
                  XÁC NHẬN
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── THUNDER ANVIL FORGING ANIMATION MODAL ── */}
      {isForgingAnim && activeForgingTreasureId && (
        <div
          className="mascot-modal fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md"
          onClick={e => e.stopPropagation()}
        >
          <div
            style={{
              background: 'radial-gradient(circle at center, rgba(15,25,50,0.98), rgba(4,7,16,0.99))',
              border: '2px solid rgba(56,189,248,0.6)',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '450px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 0 80px rgba(56,189,248,0.4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Header Title */}
            <div style={{ color: '#38bdf8', fontWeight: 900, fontSize: '17px', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>⚡ ĐE RÈN THẦN KHÍ LÔI ĐÌNH ⚡</span>
            </div>

            {(() => {
              const targetTreasure = LEVEL_CONFIG.find(l => l.treasureId === activeForgingTreasureId);
              const currentLvl = treasureLevels[activeForgingTreasureId] || 1;
              const targetLvl = currentLvl + 1;
              const successRate = getTreasureUpgradeSuccessRate(targetLvl);
              const nextBonus = getTreasureExpBonusPercent(activeForgingTreasureId, targetLvl);

              return (
                <>
                  <div style={{ fontSize: '13px', color: '#cbd5e1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TreasureSprite treasureId={activeForgingTreasureId} size={28} />
                    <span>Rèn: <strong style={{ color: '#38bdf8' }}>{targetTreasure?.skinName}</strong> (Cấp {currentLvl} ➔ <span style={{ color: '#86efac' }}>Cấp {targetLvl}</span>)</span>
                  </div>

                  {/* Thunder Anvil Sprite Container */}
                  <div style={{ position: 'relative', margin: '10px 0', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <AnimatedThunderAnvil isForging={!forgingResult} size={180} />
                    {!forgingResult && (
                      <div style={{ position: 'absolute', inset: -14, borderRadius: '50%', border: '2px dashed rgba(56,189,248,0.5)', animation: 'spin 5s linear infinite', pointerEvents: 'none' }} />
                    )}
                  </div>

                  {/* Progress / Status text */}
                  {!forgingResult ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '13px', color: '#7dd3fc', fontWeight: 700, animation: 'pulse 1s infinite' }}>
                        ⚡ Dẫn Cửu Thiên Lôi Điện... Tôi luyện thần binh...
                      </div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', background: 'rgba(0,0,0,0.35)', padding: '4px 12px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.2)' }}>
                        Tỉ lệ thành công: <strong style={{ color: successRate >= 0.7 ? '#86efac' : successRate >= 0.4 ? '#fde047' : '#f87171' }}>{Math.round(successRate * 100)}%</strong>
                        <span style={{ color: '#64748b', marginLeft: '6px' }}>(Thất bại: {Math.round((1 - successRate) * 100)}%)</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                      <div
                        style={{
                          padding: '12px 18px', borderRadius: '14px', width: '100%',
                          background: forgingResult.success ? 'rgba(56,189,248,0.15)' : 'rgba(239,68,68,0.15)',
                          border: `1px solid ${forgingResult.success ? '#38bdf8' : '#ef4444'}`,
                          color: forgingResult.success ? '#7dd3fc' : '#fca5a5',
                          fontSize: '13px', fontWeight: 700
                        }}
                      >
                        <div style={{ fontSize: '16px', fontWeight: 900, marginBottom: '4px' }}>
                          {forgingResult.success ? '✨ KHAI QUANG ĐẠI THÀNH ✨' : '⚡ LÔI ĐIỆN BẠO TẠC ⚡'}
                        </div>
                        <div>{forgingResult.message}</div>
                        {forgingResult.success && (
                          <div style={{ fontSize: '12px', color: '#86efac', marginTop: '4px', fontWeight: 800 }}>
                            ⭐ Buff hiệu quả: Tăng {nextBonus}% EXP nhận được khi đeo!
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => { setIsForgingAnim(false); setForgingResult(null); }}
                        style={{
                          background: forgingResult.success ? 'linear-gradient(135deg,#0284c7,#0369a1)' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                          color: '#fff', padding: '10px 24px', borderRadius: '12px', fontWeight: 900, fontSize: '13px',
                          border: 'none', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', width: '100%'
                        }}
                      >
                        XÁC NHẬN
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Bunny + Bubble ── */}
      <div
        className={`mascot-root fixed z-[95] flex flex-col items-center select-none ${isDragging ? 'cursor-grabbing transition-none' : 'cursor-grab transition-all duration-300 ease-linear'}`}
        style={{ left: `${posX}%`, bottom: `${posYBottom}px`, transform: 'translateX(-50%)' }}
        onPointerDown={handlePointerDown}
      >
        {/* Speech Bubble */}
        <div
          className="mascot-bubble"
          style={{
            position: 'relative', marginBottom: '8px', padding: '6px 12px',
            borderRadius: '14px', background: 'rgba(10,13,22,0.96)',
            border: '1px solid rgba(245,158,11,0.45)', backdropFilter: 'blur(12px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.7)', fontSize: '11px',
            display: 'flex', alignItems: 'center', gap: '6px',
            maxWidth: 'min(480px, calc(100vw - 24px))', width: 'max-content'
          }}
        >
          {/* Cảnh Giới Badge */}
          <button
            onClick={e => { e.stopPropagation(); setShowCostumePicker(p => !p); }}
            onPointerDown={e => e.stopPropagation()}
            title="Xem Cảnh Giới Tu Tiên, Thân Pháp, Pháp Bảo & Thú Cưỡi Gacha"
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

          {/* Vòng Tròn % XP */}
          <div
            onClick={e => { e.stopPropagation(); setShowCostumePicker(p => !p); }}
            onPointerDown={e => e.stopPropagation()}
            title={`Linh Lực Tu Vi: ${Math.floor(Math.max(0, xp - prevReq))} / ${nextReq - prevReq} XP (${Math.round(progressPercent)}%)`}
            style={{
              position: 'relative', width: '24px', height: '24px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, cursor: 'pointer', borderRadius: '50%',
              background: 'rgba(10, 13, 22, 0.85)',
              border: `1px solid ${progressPercent >= 100 ? 'rgba(52,211,153,0.6)' : 'rgba(245,158,11,0.35)'}`,
              boxShadow: progressPercent >= 100 ? '0 0 10px rgba(52,211,153,0.5)' : '0 0 6px rgba(245,158,11,0.2)'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: 'rotate(-90deg)', position: 'absolute', inset: 0 }}>
              <circle cx="12" cy="12" r="9" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2.5" />
              <circle
                cx="12" cy="12" r="9" fill="none"
                stroke={progressPercent >= 100 ? '#34d399' : '#f59e0b'}
                strokeWidth="2.5"
                strokeDasharray={56.548}
                strokeDashoffset={56.548 * (1 - Math.min(100, Math.max(0, progressPercent)) / 100)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease' }}
              />
            </svg>
            <span style={{
              position: 'relative', zIndex: 1,
              fontSize: Math.round(progressPercent) === 100 ? '6.5px' : '7.5px',
              fontWeight: 900,
              color: progressPercent >= 100 ? '#6ee7b7' : '#fde68a',
              lineHeight: 1
            }}>
              {Math.round(progressPercent)}%
            </span>
          </div>

          {/* Bubble Text */}
          <span
            title={bubbleText}
            style={{
              color: '#fde68a', fontWeight: 500,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.35,
              maxHeight: '80px', overflowY: 'auto', flex: '1 1 auto', minWidth: '60px',
              paddingRight: '2px'
            }}
          >
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
                {failCountAtCurrentLevel > 0 && <span style={{ fontSize: '8.5px', color: '#7f1d1d', fontWeight: 900 }}>+{failCountAtCurrentLevel * 5}% Tích Tụ</span>}
                {isTalismanActive && <span style={{ fontSize: '8.5px', color: '#854d0e', fontWeight: 800 }}>🔱 +25% Phù</span>}
              </div>
            </button>
          ) : null}

          {/* Bag Button */}
          <button
            onClick={e => { e.stopPropagation(); setShowInventory(p => !p); }}
            onPointerDown={e => e.stopPropagation()}
            title="Mở Túi Trữ Vật (Dùng Đan Dược & Quản lý Dược Liệu)"
            style={{
              background: totalInventory > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(100,116,139,0.2)',
              border: `1px solid ${totalInventory > 0 ? 'rgba(245,158,11,0.5)' : 'rgba(100,116,139,0.3)'}`,
              borderRadius: '8px', padding: '2px 6px',
              fontSize: '10px', fontWeight: 800,
              color: totalInventory > 0 ? '#fde68a' : '#94a3b8',
              cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px'
            }}
          >
            <Package style={{ width: '12px', height: '12px' }} />
            {totalInventory > 0 && <span>{totalInventory}</span>}
          </button>

          {/* Dismiss button */}
          <button onClick={e => { e.stopPropagation(); setIsDismissed(true); }} onPointerDown={e => e.stopPropagation()} title="Ẩn Thỏ" style={{ color: '#64748b', cursor: 'pointer', padding: '2px', borderRadius: '50%', background: 'none', border: 'none', flexShrink: 0 }}>
            <X style={{ width: '12px', height: '12px' }} />
          </button>
          <div style={{ position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '8px', height: '8px', background: 'rgba(10,13,22,0.96)', borderRight: '1px solid rgba(245,158,11,0.45)', borderBottom: '1px solid rgba(245,158,11,0.45)' }} />
        </div>

        {/* ── Inventory Panel ── */}
        {showInventory && (
          <div
            className="mascot-inventory"
            style={{
              position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
              marginBottom: '12px', background: 'rgba(10,13,22,0.98)',
              border: '1.5px solid rgba(245,158,11,0.5)', borderRadius: '18px',
              padding: '16px 18px', width: 'min(640px, calc(100vw - 24px))', zIndex: 200,
              boxShadow: '0 12px 48px rgba(0,0,0,0.9), 0 0 20px rgba(245,158,11,0.2)', backdropFilter: 'blur(20px)'
            }}
            onPointerDown={e => e.stopPropagation()}
          >
            <div style={{ color: '#fbbf24', fontWeight: 900, fontSize: '13px', marginBottom: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(245,158,11,0.25)', paddingBottom: '8px' }}>
              <span>🎒 TÚI TRỮ VẬT TIÊN GIA</span>
              <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 800, background: 'rgba(56,189,248,0.12)', padding: '3px 10px', borderRadius: '8px', border: '1px solid rgba(56,189,248,0.3)' }}>💎 {spiritStones} Linh Thạch</span>
            </div>

            <div style={{ color: '#fde68a', fontWeight: 800, fontSize: '11px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              💊 Linh Đan Đã Tích Nạp
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '2px' }}>
              {ITEM_CONFIG.map(item => {
                const qty = inventory[item.id] || 0;
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
                      background: isActive ? 'rgba(253,224,71,0.15)' : disabled ? 'rgba(30,35,50,0.5)' : 'rgba(245,158,11,0.1)',
                      border: `1px solid ${isActive ? '#fde047aa' : disabled ? 'rgba(100,116,139,0.2)' : RARITY_COLORS[item.rarity] + '66'}`,
                      borderRadius: '10px', padding: '6px 10px',
                      cursor: disabled ? 'not-allowed' : 'pointer', width: '100%',
                      opacity: (disabled && !isActive) ? 0.5 : 1, transition: 'all 0.15s',
                      boxShadow: isActive ? '0 0 14px rgba(253,224,71,0.45)' : 'none'
                    }}
                  >
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{ color: RARITY_COLORS[item.rarity], fontWeight: 800, fontSize: '11.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name}
                        {isActive && <span style={{ color: '#fde047', fontSize: '9px', marginLeft: '4px', background: 'rgba(253,224,71,0.2)', padding: '1px 4px', borderRadius: '4px' }}>● DÙNG</span>}
                      </div>
                      <div style={{ color: '#94a3b8', fontSize: '10px', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.isBuff ? (isActive ? `⏱️ Còn ${Math.ceil(talismanCountdown / 60)}p${talismanCountdown % 60}s` : `+${(item.buffSuccessBonus || 0.25) * 100}% Độ Kiếp`) : `+${item.xpValue} Linh Lực`}
                      </div>
                    </div>
                    <div style={{ background: qty > 0 ? RARITY_COLORS[item.rarity] + '33' : 'rgba(100,116,139,0.2)', color: qty > 0 ? RARITY_COLORS[item.rarity] : '#94a3b8', border: `1px solid ${qty > 0 ? RARITY_COLORS[item.rarity] + '66' : 'transparent'}`, borderRadius: '8px', padding: '2px 8px', fontSize: '11.5px', fontWeight: 800, flexShrink: 0 }}>
                      {qty}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dược Liệu & Quặng Tiên Gia section */}
            <div style={{ marginTop: '12px', borderTop: '1px solid rgba(245,158,11,0.2)', paddingTop: '10px' }}>
              <div style={{ color: '#6ee7b7', fontWeight: 800, fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                🌿 Kho Dược Liệu & Quặng (Dùng Luyện Đan)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', maxHeight: '200px', overflowY: 'auto', paddingRight: '2px' }}>
                {HERB_CONFIG.map(herb => {
                  const count = herbsInventory[herb.id] || 0;
                  return (
                    <div
                      key={herb.id}
                      title={herb.description}
                      style={{
                        background: count > 0 ? 'rgba(16,185,129,0.12)' : 'rgba(0,0,0,0.25)',
                        border: `1px solid ${count > 0 ? '#10b98166' : 'rgba(255,255,255,0.06)'}`,
                        borderRadius: '8px', padding: '5px 7px',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        opacity: count > 0 ? 1 : 0.45,
                        minWidth: 0
                      }}
                    >
                      <span style={{ fontSize: '10px', fontWeight: 600, color: RARITY_COLORS[herb.rarity], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                        {herb.emoji} {herb.name}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 900, color: count > 0 ? '#86efac' : '#64748b', marginLeft: '4px', background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: '4px', flexShrink: 0 }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: '12px', borderTop: '1px solid rgba(245,158,11,0.15)', paddingTop: '8px' }}>
              <div style={{ color: '#94a3b8', fontSize: '10px', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div>💎 <strong style={{ color: '#38bdf8' }}>Linh Thạch:</strong> Quay rương Gacha Thần Thú & Rèn Pháp Bảo</div>
                <div>🌿 <strong style={{ color: '#6ee7b7' }}>Dược Liệu & Quặng:</strong> Rớt tối đa 1 loại / 1 phút bế quan (có tỉ lệ trượt)</div>
                <div>🧪 <strong style={{ color: '#f59e0b' }}>Lò Bát Quái:</strong> Dùng Dược Liệu chế đan dược & Hộ Kiếp Phù</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Bunny Sprite + Orbiting Cultivation Treasure + Flying Mount ── */}
        <div
          className="mascot-sprite-box relative transition-transform duration-200 hover:scale-110 active:scale-95 flex items-center justify-center"
          style={{ transform: `translateY(${currentOffsetY}px)`, width: `${MASCOT_SIZE}px`, height: `${MASCOT_SIZE}px`, backgroundColor: 'transparent' }}
          title="NHẤP CHUỘT để Vuốt Ve Thỏ 🐰 (+10 XP & +5 💎) | KÉO THẢ để bay cùng Thú Cưỡi 🐴"
        >
          {activeTreasureId && <TreasureOrbit treasureId={activeTreasureId} treasureLevel={treasureLevels[activeTreasureId] || 1} isDeploying={isDeploying} />}

          {/* Render Active Flying Mount Underneath Mascot ONLY when Dragging */}
          {activeMountId && isDragging && (
            <div style={{ position: 'absolute', top: '32px', left: '50%', transform: 'translateX(-50%)', zIndex: -2, pointerEvents: 'none' }}>
              <AnimatedMountSprite mountId={activeMountId} size={92} direction={direction} />
            </div>
          )}

          {/* Active Skin Decorative Emblem */}
          {activeSkinInfo.skinId === 'god' && (
            <div className="absolute -top-2 -right-3 text-base z-10 animate-ping pointer-events-none">☯️</div>
          )}

          <div
            className={`bg-no-repeat ${(activeMountId && isDragging) ? '' : (activeSkinInfo.skinId === 'dai_la' || activeSkinInfo.skinId === 'chan_tien' || activeSkinInfo.skinId === 'huyen_tien' ? 'mascot-body-aura-cyan' : activeSkinInfo.skinId === 'hon_nguyen' ? 'mascot-body-aura-purple' : activeSkinInfo.skinId === 'god' ? 'mascot-body-aura-god' : activeSkinInfo.skinId !== 'none' ? 'mascot-body-aura-golden' : '')}`}
            style={{
              width: `${MASCOT_SIZE}px`, height: `${MASCOT_SIZE}px`, flexShrink: 0,
              backgroundImage: `url(/skins/${activeSkinInfo?.level || 1}/${state || 'idle'}.png)`,
              backgroundSize: `${MASCOT_SIZE * 10}px ${MASCOT_SIZE}px`,
              backgroundPosition: `${bgX}px 0px`,
              backgroundRepeat: 'no-repeat', backgroundColor: 'transparent', imageRendering: 'pixelated'
            }}
          />
          {state === 'sleep' && <div className="absolute -top-2 left-0 animate-bounce"><Moon style={{ width: '16px', height: '16px', color: '#f59e0b' }} /></div>}
        </div>
      </div>

      {/* ── Gacha Reward Toast Modal ── */}
      {recentGachaRewards && (
        <div className="fixed inset-0 z-[1002] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)' }} onClick={() => setRecentGachaRewards(null)}>
          <div style={{ background: '#0d1322', border: '2px solid #f59e0b', borderRadius: '20px', padding: '24px', maxWidth: '520px', width: '100%', textAlign: 'center', boxShadow: '0 0 50px rgba(245,158,11,0.5)', color: '#fff' }} onClick={e => e.stopPropagation()}>
            <div style={{ color: '#fbbf24', fontSize: '18px', fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Sparkles style={{ width: '22px', height: '22px', color: '#fde047' }} />
              KẾT QUẢ MỞ RƯƠNG LINH THÚ!
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: recentGachaRewards.length > 1 ? 'repeat(5, 1fr)' : '1fr', gap: '10px', marginBottom: '16px' }}>
              {recentGachaRewards.map((r, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${RARITY_COLORS[r.rarity] || '#f59e0b'}`, borderRadius: '12px', padding: '10px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  {r.type === 'mount' && r.mountId ? (
                    <div style={{ height: recentGachaRewards.length > 1 ? '40px' : '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <AnimatedMountSprite mountId={r.mountId} size={recentGachaRewards.length > 1 ? 44 : 64} />
                    </div>
                  ) : (
                    <span style={{ fontSize: recentGachaRewards.length > 1 ? '28px' : '48px', lineHeight: 1 }}>{r.icon}</span>
                  )}
                  <span style={{ fontSize: '10px', fontWeight: 800, color: RARITY_COLORS[r.rarity], textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90px' }}>{r.name}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setRecentGachaRewards(null)} style={{ background: 'linear-gradient(135deg,#f59e0b,#eab308)', border: 'none', borderRadius: '10px', padding: '10px 24px', color: '#000', fontWeight: 900, fontSize: '13px', cursor: 'pointer' }}>
              THU NHẬN TẤT CẢ ✨
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Achievement Toast ── */}
      {recentAchievementToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[1001] pointer-events-auto flex items-center gap-3 animate-bounce" style={{ background: 'linear-gradient(135deg, rgba(20,25,40,0.97), rgba(10,13,22,0.98))', border: '2px solid #f59e0b', borderRadius: '16px', padding: '12px 20px', boxShadow: '0 0 35px rgba(245,158,11,0.6)', backdropFilter: 'blur(16px)', cursor: 'pointer' }} onClick={() => setRecentAchievementToast(null)}>
          <div style={{ fontSize: '28px', flexShrink: 0 }}>🏆</div>
          <div>
            <div style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles style={{ width: '13px', height: '13px', color: '#fde047' }} /> MỞ KHÓA THÀNH TỰU MỚI!
            </div>
            <div style={{ color: '#ffffff', fontSize: '13px', fontWeight: 700, marginTop: '2px' }}>{recentAchievementToast.icon} {recentAchievementToast.title}</div>
            <div style={{ color: '#86efac', fontSize: '11px', fontWeight: 600, marginTop: '2px' }}>🎁 Thưởng: {recentAchievementToast.rewardText}</div>
          </div>
          <button onClick={e => { e.stopPropagation(); setRecentAchievementToast(null); }} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', marginLeft: '8px' }}>
            <X style={{ width: '14px', height: '14px' }} />
          </button>
        </div>
      )}

      {/* ── Costume, Treasure, Mount & Achievement Modal (4-Column Layout) ── */}
      {showCostumePicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden" style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)' }} onPointerDown={e => e.stopPropagation()}>
          <div style={{ background: '#0b0f19', border: '1px solid rgba(245,158,11,0.45)', borderRadius: '22px', width: '96%', maxWidth: '1180px', padding: '24px', boxShadow: '0 20px 60px rgba(245,158,11,0.25)', color: '#fff', position: 'relative', overflowX: 'hidden' }}>
            
            {/* Header Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(245,158,11,0.18)', paddingBottom: '14px', marginBottom: '16px', justifyContent: 'space-between', overflowX: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => setModalTab('skins')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: modalTab === 'skins' ? 'rgba(245,158,11,0.22)' : 'transparent', border: `1px solid ${modalTab === 'skins' ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 800, color: modalTab === 'skins' ? '#fde68a' : '#94a3b8', cursor: 'pointer' }}>
                  <Crown style={{ width: '14px', height: '14px', color: modalTab === 'skins' ? '#f59e0b' : '#64748b' }} />
                  🥋 Thân Pháp ({LEVEL_CONFIG.filter(l => xp >= l.reqXp).length}/{LEVEL_CONFIG.length})
                </button>

                <button onClick={() => setModalTab('treasures')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: modalTab === 'treasures' ? 'rgba(245,158,11,0.22)' : 'transparent', border: `1px solid ${modalTab === 'treasures' ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 800, color: modalTab === 'treasures' ? '#bae6fd' : '#94a3b8', cursor: 'pointer' }}>
                  <Zap style={{ width: '14px', height: '14px', color: modalTab === 'treasures' ? '#38bdf8' : '#64748b' }} />
                  🔮 Pháp Bảo ({LEVEL_CONFIG.filter(l => xp >= l.reqXp).length}/{LEVEL_CONFIG.length})
                </button>

                <button onClick={() => setModalTab('mounts')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: modalTab === 'mounts' ? 'rgba(245,158,11,0.22)' : 'transparent', border: `1px solid ${modalTab === 'mounts' ? '#a855f7' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 800, color: modalTab === 'mounts' ? '#d8b4fe' : '#94a3b8', cursor: 'pointer' }}>
                  <Compass style={{ width: '14px', height: '14px', color: modalTab === 'mounts' ? '#a855f7' : '#64748b' }} />
                  🐴 Thú Cưỡi Gacha ({ownedMounts.length}/10)
                </button>

                <button onClick={() => setModalTab('crafting')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: modalTab === 'crafting' ? 'rgba(245,158,11,0.22)' : 'transparent', border: `1px solid ${modalTab === 'crafting' ? '#10b981' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 800, color: modalTab === 'crafting' ? '#6ee7b7' : '#94a3b8', cursor: 'pointer' }}>
                  <Sparkles style={{ width: '14px', height: '14px', color: modalTab === 'crafting' ? '#10b981' : '#64748b' }} />
                  🧪 Lò Luyện Đan
                </button>

                <button onClick={() => setModalTab('achievements')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: modalTab === 'achievements' ? 'rgba(245,158,11,0.22)' : 'transparent', border: `1px solid ${modalTab === 'achievements' ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 800, color: modalTab === 'achievements' ? '#fde68a' : '#94a3b8', cursor: 'pointer' }}>
                  <Trophy style={{ width: '14px', height: '14px', color: modalTab === 'achievements' ? '#fbbf24' : '#64748b' }} />
                  🏆 Thành Tựu ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(56,189,248,0.15)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 800, color: '#38bdf8' }}>
                  💎 {spiritStones} Linh Thạch
                </div>
                <button onClick={() => setShowCostumePicker(false)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                  <X style={{ width: '18px', height: '18px' }} />
                </button>
              </div>
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
                      <span>🔮 Pháp Bảo: <strong style={{ color: '#38bdf8' }}>{activeTreasureInfo.skinName}</strong> <span style={{ color: '#86efac', fontSize: '10.5px' }}>(Cấp {treasureLevels[activeTreasureId] || 1}: +{getTreasureExpBonusPercent(activeTreasureId, treasureLevels[activeTreasureId] || 1)}% EXP)</span></span>
                      <span>🐴 Thú Cưỡi: <strong style={{ color: '#c084fc' }}>{activeMountConfig ? `${activeMountConfig.emoji} ${activeMountConfig.name}` : 'Không'}</strong></span>
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
            </div>

            {/* TAB 1: Skins Grid */}
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
                        onClick={() => { if (unlocked) { setActiveSkin(lvl.skinId); setShowCostumePicker(false); setBubbleText(`✨ Đã thay Thân Pháp [${lvl.name}]! 🐰`); } }}
                        style={{
                          padding: '10px 12px', borderRadius: '12px', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: equipped ? 'rgba(245,158,11,0.18)' : unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.35)',
                          border: `1px solid ${equipped ? '#f59e0b' : unlocked ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.04)'}`,
                          color: equipped ? '#fde68a' : unlocked ? '#e2e8f0' : '#4b5563', cursor: unlocked ? 'pointer' : 'not-allowed', opacity: unlocked ? 1 : 0.5
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          <BunnySkinSprite level={lvl.level} size={42} />
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 800, fontSize: '12px', color: equipped ? '#fbbf24' : unlocked ? '#f1f5f9' : '#64748b' }}>Lv.{lvl.level}: {lvl.name}</div>
                            <div style={{ fontSize: '10.5px', color: unlocked ? '#fde68a' : '#475569' }}>{unlocked ? `Thân Pháp Lv.${lvl.level}` : `Khóa (${lvl.reqXp} XP)`}</div>
                          </div>
                        </div>
                        {equipped ? <span style={{ background: '#f59e0b', color: '#000', padding: '3px 8px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 900 }}>Mặc</span> : unlocked ? <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fde68a', padding: '3px 8px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 800 }}>Mặc</span> : <Lock style={{ width: '13px', height: '13px', color: '#475569' }} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* TAB 2: Treasures Grid */}
            {modalTab === 'treasures' && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(56,189,248,0.85)', marginBottom: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>DANH SÁCH 17 PHÁP BẢO HỘ THỂ (MỖI CẤP TĂNG BUFF EXP)</span>
                  <span style={{ color: '#38bdf8' }}>💎 {spiritStones} Linh Thạch</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px', maxHeight: '460px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
                  {LEVEL_CONFIG.map(lvl => {
                    const unlocked = xp >= lvl.reqXp;
                    const equipped = activeTreasureId === lvl.treasureId;
                    const tLvl = treasureLevels[lvl.treasureId] || 1;
                    const upgradeCost = tLvl * 100;
                    const canAfford = spiritStones >= upgradeCost && tLvl < 10;
                    const currentBonus = getTreasureExpBonusPercent(lvl.treasureId, tLvl);
                    const nextBonus = getTreasureExpBonusPercent(lvl.treasureId, tLvl + 1);

                    return (
                      <div
                        key={lvl.treasureId}
                        style={{
                          padding: '10px 12px', borderRadius: '12px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px',
                          background: equipped ? 'rgba(56,189,248,0.18)' : unlocked ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.35)',
                          border: `1px solid ${equipped ? '#38bdf8' : unlocked ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.04)'}`,
                          opacity: unlocked ? 1 : 0.5
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                            <TreasureSprite treasureId={lvl.treasureId} size={42} />
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ fontWeight: 800, fontSize: '12px', color: equipped ? '#38bdf8' : unlocked ? '#f1f5f9' : '#64748b' }}>{lvl.skinName}</div>
                              <div style={{ fontSize: '10.5px', color: unlocked ? '#38bdf8' : '#475569', fontWeight: 700 }}>
                                ⚡ Cấp {tLvl}/10 <span style={{ color: '#86efac' }}>(+{currentBonus}% EXP)</span>
                              </div>
                            </div>
                          </div>
                          {unlocked && (
                            <button
                              onClick={() => { setActiveTreasureId(lvl.treasureId); setBubbleText(`✨ Đã ngự [${lvl.skinName}]! Nhận buff +${currentBonus}% EXP 🔮`); }}
                              style={{ background: equipped ? '#38bdf8' : 'rgba(56,189,248,0.15)', color: equipped ? '#000' : '#38bdf8', padding: '3px 8px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 900, border: 'none', cursor: 'pointer' }}
                            >
                              {equipped ? 'Đang Ngự' : 'Ngự'}
                            </button>
                          )}
                        </div>

                        {unlocked && tLvl < 10 && (() => {
                          const nextRate = getTreasureUpgradeSuccessRate(tLvl + 1);
                          const ratePercent = Math.round(nextRate * 100);
                          const rateColor = ratePercent >= 70 ? '#86efac' : ratePercent >= 45 ? '#fde047' : '#f87171';

                          return (
                            <button
                              onClick={() => handleUpgradeTreasure(lvl.treasureId)}
                              disabled={!canAfford}
                              style={{
                                width: '100%', padding: '6px 8px', borderRadius: '8px', fontWeight: 800, fontSize: '10.5px',
                                background: canAfford ? 'linear-gradient(135deg,#0284c7,#0369a1)' : 'rgba(100,116,139,0.2)',
                                border: `1px solid ${canAfford ? '#38bdf8' : 'transparent'}`,
                                color: canAfford ? '#fff' : '#64748b', cursor: canAfford ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                              }}
                            >
                              <span>🔨 Rèn Cấp {tLvl + 1} (+{nextBonus}% EXP)</span>
                              <span style={{ color: canAfford ? rateColor : '#64748b', fontSize: '9.5px', background: 'rgba(0,0,0,0.35)', padding: '2px 6px', borderRadius: '4px' }}>
                                {ratePercent}% TC • {upgradeCost} 💎
                              </span>
                            </button>
                          );
                        })()}
                        {unlocked && tLvl >= 10 && (
                          <div style={{ fontSize: '10px', color: '#c084fc', fontWeight: 800, textAlign: 'center', background: 'rgba(192,132,252,0.12)', padding: '4px', borderRadius: '6px' }}>
                            ✨ PHÁP BẢO TỐI CAO (CẤP 10: +{currentBonus}% EXP) — HÀO QUANG 3D
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* TAB 4: Lò Luyện Đan Bát Quái */}
            {modalTab === 'crafting' && (
              <>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', marginBottom: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>🧪 LÒ LUYỆN ĐAN BÁT QUÁI TIÊN GIA</span>
                  <span style={{ color: '#38bdf8', fontSize: '12px' }}>💎 Linh Thạch: {spiritStones}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', maxHeight: '460px', overflowY: 'auto', paddingRight: '4px' }}>
                  {CRAFTING_RECIPES.map(recipe => {
                    const canAffordStones = spiritStones >= recipe.spiritStonesCost;
                    const canAffordItems = recipe.ingredients.every(ing => getIngredientQty(ing.id) >= ing.amount);
                    const canCraft = canAffordStones && canAffordItems;

                    return (
                      <div
                        key={recipe.id}
                        style={{
                          padding: '12px', borderRadius: '14px', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px',
                          background: 'rgba(255,255,255,0.04)',
                          border: `1px solid ${RARITY_COLORS[recipe.rarity]}55`,
                          boxShadow: `0 0 15px ${RARITY_COLORS[recipe.rarity]}20`
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '24px' }}>{recipe.emoji}</span>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '13px', color: RARITY_COLORS[recipe.rarity] }}>{recipe.name}</div>
                              <div style={{ fontSize: '10px', color: '#94a3b8' }}>Chế tạo {recipe.resultAmount}x {ITEM_CONFIG.find(i => i.id === recipe.resultItemId)?.name}</div>
                            </div>
                          </div>

                          <div style={{ fontSize: '10.5px', color: '#cbd5e1', marginBottom: '8px', lineHeight: '1.4' }}>
                            {recipe.description}
                          </div>

                          <div style={{ fontSize: '10px', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '8px' }}>
                            <div style={{ fontWeight: 700, color: '#fde68a', marginBottom: '3px' }}>Nguyên Liệu Dược Liệu/Quặng Cần:</div>
                            {recipe.ingredients.map(ing => {
                              const info = getIngredientInfo(ing.id);
                              const hasEnough = info.qty >= ing.amount;
                              return (
                                <div key={ing.id} style={{ color: hasEnough ? '#86efac' : '#ef4444', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>{info.emoji} {info.name} x{ing.amount}</span>
                                  <span>({info.qty}/{ing.amount})</span>
                                </div>
                              );
                            })}
                            <div style={{ color: canAffordStones ? '#38bdf8' : '#ef4444', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                              <span>💎 Linh Thạch</span>
                              <span>{recipe.spiritStonesCost} 💎</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <button
                            disabled={!canCraft}
                            onClick={() => handleCraftPill(recipe, 1)}
                            style={{
                              width: '100%', padding: '8px', borderRadius: '8px', fontWeight: 800, fontSize: '11px',
                              background: canCraft ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(100,116,139,0.2)',
                              border: `1px solid ${canCraft ? '#f87171' : 'transparent'}`,
                              color: canCraft ? '#fff' : '#64748b', cursor: canCraft ? 'pointer' : 'not-allowed',
                              boxShadow: canCraft ? '0 0 12px rgba(239,68,68,0.4)' : 'none'
                            }}
                          >
                            {canCraft ? '🔥 LUYỆN ĐAN (x1)' : 'Thiếu Nguyên Liệu / Linh Thạch'}
                          </button>

                          {canCraft && (
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button
                                onClick={() => handleCraftPill(recipe, 5)}
                                style={{ flex: 1, padding: '5px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 800, background: 'rgba(239,68,68,0.18)', border: '1px solid #ef444466', color: '#fca5a5', cursor: 'pointer' }}
                              >
                                🔥 x5
                              </button>
                              <button
                                onClick={() => handleCraftPill(recipe, 10)}
                                style={{ flex: 1, padding: '5px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 800, background: 'rgba(239,68,68,0.18)', border: '1px solid #ef444466', color: '#fca5a5', cursor: 'pointer' }}
                              >
                                🔥 x10
                              </button>
                              {(() => {
                                const maxAfford = getMaxCraftCount(recipe);
                                return (
                                  <button
                                    onClick={() => handleCraftPill(recipe, maxAfford)}
                                    style={{ flex: 1.2, padding: '5px', borderRadius: '6px', fontSize: '9.5px', fontWeight: 900, background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: '1px solid #fde68a', color: '#000', cursor: 'pointer' }}
                                  >
                                    ⚡ MAX (x{maxAfford})
                                  </button>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* TAB 3: Mounts Gacha & Collection */}
            {modalTab === 'mounts' && (
              <>
                {/* Gacha Spin Controls Banner */}
                <div style={{ background: 'linear-gradient(135deg, rgba(88,28,135,0.4), rgba(30,27,75,0.6))', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '14px', padding: '14px 18px', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ color: '#d8b4fe', fontWeight: 900, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sparkles style={{ width: '16px', height: '16px', color: '#fde047' }} />
                      ĐÀI CẦU NGUYỆN — RƯƠNG LINH THÚ GACHA
                    </div>
                    <div style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '2px' }}>
                      Mở Rương nhận 10 Thú Cưỡi Tiên Gia 🐉 & Đan Dược • Bảo hiểm: <strong>{(gachaSpinCount % 50)}/50</strong> lần quay
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      onClick={() => handleSpinGacha(1)}
                      style={{ background: 'linear-gradient(135deg,#a855f7,#7e22ce)', border: '1px solid #c084fc', borderRadius: '10px', padding: '8px 14px', color: '#fff', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <RefreshCw style={{ width: '13px', height: '13px' }} />
                      Quay 1 Lần (100 💎)
                    </button>

                    <button
                      onClick={() => handleSpinGacha(10)}
                      style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: '1px solid #fde047', borderRadius: '10px', padding: '8px 16px', color: '#000', fontWeight: 900, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Sparkles style={{ width: '14px', height: '14px' }} />
                      Quay 10 Lần (900 💎)
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '11px', fontWeight: 800, color: 'rgba(192,132,252,0.85)', marginBottom: '10px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  BỘ SƯU TẬP 10 THÚ CƯỜI TIÊN GIA ({ownedMounts.length}/10)
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(245px, 1fr))', gap: '10px', maxHeight: '380px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
                  {MOUNT_CONFIG.map(m => {
                    const isOwned = ownedMounts.includes(m.id);
                    const isEquipped = activeMountId === m.id;

                    return (
                      <div
                        key={m.id}
                        style={{
                          padding: '10px 12px', borderRadius: '12px', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: isEquipped ? 'rgba(168,85,247,0.22)' : isOwned ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.35)',
                          border: `1px solid ${isEquipped ? '#c084fc' : isOwned ? RARITY_COLORS[m.rarity] + '55' : 'rgba(255,255,255,0.04)'}`,
                          opacity: isOwned ? 1 : 0.55
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          <AnimatedMountSprite mountId={m.id} size={44} />
                          <div style={{ overflow: 'hidden' }}>
                            <div style={{ fontWeight: 800, fontSize: '12px', color: RARITY_COLORS[m.rarity], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.emoji} {m.name}
                            </div>
                            <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {m.element} • +{m.dragXpBonus} XP/kéo
                            </div>
                            <div style={{ fontSize: '9.5px', color: '#fde68a', fontWeight: 800, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              ⚡ {m.buffName}: <span style={{ fontWeight: 600, color: '#e2e8f0' }}>{m.buffDescription}</span>
                            </div>
                            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '1px' }}>
                              {isOwned ? `Tỉ lệ Gacha: ${m.dropRate}%` : 'Chưa sở hữu (Quay Rương)'}
                            </div>
                          </div>
                        </div>

                        <div style={{ flexShrink: 0, marginLeft: '6px' }}>
                          {isOwned ? (
                            <button
                              onClick={() => {
                                if (isEquipped) {
                                  setActiveMountId(null);
                                  setBubbleText(`✨ Đã tháo Thú Cưỡi! 🐰`);
                                } else {
                                  setActiveMountId(m.id);
                                  setShowCostumePicker(false);
                                  setBubbleText(`✨ Đã cưỡi Thần Thú [${m.name}] phi hành! 🐴✨`);
                                }
                              }}
                              style={{
                                background: isEquipped ? '#c084fc' : 'rgba(168,85,247,0.2)',
                                border: '1px solid rgba(168,85,247,0.5)', borderRadius: '6px',
                                padding: '3px 8px', fontSize: '9.5px', fontWeight: 900,
                                color: isEquipped ? '#000' : '#d8b4fe', cursor: 'pointer'
                              }}
                            >
                              {isEquipped ? 'Đang Cưỡi' : 'Cưỡi'}
                            </button>
                          ) : (
                            <Lock style={{ width: '13px', height: '13px', color: '#475569' }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* TAB 4: Achievements Grid */}
            {modalTab === 'achievements' && (
              <>
                <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#64748b' }} />
                      <input
                        type="text" placeholder="🔍 Tìm kiếm trong 102 thành tựu..." value={achSearchQuery}
                        onChange={e => setAchSearchQuery(e.target.value)}
                        style={{ width: '100%', background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(245,158,11,0.28)', borderRadius: '10px', padding: '7px 12px 7px 32px', fontSize: '12px', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ fontSize: '12px', color: '#86efac', fontWeight: 800, flexShrink: 0 }}>
                      🏆 {unlockedAchievements.length}/102 Thành Tựu
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                    {[
                      { key: 'all', label: 'Tất Cả (102)' },
                      { key: 'cultivation', label: '🧘 Tu Tiên (28)' },
                      { key: 'devops', label: '🚀 DevOps (26)' },
                      { key: 'activity', label: '⏱️ Hoạt Động (28)' },
                      { key: 'secret', label: '🔮 Bí Cảnh (20)' }
                    ].map(cat => (
                      <button
                        key={cat.key} onClick={() => setAchCategoryFilter(cat.key)}
                        style={{
                          background: achCategoryFilter === cat.key ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.04)',
                          border: `1px solid ${achCategoryFilter === cat.key ? '#f59e0b' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: '8px', padding: '4px 10px', fontSize: '11px', fontWeight: 700,
                          color: achCategoryFilter === cat.key ? '#fde68a' : '#94a3b8', cursor: 'pointer', whiteSpace: 'nowrap'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(245px, 1fr))', gap: '10px', maxHeight: '380px', overflowY: 'auto', overflowX: 'hidden', paddingRight: '4px' }}>
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
                            padding: '10px 12px', borderRadius: '12px', textAlign: 'left', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                            background: isUnlocked ? 'rgba(245,158,11,0.12)' : isSecret ? 'rgba(88,28,135,0.18)' : 'rgba(0,0,0,0.3)',
                            border: `1px solid ${isUnlocked ? 'rgba(245,158,11,0.5)' : isSecret ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            opacity: isUnlocked ? 1 : 0.7
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', overflow: 'hidden' }}>
                            <span style={{ fontSize: '22px', flexShrink: 0, filter: isUnlocked ? 'none' : 'grayscale(80%)' }}>{isSecret ? '❓' : ach.icon}</span>
                            <div style={{ overflow: 'hidden' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '11.5px', color: isUnlocked ? '#fbbf24' : isSecret ? '#c084fc' : '#e2e8f0' }}>
                                  {isSecret ? 'Thành Tựu Ẩn' : ach.title}
                                </span>
                                {ach.isSecret && <span style={{ background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: '4px', padding: '0px 4px', fontSize: '8px', color: '#d8b4fe' }}>ẨN</span>}
                              </div>
                              <div style={{ fontSize: '10px', color: isUnlocked ? '#cbd5e1' : '#94a3b8', marginTop: '2px', lineHeight: '1.35' }}>
                                {isSecret ? (ach.hint ?? 'Bí ẩn đang chờ...') : ach.description}
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
