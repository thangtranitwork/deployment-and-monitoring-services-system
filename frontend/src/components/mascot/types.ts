export interface BunnyMascotProps {
  isDeploying?: boolean;
  selectedService?: string;
  activeDeployServices?: string[];
}

export type BunnyState =
  | 'idle'
  | 'walk_right'
  | 'walk_left'
  | 'jump_right'
  | 'jump_left'
  | 'sleep'
  | 'eat'
  | 'run_right'
  | 'run_left'
  | 'dance';

export interface LevelInfo {
  level: number;
  name: string;
  reqXp: number;
  skinId: string;
  skinName: string;
  treasureId: number;
}

// ─── Item System ───────────────────────────────────────────────────────────────
export type ItemId =
  | 'basic'
  | 'recover'
  | 'great'
  | 'talisman'
  | 'revive'
  | 'forge_talisman'
  | 'sky_stone'
  | 'pill_truc_co'
  | 'pill_kim_dan'
  | 'pill_nguyen_anh'
  | 'pill_hoa_than'
  | 'pill_luyen_hu'
  | 'pill_hop_the'
  | 'pill_dai_thua'
  | 'pill_do_kiep'
  | 'pill_chan_tien'
  | 'pill_huyen_tien'
  | 'pill_kim_tien'
  | 'pill_thai_at'
  | 'pill_thai_at_kim'
  | 'pill_dai_la'
  | 'pill_hon_nguyen'
  | 'pill_tien_de'
  | 'pill_ngo_dao'
  | 'pill_thien_dao'
  | 'pill_vo_cuc';

export type ForgeBoosterId = 'none' | 'forge_talisman' | 'sky_stone';

export type Inventory = Partial<Record<ItemId, number>>;

export type ItemCategory = 'xp' | 'breakthrough' | 'buff' | 'forge';

export interface ItemConfig {
  id: ItemId;
  name: string;
  emoji: string;
  iconImage?: string;
  xpValue: number;
  maxStack: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'supreme';
  description: string;
  category?: ItemCategory;
  isBuff?: boolean;
  buffDurationMs?: number;
  buffSuccessBonus?: number;
  targetRealmIndex?: number;
  breakthroughBonus?: number;
  expMultiplier?: number;
  dropRateMultiplier?: number;
  isForgeBooster?: boolean;
  forgeSuccessBonus?: number;
  refundOnFailRatio?: number;
  buyPrice?: number;
  sellPrice?: number;
}

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
  iconImage?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'supreme';
  dropChance: number;
  description: string;
  buyPrice: number;
  sellPrice: number;
}

export type IngredientId = ItemId | HerbId;

export interface CraftingRecipe {
  id: string;
  name: string;
  emoji: string;
  iconImage?: string;
  resultItemId: ItemId;
  resultAmount: number;
  ingredients: { id: IngredientId; amount: number }[];
  spiritStonesCost: number;
  successRate: number;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'supreme';
  category?: ItemCategory;
}

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

// ─── Achievement System ───────────────────────────────────────────────────────
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

export interface GachaRewardItem {
  type: 'mount' | 'item';
  mountId?: string;
  name: string;
  icon: string;
  iconImage?: string;
  rarity: string;
}
