import React, { useState, useEffect, useRef } from 'react';
import { Moon, X, Crown, Zap, Trophy, Sparkles, Compass, ShoppingBag } from 'lucide-react';
import {
  BunnyMascotProps,
  BunnyState,
  ItemId,
  HerbId,
  ForgeBoosterId,
  Inventory,
  CraftingRecipe,
  MountConfig,
  Achievement,
  GachaRewardItem
} from './types';
import {
  BUNNY_STORAGE_KEY,
  MASCOT_SIZE,
  LEVEL_CONFIG,
  ITEM_CONFIG,
  HERB_CONFIG,
  FOOD_CONFIG,
  MOUNT_CONFIG,
  ACHIEVEMENTS
} from './constants';
import {
  getSuccessRate,
  getTreasureExpBonusPercent,
  getTreasureUpgradeSuccessRate,
  getDeployCommentary,
  formatNumber
} from './utils';
import { BunnySkinSprite } from './components/BunnySkinSprite';
import { TreasureSprite } from './components/TreasureSprite';
import { TreasureOrbit } from './components/TreasureOrbit';
import { AnimatedMountSprite } from './components/AnimatedMountSprite';
import { LightningCanvas } from './components/LightningCanvas';
import { SpeechBubble } from './components/SpeechBubble';
import { InventoryPanel } from './components/InventoryPanel';
import { CraftingModal } from './components/CraftingModal';
import { ForgingModal } from './components/ForgingModal';
import { GachaRewardModal } from './components/GachaRewardModal';
import { AchievementToast } from './components/AchievementToast';
import { SkinsTab } from './tabs/SkinsTab';
import { TreasuresTab } from './tabs/TreasuresTab';
import { CraftingTab } from './tabs/CraftingTab';
import { MarketTab } from './tabs/MarketTab';
import { MountsTab } from './tabs/MountsTab';
import { AchievementsTab } from './tabs/AchievementsTab';
import { VoiceCommandButton } from './components/VoiceCommandButton';
import { useVoiceCommand, VoiceCommandResult } from './hooks/useVoiceCommand';

export const BunnyMascot: React.FC<BunnyMascotProps> = ({
  isDeploying = false,
  selectedService = '',
  activeDeployServices = []
}) => {
  const loadSaved = () => {
    try {
      const s = localStorage.getItem(BUNNY_STORAGE_KEY);
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  };

  const [xp, setXp] = useState<number>(() => loadSaved().xp ?? 0);
  const [activeSkin, setActiveSkin] = useState<string>(() => loadSaved().activeSkin ?? 'none');
  const [activeTreasureId, setActiveTreasureId] = useState<number>(() => loadSaved().activeTreasureId ?? 1);
  const [inventory, setInventory] = useState<Inventory>(() => {
    const saved = loadSaved().inventory ?? {};
    return {
      '01_tu_linh_dan': saved['01_tu_linh_dan'] ?? saved['basic'] ?? 10,
      '04_hoi_khi_dan': saved['04_hoi_khi_dan'] ?? saved['recover'] ?? 5,
      '24_dai_hoi_khi_dan': saved['24_dai_hoi_khi_dan'] ?? saved['great'] ?? 3,
      '09_truc_co_dan': saved['09_truc_co_dan'] ?? saved['pill_truc_co'] ?? 1,
      '18_kim_nguyen_dan': saved['18_kim_nguyen_dan'] ?? saved['pill_kim_dan'] ?? 1,
      '25_ngung_anh_dan': saved['25_ngung_anh_dan'] ?? saved['pill_nguyen_anh'] ?? 1,
      talisman: saved.talisman ?? 2,
      revive: saved.revive ?? 0,
      forge_talisman: saved.forge_talisman ?? 1,
      sky_stone: saved.sky_stone ?? 1,
      ...saved
    };
  });
  const [selectedForgeBooster, setSelectedForgeBooster] = useState<ForgeBoosterId>(
    () => loadSaved().selectedForgeBooster ?? 'none'
  );
  const [activeForgingBooster, setActiveForgingBooster] = useState<ForgeBoosterId>('none');
  const [totalMinutes, setTotalMinutes] = useState<number>(() => loadSaved().totalMinutes ?? 0);
  const [totalDrags, setTotalDrags] = useState<number>(() => loadSaved().totalDrags ?? 0);
  const [totalPets, setTotalPets] = useState<number>(() => loadSaved().totalPets ?? 0);
  const [lastPetRewardTime, setLastPetRewardTime] = useState<number>(() => loadSaved().lastPetRewardTime ?? 0);
  const [lastRideRewardTime, setLastRideRewardTime] = useState<number>(() => loadSaved().lastRideRewardTime ?? 0);
  const [totalDeploys, setTotalDeploys] = useState<number>(() => loadSaved().totalDeploys ?? 0);
  const [totalPillsConsumed, setTotalPillsConsumed] = useState<number>(() => loadSaved().totalPillsConsumed ?? 0);
  const [deployedServices, setDeployedServices] = useState<string[]>(() => loadSaved().deployedServices ?? []);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(() => loadSaved().unlockedAchievements ?? []);
  const [activeRealmPillId, setActiveRealmPillId] = useState<string | null>(() => loadSaved().activeRealmPillId ?? null);
  const [realmPillExpiry, setRealmPillExpiry] = useState<number>(() => loadSaved().realmPillExpiry ?? 0);
  const [talismanBuffExpiry, setTalismanBuffExpiry] = useState<number>(() => loadSaved().talismanBuffExpiry ?? 0);
  const [reviveBuffExpiry, setReviveBuffExpiry] = useState<number>(() => loadSaved().reviveBuffExpiry ?? 0);
  const [voCucBuffExpiry, setVoCucBuffExpiry] = useState<number>(() => loadSaved().voCucBuffExpiry ?? 0);
  const [talismanCountdown, setTalismanCountdown] = useState<number>(0);
  const [failCountAtCurrentLevel, setFailCountAtCurrentLevel] = useState<number>(
    () => loadSaved().failCountAtCurrentLevel ?? 0
  );
  const [breakthroughSuccessCount, setBreakthroughSuccessCount] = useState<number>(
    () => loadSaved().breakthroughSuccessCount ?? 0
  );
  const [breakthroughFailCount, setBreakthroughFailCount] = useState<number>(() => loadSaved().breakthroughFailCount ?? 0);
  const [multiDeployCount, setMultiDeployCount] = useState<number>(() => loadSaved().multiDeployCount ?? 0);
  const [pillSpreeTimes, setPillSpreeTimes] = useState<number[]>([]);

  // ─── Gacha & Flying Mount State ─────────────────────────────────────────────
  const [spiritStones, setSpiritStones] = useState<number>(() => loadSaved().spiritStones ?? 500);
  const [ownedMounts, setOwnedMounts] = useState<string[]>(() => loadSaved().ownedMounts ?? ['wolf']);
  const [activeMountId, setActiveMountId] = useState<string | null>(() => loadSaved().activeMountId ?? 'wolf');
  const [mountLevels, setMountLevels] = useState<Record<string, number>>(() => loadSaved().mountLevels ?? {});
  const [mountExp, setMountExp] = useState<Record<string, number>>(() => loadSaved().mountExp ?? {});
  const [gachaSpinCount, setGachaSpinCount] = useState<number>(() => loadSaved().gachaSpinCount ?? 0);
  const [recentGachaRewards, setRecentGachaRewards] = useState<GachaRewardItem[] | null>(null);

  const [treasureLevels, setTreasureLevels] = useState<Record<number, number>>(() => loadSaved().treasureLevels ?? {});
  const [craftCount, setCraftCount] = useState<number>(() => loadSaved().craftCount ?? 0);
  const [craftFailCount, setCraftFailCount] = useState<number>(() => loadSaved().craftFailCount ?? 0);
  const [herbsInventory, setHerbsInventory] = useState<Record<string, number>>(() => {
    const saved = loadSaved().herbsInventory ?? {};
    if (!saved.food_01_pho_bo && !saved.food_09_pizza && !saved.food_33_linh_qua) {
      return {
        ...saved,
        food_01_pho_bo: 10,
        food_09_pizza: 5,
        food_17_steak: 3,
        food_33_linh_qua: 2,
        food_49_tien_dao: 1
      };
    }
    return saved;
  });
  const [isCraftingAnim, setIsCraftingAnim] = useState(false);
  const [activeCraftingRecipe, setActiveCraftingRecipe] = useState<CraftingRecipe | null>(null);
  const [craftingResult, setCraftingResult] = useState<{
    success: boolean;
    message: string;
    pillName: string;
    pillEmoji: string;
  } | null>(null);

  const [isForgingAnim, setIsForgingAnim] = useState(false);
  const [activeForgingTreasureId, setActiveForgingTreasureId] = useState<number | null>(null);
  const [forgingResult, setForgingResult] = useState<{
    success: boolean;
    message: string;
    targetLevel: number;
    newBonus: number;
  } | null>(null);

  // Modal achievements search & filter
  const [achSearchQuery, setAchSearchQuery] = useState('');
  const [achCategoryFilter, setAchCategoryFilter] = useState<string>('all');

  // UI State
  const [isLevelUpAnim, setIsLevelUpAnim] = useState(false);
  const [showCostumePicker, setShowCostumePicker] = useState(false);
  const [modalTab, setModalTab] = useState<'skins' | 'treasures' | 'crafting' | 'market' | 'mounts' | 'achievements'>('skins');
  const [recentAchievementToast, setRecentAchievementToast] = useState<Achievement | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [state, setState] = useState<BunnyState>('idle');
  const [frame, setFrame] = useState(0);
  const [posX, setPosX] = useState(82);
  const [posYBottom, setPosYBottom] = useState(12);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [bubbleText, setBubbleText] = useState('Bổn Thỏ xin chào Chân Tiên! 🐰');
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const directionRef = useRef<'left' | 'right'>('left');
  directionRef.current = direction;
  const dragStartRef = useRef({ startX: 0, startY: 0, initPosX: 82, initPosY: 12 });

  // Computed
  const currentLevelInfo = LEVEL_CONFIG.slice().reverse().find(l => xp >= l.reqXp) ?? LEVEL_CONFIG[0];
  const currentLevel = currentLevelInfo.level;
  const activeSkinInfo = LEVEL_CONFIG.find(l => l.skinId === activeSkin) ?? currentLevelInfo;
  const activeTreasureInfo = LEVEL_CONFIG.find(l => l.treasureId === activeTreasureId) ?? currentLevelInfo;
  const activeMountConfig = MOUNT_CONFIG.find(m => m.id === activeMountId);
  const nextLevelInfo = LEVEL_CONFIG.find(l => l.level === currentLevel + 1);
  const isReadyToBreakthrough = Boolean(nextLevelInfo && xp >= nextLevelInfo.reqXp - 1);
  const isTribulationLevel = currentLevel >= 2;

  // Buff computations (CỘNG DỒN CÁC LOẠI BUFF)
  const isRealmPillActive = Date.now() < realmPillExpiry && Boolean(activeRealmPillId);
  const activeRealmPillConfig = isRealmPillActive ? ITEM_CONFIG.find(i => i.id === activeRealmPillId) : null;
  const isRealmPillMatched = activeRealmPillConfig?.targetRealmIndex === currentLevel;
  const realmPillBonus = isRealmPillMatched ? (activeRealmPillConfig?.breakthroughBonus ?? 0.25) : 0;

  const isTalismanActive = Date.now() < talismanBuffExpiry;
  const talismanBonus = isTalismanActive ? 0.25 : 0;

  const isReviveActive = Date.now() < reviveBuffExpiry;
  const reviveBonus = isReviveActive ? 0.35 : 0;

  const isVoCucActive = Date.now() < voCucBuffExpiry;
  const voCucBonus = isVoCucActive ? 0.20 : 0;

  const baseSuccessRate = getSuccessRate(currentLevel);
  const pityBonus = failCountAtCurrentLevel * 0.05;
  const mountBonus = activeMountConfig?.breakthroughBonus ?? 0;

  const totalSuccessRate = baseSuccessRate + realmPillBonus + talismanBonus + reviveBonus + voCucBonus + pityBonus + mountBonus;
  const effectiveSuccessRate = Math.min(1.0, totalSuccessRate);
  const currentSuccessRatePercent = Math.round(effectiveSuccessRate * 100);

  // Forge Booster Computed
  const effectiveBoosterId: ForgeBoosterId =
    selectedForgeBooster !== 'none' && (inventory[selectedForgeBooster] || 0) > 0
      ? selectedForgeBooster
      : 'none';
  const activeBoosterConfig = effectiveBoosterId !== 'none' ? ITEM_CONFIG.find(i => i.id === effectiveBoosterId) : null;
  const boosterBonusRate = activeBoosterConfig?.forgeSuccessBonus ?? 0;

  const prevReq = currentLevelInfo.reqXp;
  const nextReq = nextLevelInfo ? nextLevelInfo.reqXp : prevReq + 20000;
  const currentLevelGap = Math.max(1000, nextReq - prevReq);
  const progressPercent = Math.min(100, Math.max(0, ((xp - prevReq) / currentLevelGap) * 100));
  const totalInventory = Object.values(inventory).reduce((a: number, b: number | undefined) => a + (b || 0), 0);

  // ── Voice Command Hook (Gemini MCP Engine) ──
  const handleVoiceResult = (result: VoiceCommandResult) => {
    setIsDismissed(false);
    setBubbleText(result.bunny_message);
    if (result.action_type === 'deploy') {
      setState('run_left');
    } else if (result.action_type === 'status' || result.action_type === 'list' || result.action_type === 'stats') {
      setState('dance');
    } else if (result.action_type === 'git_pull' || result.action_type === 'git_checkout') {
      setState('walk_right');
    } else {
      setState('idle');
    }
  };

  const availableServiceNames = activeDeployServices.length > 0
    ? activeDeployServices
    : (selectedService ? [selectedService] : []);

  const {
    isListening,
    isProcessing,
    transcript,
    isSupported: isVoiceSupported,
    startListening,
    stopListening
  } = useVoiceCommand({
    availableServices: availableServiceNames,
    onCommandResult: handleVoiceResult
  });

  const toggleVoiceCommand = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(availableServiceNames);
    }
  };

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        BUNNY_STORAGE_KEY,
        JSON.stringify({
          xp,
          activeSkin,
          activeTreasureId,
          inventory,
          selectedForgeBooster,
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
          mountLevels,
          mountExp,
          gachaSpinCount,
          treasureLevels,
          craftCount,
          herbsInventory,
          lastSessionTime: Date.now()
        })
      );
    } catch {
      /* noop */
    }
  }, [
    xp,
    activeSkin,
    activeTreasureId,
    inventory,
    selectedForgeBooster,
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
    mountLevels,
    mountExp,
    gachaSpinCount,
    treasureLevels,
    craftCount,
    herbsInventory
  ]);

  useEffect(() => {
    const tick = () => setTalismanCountdown(Math.max(0, Math.ceil((talismanBuffExpiry - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [talismanBuffExpiry]);

  const triggerGentleHop = () => {
    setState('jump_right');
    setFrame(0);
    setTimeout(() => setState('idle'), 1200);
  };

  const grantItem = (itemId: ItemId, amount: number, msg?: string) => {
    const aliasMap: Record<string, string> = {
      basic: '01_tu_linh_dan',
      recover: '04_hoi_khi_dan',
      great: '24_dai_hoi_khi_dan',
      pill_truc_co: '09_truc_co_dan',
      pill_kim_dan: '18_kim_nguyen_dan',
      pill_nguyen_anh: '25_ngung_anh_dan',
      pill_hoa_than: '29_hoa_than_dan',
      pill_luyen_hu: '33_luyen_hu_dan',
      pill_hop_the: '35_hop_the_dan',
      pill_dai_thua: '37_dai_thua_dan',
      pill_do_kiep: '41_do_kiep_dan',
      pill_chan_tien: '43_chan_tien_dan',
      pill_huyen_tien: '49_huyen_tien_dan',
      pill_kim_tien: '51_kim_tien_dan',
      pill_thai_at: '53_thai_at_ngoc_tien_dan',
      pill_thai_at_kim: '54_thai_at_kim_tien_dan',
      pill_dai_la: '57_dai_la_kim_dan',
      pill_hon_nguyen: '58_hon_nguyen_dan',
      pill_tien_de: '63_tien_de_dao_dan'
    };
    const targetId = aliasMap[itemId] || itemId;
    const cfg = ITEM_CONFIG.find(i => i.id === targetId) || ITEM_CONFIG[0];
    setInventory(prev => ({ ...prev, [targetId]: Math.min(cfg.maxStack || 999, (prev[targetId] ?? 0) + amount) }));
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
    const newRewards: GachaRewardItem[] = [];
    let currentSpinCount = gachaSpinCount;
    let newOwnedMounts = [...ownedMounts];

    for (let i = 0; i < count; i++) {
      currentSpinCount++;
      const isPityTrigger = currentSpinCount % 50 === 0;
      const roll = Math.random() * 100;

      if (isPityTrigger) {
        const supremeMounts = MOUNT_CONFIG.filter(m => m.rarity === 'supreme' || m.rarity === 'legendary');
        const picked = supremeMounts[Math.floor(Math.random() * supremeMounts.length)];
        if (!newOwnedMounts.includes(picked.id)) {
          newOwnedMounts.push(picked.id);
        }
        newRewards.push({
          type: 'mount',
          mountId: picked.id,
          name: `${picked.name} (BẢO HIỂM 👑)`,
          icon: picked.emoji,
          rarity: picked.rarity
        });
      } else {
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
          newRewards.push({
            type: 'mount',
            mountId: wonMount.id,
            name: wonMount.name,
            icon: wonMount.emoji,
            rarity: wonMount.rarity
          });
        } else {
          const itemRoll = Math.random();
          if (itemRoll < 0.35) {
            grantItem('basic', 3);
            newRewards.push({ type: 'item', name: '3x Tụ Linh Đan', icon: '💊', iconImage: '/pills/01_tu_linh_dan.png', rarity: 'common' });
          } else if (itemRoll < 0.60) {
            grantItem('recover', 2);
            newRewards.push({ type: 'item', name: '2x Hồi Phục Đan', icon: '🍃', iconImage: '/pills/04_hoi_khi_dan.png', rarity: 'uncommon' });
          } else if (itemRoll < 0.75) {
            grantItem('great', 1);
            newRewards.push({ type: 'item', name: '1x Đại Hoàn Đan', icon: '🌸', iconImage: '/pills/24_dai_hoi_khi_dan.png', rarity: 'rare' });
          } else if (itemRoll < 0.85) {
            grantItem('talisman', 1);
            newRewards.push({ type: 'item', name: '1x Hộ Kiếp Phù', icon: '🔱', iconImage: '/items/17_ho_kiep_phu.png', rarity: 'legendary' });
          } else if (itemRoll < 0.95) {
            grantItem('forge_talisman', 1);
            newRewards.push({ type: 'item', name: '1x Thần Luyện Phù', icon: '📜', iconImage: '/items/18_than_luyen_phu.png', rarity: 'legendary' });
          } else {
            grantItem('sky_stone', 1);
            newRewards.push({ type: 'item', name: '1x Bổ Thiên Thạch', icon: '💠', iconImage: '/items/25_bo_thien_thach.png', rarity: 'supreme' });
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
      if (mountWins.some(m => m.rarity === 'supreme')) unlockAchievement('secret_mount_supreme');
      if (newOwnedMounts.length >= 1) unlockAchievement('mount_owner_1');
    } else {
      setBubbleText(`✨ Mở Rương thu hoạch ${count} linh đan & bảo vật!`);
    }
  };

  // ─── Mount Nurturing & Leveling ──────────────────────────────────────────────
  const handleFeedMount = (mountId: string, foodId: string, amount: number) => {
    const mount = MOUNT_CONFIG.find(m => m.id === mountId);
    if (!mount || !ownedMounts.includes(mountId)) return;

    let expGain = 0;
    let costMsg = '';

    if (foodId === 'spirit_stone') {
      const cost = 50 * amount;
      if (spiritStones < cost) {
        setBubbleText(`😢 Không đủ Linh Thạch! Cần ${cost} 💎 để nuôi [${mount.name}]!`);
        return;
      }
      addSpiritStones(-cost);
      expGain = 25 * amount;
      costMsg = `${cost} 💎 Linh Thạch`;
    } else {
      const foodItem = FOOD_CONFIG.find(f => f.id === foodId) || HERB_CONFIG.find(h => h.id === foodId as any);
      if (!foodItem) return;
      const have = herbsInventory[foodId as any] || 0;
      if (have < amount) {
        setBubbleText(`😢 Không đủ [${foodItem.name}]! Cần ${amount}x!`);
        return;
      }
      const expPerFood = (foodItem as any).expValue || (foodItem.rarity === 'supreme' ? 500 : foodItem.rarity === 'legendary' ? 200 : foodItem.rarity === 'rare' ? 80 : foodItem.rarity === 'uncommon' ? 35 : 15);
      expGain = expPerFood * amount;
      costMsg = `${amount}x [${foodItem.name}]`;
      unlockAchievement('food_feed_1');
      setHerbsInventory(prev => ({ ...prev, [foodId]: Math.max(0, (prev[foodId] || 0) - amount) }));
    }

    const curLvl = mountLevels[mountId] || 1;
    const curExp = mountExp[mountId] || 0;
    const reqExp = curLvl * 100;
    let newExp = curExp + expGain;
    let newLvl = curLvl;

    while (newExp >= newLvl * 100 && newLvl < 10) {
      newExp -= newLvl * 100;
      newLvl += 1;
    }

    setMountLevels(prev => ({ ...prev, [mountId]: newLvl }));
    setMountExp(prev => ({ ...prev, [mountId]: newExp }));

    if (newLvl > curLvl) {
      setBubbleText(`✨ [THẦN THÚ] [${mount.name}] đã hấp thụ ${costMsg} và THĂNG CẤP Cấp ${newLvl}! Bonus Drag XP: +${(newLvl - 1) * 5 + mount.dragXpBonus} XP/kéo! 🦄✨`);
      unlockAchievement('secret_mount_level_up');
    } else {
      setBubbleText(`🥩 Đã cho [${mount.name}] ăn ${costMsg}! (+${expGain} EXP) Tiến độ: ${newExp}/${reqExp} EXP ✨`);
    }
  };

  // ─── Alchemy Crafting Engine ────────────────────────────────────────────────
  const handleCraftPill = (recipe: CraftingRecipe, count: number = 1) => {
    let maxAfford = Math.floor(spiritStones / recipe.spiritStonesCost);
    for (const ing of recipe.ingredients) {
      const have = ing.id.startsWith('herb_') || ing.id.startsWith('mineral_')
        ? herbsInventory[ing.id as HerbId] || 0
        : inventory[ing.id as keyof Inventory] || 0;
      const canMake = Math.floor(have / ing.amount);
      if (canMake < maxAfford) maxAfford = canMake;
    }

    const actualCount = Math.min(count, maxAfford);
    if (actualCount <= 0) {
      setBubbleText(`😢 Không đủ nguyên liệu hoặc Linh Thạch để luyện [${recipe.name}]!`);
      return;
    }

    const totalStonesCost = recipe.spiritStonesCost * actualCount;
    addSpiritStones(-totalStonesCost);

    setHerbsInventory(prev => {
      const next = { ...prev };
      for (const ing of recipe.ingredients) {
        if (ing.id.startsWith('herb_') || ing.id.startsWith('mineral_')) {
          next[ing.id as HerbId] = Math.max(0, (next[ing.id as HerbId] || 0) - ing.amount * actualCount);
        }
      }
      return next;
    });

    setInventory(prev => {
      const next = { ...prev };
      for (const ing of recipe.ingredients) {
        if (!ing.id.startsWith('herb_') && !ing.id.startsWith('mineral_')) {
          const k = ing.id as ItemId;
          next[k] = Math.max(0, (next[k] || 0) - ing.amount * actualCount);
        }
      }
      return next;
    });

    setActiveCraftingRecipe(recipe);
    setIsCraftingAnim(true);
    setCraftingResult(null);

    setTimeout(() => {
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < actualCount; i++) {
        if (Math.random() < recipe.successRate) successCount++;
        else failCount++;
      }

      if (successCount > 0) {
        setInventory(prev => ({
          ...prev,
          [recipe.resultItemId]: (prev[recipe.resultItemId] || 0) + recipe.resultAmount * successCount
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
        const troDanXp = Math.max(10, Math.round(currentLevelGap * 0.001)) * failCount;
        addXP(troDanXp, `🌪️ Tro Đan (x${failCount}): Nổ lò nhưng ngộ ra quy luật (+${formatNumber(troDanXp)} XP)`);
      }

      const isOverallSuccess = successCount > 0;
      const troDanSingleXp = Math.max(10, Math.round(currentLevelGap * 0.001));
      const resultMessage =
        actualCount > 1
          ? `🔥 LUYỆN BÁT QUÁI HÀNG LOẠT (x${actualCount})\n✅ Thành công: ${successCount * recipe.resultAmount}x ${recipe.name}\n💥 Nổ lò thất bại: ${failCount}x (Nhận ${failCount}x Tro Đan +${formatNumber(troDanSingleXp * failCount)} XP)`
          : isOverallSuccess
          ? `🔥 LUYỆN ĐAN THÀNH CÔNG! Ngưng tụ tinh hoa đất trời thành ${recipe.resultAmount}x ${recipe.name}!`
          : `💥 THẤT BẠI NỔ LÒ! Dược lực không cân bằng bùng khói đen! Mất nguyên liệu & nhận 1x Tro Đan (+${formatNumber(troDanSingleXp)} XP)!`;

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

  // ─── Forging Engine (With Booster Consumption & Refunds) ─────────────────────
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
    const baseRate = getTreasureUpgradeSuccessRate(nextLvl);
    const targetTreasure = LEVEL_CONFIG.find(l => l.treasureId === treasureId);
    const treasureName = targetTreasure?.skinName || 'Pháp Bảo';

    const boosterToUse: ForgeBoosterId =
      selectedForgeBooster !== 'none' && (inventory[selectedForgeBooster] || 0) > 0
        ? selectedForgeBooster
        : 'none';
    const boosterCfg = boosterToUse !== 'none' ? ITEM_CONFIG.find(i => i.id === boosterToUse) : null;
    const boosterBonus = boosterCfg?.forgeSuccessBonus ?? 0;
    const effectiveRate = Math.min(1.0, baseRate + boosterBonus);

    addSpiritStones(-cost);
    if (boosterToUse !== 'none') {
      setInventory(prev => {
        const cur = prev[boosterToUse] || 0;
        const next = Math.max(0, cur - 1);
        if (next === 0 && selectedForgeBooster === boosterToUse) {
          setSelectedForgeBooster('none');
        }
        return { ...prev, [boosterToUse]: next };
      });
      unlockAchievement('forge_talisman_use');
    }

    setActiveForgingTreasureId(treasureId);
    setActiveForgingBooster(boosterToUse);
    setIsForgingAnim(true);
    setForgingResult(null);

    setTimeout(() => {
      const isSuccess = Math.random() < effectiveRate;
      const newBonus = getTreasureExpBonusPercent(treasureId, nextLvl);

      if (isSuccess) {
        if (boosterToUse !== 'none') {
          unlockAchievement('forge_buff_success');
        }
        setTreasureLevels(prev => {
          const next = { ...prev, [treasureId]: nextLvl };
          if (nextLvl >= 2) unlockAchievement('forge_1');
          if (nextLvl >= 10) unlockAchievement('forge_max');
          return next;
        });

        const boosterNote = boosterCfg ? ` (Có gia trì từ ${boosterCfg.name} +${Math.round(boosterBonus * 100)}% TC)` : '';
        setForgingResult({
          success: true,
          message: `⚡ LÔI QUANG ĐẠI THÀNH! [${treasureName}] đã tôi luyện đột phá Cấp ${nextLvl} (+${newBonus}% EXP)!${boosterNote}`,
          targetLevel: nextLvl,
          newBonus
        });
        setBubbleText(`🔨 Rèn [${treasureName}] lên Cấp ${nextLvl} đại thành công! Buff: +${newBonus}% EXP! ⚡✨`);
      } else {
        unlockAchievement('secret_forge_fail');
        let refundNote = '';
        if (boosterCfg?.refundOnFailRatio) {
          const refund = Math.floor(cost * boosterCfg.refundOnFailRatio);
          addSpiritStones(refund);
          refundNote = ` Được ${boosterCfg.name} bảo hộ hoàn trả ngay ${refund} 💎 Linh Thạch!`;
        }

        setForgingResult({
          success: false,
          message: `🌩️ LÔI ĐÌNH BẠO TẠC! Rèn [${treasureName}] lên Cấp ${nextLvl} thất bại! Tiêu hao ${cost} 💎 Linh Thạch nhưng cấp độ bảo toàn.${refundNote} Hãy thử lại!`,
          targetLevel: currentLvl,
          newBonus: getTreasureExpBonusPercent(treasureId, currentLvl)
        });
        setBubbleText(
          `🌩️ Lôi điện bạo tạc! Rèn [${treasureName}] lên Cấp ${nextLvl} thất bại! 😢${
            boosterCfg?.refundOnFailRatio ? ` (Hoàn ${Math.floor(cost * boosterCfg.refundOnFailRatio)} 💎)` : ''
          }`
        );
      }
    }, 2400);
  };

  // ─── Achievement Engine ─────────────────────────────────────────────────────
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
      if (ach.reward.spiritStones) {
        addSpiritStones(ach.reward.spiritStones);
      }

      setRecentAchievementToast(ach);
      return [...prev, achId];
    });
  };

  // Check achievements against current milestones
  useEffect(() => {
    if (currentLevel >= 2) unlockAchievement('cult_lvl2');
    if (currentLevel >= 3) unlockAchievement('cult_lvl3');
    if (currentLevel >= 4) unlockAchievement('cult_lvl4');
    if (currentLevel >= 5) unlockAchievement('cult_lvl5');
    if (currentLevel >= 6) unlockAchievement('cult_lvl6');
    if (currentLevel >= 7) unlockAchievement('cult_lvl7');
    if (currentLevel >= 8) unlockAchievement('cult_lvl8');
    if (currentLevel >= 9) unlockAchievement('cult_lvl9');
    if (currentLevel >= 10) unlockAchievement('cult_lvl10');
    if (currentLevel >= 11) unlockAchievement('cult_lvl11');
    if (currentLevel >= 12) unlockAchievement('cult_lvl12');
    if (currentLevel >= 13) unlockAchievement('cult_lvl13');
    if (currentLevel >= 14) unlockAchievement('cult_lvl14');
    if (currentLevel >= 15) unlockAchievement('cult_lvl15');
    if (currentLevel >= 16) unlockAchievement('cult_lvl16');
    if (currentLevel >= 17) unlockAchievement('cult_lvl17');

    const xpMilestones = [500, 1500, 5000, 15000, 40000, 100000];
    xpMilestones.forEach(m => {
      if (xp >= m) unlockAchievement(`cult_xp_${m}`);
    });

    if (breakthroughSuccessCount >= 1) unlockAchievement('cult_break_1');
    if (breakthroughSuccessCount >= 5) unlockAchievement('cult_break_5');
    if (breakthroughSuccessCount >= 10) unlockAchievement('cult_break_10');
    if (breakthroughSuccessCount >= 15) unlockAchievement('cult_break_15');
    if (breakthroughFailCount >= 3) unlockAchievement('cult_fail_3');
    if (failCountAtCurrentLevel >= 1) unlockAchievement('cult_pity_trigger');

    const devMilestones = [1, 3, 5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500];
    devMilestones.forEach(m => {
      if (totalDeploys >= m) unlockAchievement(`dev_${m}`);
    });

    const svcCount = deployedServices.length;
    if (svcCount >= 1) unlockAchievement('dev_svc_1');
    if (svcCount >= 2) unlockAchievement('dev_svc_2');
    if (svcCount >= 3) unlockAchievement('dev_svc_3');
    if (svcCount >= 5) unlockAchievement('dev_svc_5');
    if (svcCount >= 8) unlockAchievement('dev_svc_8');
    if (svcCount >= 10) unlockAchievement('dev_svc_10');

    const timeMilestones = [5, 15, 30, 60, 90, 120, 180, 240, 300, 450, 600, 1000, 1440];
    timeMilestones.forEach(m => {
      if (totalMinutes >= m) unlockAchievement(`time_${m}m`);
    });

    const dragMilestones = [1, 5, 10, 20, 30, 50, 75, 100, 200, 500];
    dragMilestones.forEach(m => {
      if (totalDrags >= m) unlockAchievement(`drag_${m}`);
    });

    const pillMilestones = [1, 10, 30, 100, 300];
    pillMilestones.forEach(m => {
      if (totalPillsConsumed >= m) unlockAchievement(`pill_${m}`);
    });

    if (multiDeployCount >= 3) unlockAchievement('secret_multi_deploy_master');

    const hour = new Date().getHours();
    if (hour >= 23 || hour < 5) unlockAchievement('secret_night_owl');
    if (hour >= 5 && hour < 7) unlockAchievement('secret_early_bird');
    if (hour >= 12 && hour < 13) unlockAchievement('secret_noon_master');

    if (totalInventory >= 20) unlockAchievement('secret_full_inventory');
    if (unlockedAchievements.length >= 50) unlockAchievement('secret_supreme_immortal');

    if (ownedMounts.length >= 3) unlockAchievement('mount_owner_3');
    if (ownedMounts.length >= 5) unlockAchievement('mount_owner_5');
    if (ownedMounts.length >= 10) unlockAchievement('mount_owner_10');
    if (gachaSpinCount >= 5) unlockAchievement('secret_mount_gacha_5');
    if (totalPets >= 1) unlockAchievement('pet_1');
    if (totalPets >= 10) unlockAchievement('pet_10');
    if (totalPets >= 50) unlockAchievement('pet_50');
    if (totalPets >= 100) unlockAchievement('secret_pet_100');
  }, [
    currentLevel,
    xp,
    breakthroughSuccessCount,
    breakthroughFailCount,
    failCountAtCurrentLevel,
    totalDeploys,
    deployedServices.length,
    totalMinutes,
    totalDrags,
    totalPets,
    totalPillsConsumed,
    multiDeployCount,
    totalInventory,
    unlockedAchievements.length,
    ownedMounts.length,
    gachaSpinCount
  ]);

  const addXP = (amount: number, reasonText?: string) => {
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

  // ─── Market Handlers ────────────────────────────────────────────────────────
  const handleBuyMaterial = (herbId: HerbId, amount: number) => {
    const herb = HERB_CONFIG.find(h => h.id === herbId);
    if (!herb) return;
    const totalCost = herb.buyPrice * amount;
    if (spiritStones < totalCost) {
      setBubbleText(`😢 Không đủ Linh Thạch! Cần ${totalCost} 💎 để mua ${amount}x ${herb.name}!`);
      return;
    }
    setSpiritStones(s => s - totalCost);
    setHerbsInventory(prev => ({ ...prev, [herbId]: (prev[herbId] || 0) + amount }));
    setBubbleText(`🛒 Đã mua thành công ${amount}x [${herb.name}] với ${totalCost} 💎!`);
  };

  const handleSellMaterial = (herbId: HerbId, amount: number) => {
    const herb = HERB_CONFIG.find(h => h.id === herbId);
    if (!herb) return;
    const curQty = herbsInventory[herbId] || 0;
    const sellAmount = Math.min(curQty, amount);
    if (sellAmount <= 0) return;
    const totalEarn = herb.sellPrice * sellAmount;
    setHerbsInventory(prev => ({ ...prev, [herbId]: Math.max(0, (prev[herbId] || 0) - sellAmount) }));
    setSpiritStones(s => s + totalEarn);
    setBubbleText(`💰 Đã bán ${sellAmount}x [${herb.name}], thu về +${totalEarn} 💎 Linh Thạch!`);
  };

  const handleBuyItem = (itemId: ItemId, amount: number) => {
    const item = ITEM_CONFIG.find(i => i.id === itemId);
    if (!item || !item.buyPrice) return;
    const totalCost = item.buyPrice * amount;
    if (spiritStones < totalCost) {
      setBubbleText(`😢 Không đủ Linh Thạch! Cần ${totalCost} 💎 để mua ${amount}x ${item.name}!`);
      return;
    }
    setSpiritStones(s => s - totalCost);
    setInventory(prev => ({ ...prev, [itemId]: Math.min(item.maxStack, (prev[itemId] || 0) + amount) }));
    setBubbleText(`🛒 Đã mua thành công ${amount}x [${item.name}] với ${totalCost} 💎!`);
  };

  const handleSellItem = (itemId: ItemId, amount: number) => {
    const item = ITEM_CONFIG.find(i => i.id === itemId);
    if (!item || !item.sellPrice) return;
    const curQty = inventory[itemId] || 0;
    const sellAmount = Math.min(curQty, amount);
    if (sellAmount <= 0) return;
    const totalEarn = item.sellPrice * sellAmount;
    setInventory(prev => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] || 0) - sellAmount) }));
    setSpiritStones(s => s + totalEarn);
    setBubbleText(`💰 Đã bán ${sellAmount}x [${item.name}], thu về +${totalEarn} 💎 Linh Thạch!`);
  };

  const handleConsumePill = (itemId: ItemId) => {
    const cfg = ITEM_CONFIG.find(i => i.id === itemId)!;
    const curQty = inventory[itemId] || 0;
    if (curQty <= 0) {
      setBubbleText(`😢 Kho ${cfg.emoji} trống rỗng! Tích thêm đan nhé!`);
      return;
    }

    // 1. Đan Dược Đột Phá Theo Cảnh Giới (Realm-Specific Breakthrough Pill)
    if (cfg.category === 'breakthrough' && cfg.targetRealmIndex !== undefined) {
      if (cfg.targetRealmIndex !== currentLevel) {
        const targetLvl = LEVEL_CONFIG.find(l => l.level === cfg.targetRealmIndex) || LEVEL_CONFIG[0];
        setBubbleText(`😢 [${cfg.name}] chỉ có tác dụng khi đột phá cảnh giới [${targetLvl.name}]! Cảnh giới hiện tại của bạn là [${currentLevelInfo.name}]!`);
        return;
      }

      const bonus = cfg.breakthroughBonus || 0.25;
      const duration = cfg.buffDurationMs || 300_000;
      const expiry = Date.now() + duration;

      setActiveRealmPillId(itemId);
      setRealmPillExpiry(expiry);
      setInventory(prev => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] || 1) - 1) }));
      setTotalPillsConsumed(prev => prev + 1);
      if (cfg.xpValue > 0) addXP(cfg.xpValue);

      setState('dance');
      setFrame(0);
      setBubbleText(`🌱 [${cfg.name}] KÍCH HOẠT ĐÚNG CẢNH GIỚI! +${Math.round(bonus * 100)}% Tỉ lệ Đột Phá [${currentLevelInfo.name}] trong ${Math.round(duration / 60000)} phút! (CỘNG DỒN ĐƯỢC VỚI HỘ KIẾP PHÙ) ✨`);
      unlockAchievement('secret_first_talisman');
      setShowInventory(false);
      return;
    }

    // 2. Hộ Kiếp Phù (Cộng Dồn Không Phụ Thuộc Cấp Bậc)
    if (itemId === 'talisman') {
      const duration = cfg.buffDurationMs || 300_000;
      setTalismanBuffExpiry(Date.now() + duration);
      setInventory(prev => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] || 1) - 1) }));
      setTotalPillsConsumed(prev => prev + 1);
      setState('dance');
      setFrame(0);
      setBubbleText(`🔱 [Hộ Kiếp Phù] KÍCH HOẠT! +25% Tỉ lệ Đột Phá (CỘNG DỒN DÙNG CHO MỌI CẢNH GIỚI)! ✨`);
      unlockAchievement('secret_first_talisman');
      setShowInventory(false);
      return;
    }

    // 3. Cửu Chuyển Hoàn Hồn Đan (Cộng Dồn Không Phụ Thuộc Cấp Bậc)
    if (itemId === 'revive') {
      const duration = cfg.buffDurationMs || 600_000;
      setReviveBuffExpiry(Date.now() + duration);
      setInventory(prev => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] || 1) - 1) }));
      setTotalPillsConsumed(prev => prev + 1);
      setState('dance');
      setFrame(0);
      setBubbleText(`🔮 [Cửu Chuyển Hoàn Hồn Đan] KÍCH HOẠT! +35% Tỉ lệ & BẢO HỘ 100% KHÔNG RỚT XP! (CỘNG DỒN MỌI CẢNH GIỚI) ✨`);
      setShowInventory(false);
      return;
    }

    // 4. Vô Cực Đan (Cộng Dồn Không Phụ Thuộc Cấp Bậc)
    if (itemId === 'pill_vo_cuc') {
      const duration = cfg.buffDurationMs || 600_000;
      setVoCucBuffExpiry(Date.now() + duration);
      setInventory(prev => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] || 1) - 1) }));
      setTotalPillsConsumed(prev => prev + 1);
      setState('dance');
      setFrame(0);
      setBubbleText(`☯️ [Vô Cực Đan] KÍCH HOẠT! +20% Tỉ lệ Đột Phá & +20% Rèn Bằng Pháp Bảo (CỘNG DỒN CHÍ TÔN)! ✨`);
      setShowInventory(false);
      return;
    }

    if (cfg.isForgeBooster) {
      setSelectedForgeBooster(itemId as ForgeBoosterId);
      setModalTab('treasures');
      setShowCostumePicker(true);
      setShowInventory(false);
      setBubbleText(
        `${cfg.emoji} Đã kích hoạt [${cfg.name}] cho lần rèn Pháp Bảo kế tiếp (+${Math.round(
          (cfg.forgeSuccessBonus || 0.20) * 100
        )}% TC)! 🔨✨`
      );
      return;
    }

    setInventory(prev => ({ ...prev, [itemId]: Math.max(0, (prev[itemId] || 1) - 1) }));
    setTotalPillsConsumed(prev => prev + 1);
    setState('eat');
    setFrame(0);
    addXP(cfg.xpValue);

    const now = Date.now();
    setPillSpreeTimes(prev => {
      const recent = [...prev, now].filter(t => now - t <= 10000);
      if (recent.length >= 5) unlockAchievement('secret_pill_spree');
      return recent;
    });
    if (itemId === 'great') unlockAchievement('secret_first_great_pill');

    const msgs: Record<string, string[]> = {
      basic: [`💊 Cắn Tụ Linh Đan! Linh lực dâng trào~ (+${cfg.xpValue} XP)`, `💊 Tinh hoa Tụ Linh thấm vào đan điền! (+${cfg.xpValue} XP)`],
      recover: [`🍃 Hồi Phục Đan tan chảy! Chân khí phục hồi~ (+${cfg.xpValue} XP)`, `🍃 Thuần thanh linh khí dâng trào! (+${cfg.xpValue} XP)`],
      great: [`🌸 Đại Hoàn Đan! Linh lực cuồn cuộn! (+${cfg.xpValue} XP)`, `🌸 Cổ Thần Đan! Khí tức như sấm dậy! (+${cfg.xpValue} XP)`]
    };
    const pool = msgs[itemId] ?? [`${cfg.emoji} Cắn đan [${cfg.name}]! (+${cfg.xpValue} XP)`];
    setBubbleText(pool[Math.floor(Math.random() * pool.length)]);
  };

  const handleBreakthroughOrKiep = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!nextLevelInfo) return;
    const target = nextLevelInfo;

    if (isTribulationLevel) {
      setIsLevelUpAnim(true);
      triggerGentleHop();
      setBubbleText(`🌩️ OÀNGGG! Cửu Trùng Thiên Kiếp Sấm Sét giáng xuống! Thỏ đang chống chịu...`);
      const success = Math.random() < effectiveSuccessRate;

      setTimeout(() => {
        setIsLevelUpAnim(false);
        if (success) {
          setXp(target.reqXp);
          setActiveSkin(target.skinId);
          setActiveTreasureId(target.treasureId);
          setFailCountAtCurrentLevel(0);
          setBreakthroughSuccessCount(c => c + 1);
          setState('dance');
          setFrame(0);
          setBubbleText(`🎉 ĐỘ KIẾP THÀNH CÔNG! Bổn Thỏ thăng hoa lên [${target.name}]! ⚡✨`);
          if (isTalismanActive || isRealmPillActive || isReviveActive) unlockAchievement('secret_talisman_kiep');
          grantItem('great', 1, `🎁 Độ Kiếp đắc đạo! Nhận thưởng +1 🌸 Đại Hoàn Đan!`);
        } else {
          setFailCountAtCurrentLevel(f => f + 1);
          setBreakthroughFailCount(f => f + 1);
          unlockAchievement('secret_fail_kiep');
          const lossPercent = isReviveActive ? 0 : 0.15;
          const currentProgress = xp - prevReq;
          const lostXp = Math.floor(currentProgress * lossPercent);
          setXp(Math.max(prevReq, xp - lostXp));
          setState('sleep');
          setFrame(0);
          setBubbleText(
            isReviveActive
              ? `🌩️ THIÊN KIẾP DẬY SÓNG! Độ Kiếp thất bại nhưng CỬU CHUYỂN HOÀN HỒN ĐAN BẢO VỆ 100% KHÔNG MẤT XP! (+5% may mắn lần sau) 🔮`
              : `🌩️ THIÊN KIẾP ĐÁNH RƠI! Độ Kiếp thất bại! Mất ${lostXp} XP. Tích lũy thêm +5% may mắn lần sau! 😢`
          );
        }
      }, 3000);
    } else {
      setXp(target.reqXp);
      setActiveSkin(target.skinId);
      setActiveTreasureId(target.treasureId);
      setFailCountAtCurrentLevel(0);
      setState('dance');
      setFrame(0);
      setBubbleText(`✨ ĐỘT PHÁ THÀNH CÔNG! Bổn Thỏ đạt [${target.name}]! 🐰🎉`);
      grantItem('basic', 2, `🎁 Đột phá đắc đạo! Nhận +2 💊 Tụ Linh Đan!`);
    }
  };

  // Idle minute loop: +10 Spirit Stones & Herb/Mineral Drops & XP
  useEffect(() => {
    const id = setInterval(() => {
      setTotalMinutes(m => m + 1);
      addSpiritStones(10);
      const afkXp = Math.max(10, Math.round(currentLevelGap * 0.001));
      addXP(afkXp);

      const roll = Math.random();
      if (roll < 0.55) {
        const randomFood = FOOD_CONFIG[Math.floor(Math.random() * FOOD_CONFIG.length)];
        const qty = Math.random() < 0.3 ? 2 : 1;
        setHerbsInventory(prev => ({ ...prev, [randomFood.id]: (prev[randomFood.id] || 0) + qty }));
        setBubbleText(`🍲 Bế quan kỳ ngộ! Thu hoạch: ${randomFood.emoji} ${randomFood.name} x${qty}! ✨ (+${formatNumber(afkXp)} XP & +10 💎)`);
      } else {
        const pickedHerb = HERB_CONFIG[Math.floor(Math.random() * HERB_CONFIG.length)];
        const qty = Math.random() < 0.2 ? 2 : 1;
        setHerbsInventory(prev => ({ ...prev, [pickedHerb.id]: (prev[pickedHerb.id] || 0) + qty }));
        setBubbleText(`🌿 Bế quan kỳ ngộ! Thu hoạch: ${pickedHerb.emoji} ${pickedHerb.name} x${qty}! ✨ (+${formatNumber(afkXp)} XP & +10 💎)`);
      }
    }, 60_000);
    return () => clearInterval(id);
  }, [currentLevelGap]);

  // Deploy Reaction Engine (+50 Spirit Stones per deploy)
  const wasDeployingRef = useRef(false);
  useEffect(() => {
    const deployList = activeDeployServices && activeDeployServices.length > 0
      ? activeDeployServices
      : selectedService
      ? [selectedService]
      : [];
    const deployCount = Math.max(1, deployList.length);

    if (isDeploying && !wasDeployingRef.current) {
      wasDeployingRef.current = true;
      setDirection('left');
      setState('run_left');
      const baseDeployXp = Math.max(50, Math.round(currentLevelGap * 0.02));
      const totalDeployXp = baseDeployXp * deployCount;
      if (deployCount > 1) {
        addXP(totalDeployXp, `🚀 Vạn Kiếm Quy Tông! Thần tốc deploy ${deployCount} microservices (+${formatNumber(totalDeployXp)} XP)`);
      } else {
        addXP(totalDeployXp, `🚀 Phân Thần Thuật! Thần tốc deploy ${deployList[0] || 'Service'} (+${formatNumber(totalDeployXp)} XP)`);
      }
    } else if (!isDeploying && wasDeployingRef.current) {
      wasDeployingRef.current = false;
      setState('dance');
      setTotalDeploys(d => d + deployCount);
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
          if (prevX <= 6) {
            setDirection('right');
            setState(state.startsWith('run') ? 'run_right' : 'walk_right');
            return 6.5;
          }
          return prevX - step;
        } else {
          if (prevX >= 92) {
            setDirection('left');
            setState(state.startsWith('run') ? 'run_left' : 'walk_left');
            return 91.5;
          }
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
        if (r < 0.35) {
          setState(randomDir === 'left' ? 'walk_left' : 'walk_right');
          setBubbleText('🐰 Tuần du sơn thủy, tìm Linh Thảo...');
          tid = setTimeout(next, Math.random() * 6000 + 8000);
        } else if (r < 0.55) {
          setState(randomDir === 'left' ? 'run_left' : 'run_right');
          setBubbleText('⚡ Thăng hoa thần tốc, tuần tra vạn giới!');
          tid = setTimeout(next, Math.random() * 4000 + 4000);
        } else if (r < 0.70) {
          setState('sleep');
          const sleepXp = Math.max(5, Math.round(currentLevelGap * 0.0005));
          addXP(sleepXp);
          setBubbleText(`🧘 Tọa thiền bế quan... Khô Thiền Cảnh (+${formatNumber(sleepXp)} XP)... Zzz`);
          tid = setTimeout(next, Math.random() * 8000 + 10000);
        } else if (r < 0.85) {
          setState('eat');
          setBubbleText('🐰 Nhặt được Linh Dược ven đường!');
          tid = setTimeout(next, Math.random() * 4000 + 5000);
        } else {
          setState(randomDir === 'left' ? 'jump_left' : 'jump_right');
          setBubbleText('⚔️ Ngự kiếm phi hành!');
          tid = setTimeout(next, 4000);
        }
      } else if (state.startsWith('walk') || state.startsWith('run')) {
        if (r < 0.4) {
          setState('idle');
          setBubbleText('🐰 Ngưng thần dưỡng khí...');
          tid = setTimeout(next, Math.random() * 4000 + 4000);
        } else if (r < 0.7) {
          setState(randomDir === 'left' ? 'jump_left' : 'jump_right');
          setBubbleText('🚀 Nhảy vút qua Thiên Hà!');
          tid = setTimeout(next, 4000);
        } else {
          setState('eat');
          setBubbleText('🐰 Nhặt được Linh Dược!');
          tid = setTimeout(next, 5000);
        }
      } else if (state === 'sleep') {
        if (r < 0.6) {
          setState('idle');
          setBubbleText('🥱 Xuất quan! Thu hoạch linh khí xong...');
          tid = setTimeout(next, 4000);
        } else {
          setState('eat');
          setBubbleText('💊 Xuất quan đói bụng!');
          tid = setTimeout(next, 5000);
        }
      } else {
        setState('idle');
        setBubbleText('🐰 Quan sát thiên địa...');
        tid = setTimeout(next, Math.random() * 3000 + 4000);
      }
      setFrame(0);
    };
    tid = setTimeout(next, 5000);
    return () => clearTimeout(tid);
  }, [isDeploying, isDismissed, isDragging, state]);

  // Pointer Interaction (+5 Spirit Stones per drag + Mount Bonus XP)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    let dragged = false;
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
        dragged = true;
        setIsDragging(true);
        const initialDir = stepX < 0 ? 'left' : directionRef.current;
        setDirection(initialDir);
        setState(initialDir === 'left' ? 'walk_left' : 'walk_right');
        const mountName = activeMountConfig ? activeMountConfig.name : 'Bổn Thỏ';
        setBubbleText(`🎈 Cưỡi ${mountName}! Đại nhân bế Thỏ phi hành...`);
      }
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
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (dragged) {
        setIsDragging(false);
        triggerGentleHop();
        const newDrags = totalDrags + 1;
        setTotalDrags(newDrags);

        const now = Date.now();
        const elapsedRide = now - lastRideRewardTime;
        const RIDE_COOLDOWN_MS = 60 * 1000; // 60s CD

        if (elapsedRide >= RIDE_COOLDOWN_MS) {
          setLastRideRewardTime(now);
          addSpiritStones(5);
          const baseDragXp = Math.max(15, Math.round(currentLevelGap * 0.003));
          const mountBonusPercent = activeMountConfig ? activeMountConfig.dragXpBonus : 0;
          const totalEarnedXp = Math.round(baseDragXp * (1 + mountBonusPercent / 100));
          addXP(totalEarnedXp, `🎉 Đáp đất an toàn cùng ${activeMountConfig?.name ?? 'Thỏ'}! (+${formatNumber(totalEarnedXp)} XP & +5 💎)`);

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
          const randomFood = FOOD_CONFIG[Math.floor(Math.random() * FOOD_CONFIG.length)];
          setHerbsInventory(prev => ({ ...prev, [randomFood.id]: (prev[randomFood.id] || 0) + 1 }));
          const petXp = Math.max(20, Math.round(currentLevelGap * 0.002));
          addXP(petXp, `🥰 Vuốt ve Thỏ Tiên! (+${formatNumber(petXp)} XP, +15 💎 Linh Thạch & nhận ${randomFood.emoji} ${randomFood.name} x1)`);
        } else {
          const remSec = Math.ceil((PET_COOLDOWN_MS - elapsed) / 1000);
          const min = Math.floor(remSec / 60);
          const sec = remSec % 60;
          setBubbleText(`🥰 Vuốt ve sướng quá nhảy múa! ⏱️ Hồi quà vuốt ve sau ${min}p${sec}s`);
        }
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (isDismissed) return null;

  const bgX = -(frame * MASCOT_SIZE);

  const getVerticalOffset = () => {
    if (isDragging) return 0;
    if (state.startsWith('jump')) return [0, -20, -42, -62, -75, -70, -50, -28, -10, 0][frame % 10];
    if (state.startsWith('walk') || state.startsWith('run')) return [0, -2, -4, -2, 0, -2, -4, -2, 0, 0][frame % 10];
    if (state === 'idle') return [0, -1, -3, -1][frame % 4];
    return 0;
  };
  const currentOffsetY = getVerticalOffset();

  return (
    <>
      {isLevelUpAnim && (
        <>
          <LightningCanvas bunnyX={posX} bunnyY={posYBottom} />
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none flex flex-col items-center gap-2">
            <div
              style={{
                background: 'rgba(0,0,0,0.92)',
                border: '2px solid #f59e0b',
                padding: '14px 24px',
                borderRadius: '16px',
                boxShadow: '0 0 60px rgba(245,158,11,0.9)',
                textAlign: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>⚡</span>
                <div>
                  <div
                    style={{
                      color: '#fbbf24',
                      fontWeight: 900,
                      fontSize: '17px',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase'
                    }}
                  >
                    🌩️ CỬU TRÙNG THIÊN KIẾP SẤM SÉT 🌩️
                  </div>
                  <div style={{ color: '#fde68a', fontWeight: 600, fontSize: '12px', marginTop: '2px' }}>
                    Bổn Thỏ đang chống chịu lôi đình đột phá {nextLevelInfo?.name ?? currentLevelInfo.name}!
                  </div>
                </div>
                <span style={{ fontSize: '28px' }}>⚡</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── ALCHEMY CRAFTING ANIMATION MODAL ── */}
      <CraftingModal
        isOpen={isCraftingAnim}
        activeRecipe={activeCraftingRecipe}
        result={craftingResult}
        onClose={() => {
          setIsCraftingAnim(false);
          setCraftingResult(null);
        }}
      />

      {/* ── THUNDER ANVIL FORGING ANIMATION MODAL ── */}
      <ForgingModal
        isOpen={isForgingAnim}
        treasureId={activeForgingTreasureId}
        treasureLevels={treasureLevels}
        activeBooster={activeForgingBooster}
        result={forgingResult}
        onClose={() => {
          setIsForgingAnim(false);
          setForgingResult(null);
        }}
      />

      {/* ── Bunny + Bubble ── */}
      <div
        className={`mascot-root fixed z-[95] flex flex-col items-center select-none ${
          isDragging ? 'cursor-grabbing transition-none' : 'cursor-grab transition-all duration-300 ease-linear'
        }`}
        style={{ left: `${posX}%`, bottom: `${posYBottom}px`, transform: 'translateX(-50%)' }}
        onPointerDown={handlePointerDown}
      >
        <SpeechBubble
          bubbleText={bubbleText}
          currentLevelInfo={currentLevelInfo}
          xp={xp}
          prevReq={prevReq}
          nextReq={nextReq}
          progressPercent={progressPercent}
          isReadyToBreakthrough={isReadyToBreakthrough}
          isTribulationLevel={isTribulationLevel}
          currentSuccessRatePercent={currentSuccessRatePercent}
          failCountAtCurrentLevel={failCountAtCurrentLevel}
          isTalismanActive={isTalismanActive}
          isRealmPillActive={isRealmPillActive}
          isReviveActive={isReviveActive}
          isVoCucActive={isVoCucActive}
          totalInventory={totalInventory}
          voiceControlNode={
            <VoiceCommandButton
              isListening={isListening}
              isProcessing={isProcessing}
              isSupported={isVoiceSupported}
              transcript={transcript}
              onToggleVoice={toggleVoiceCommand}
            />
          }
          onOpenCostumePicker={() => setShowCostumePicker(p => !p)}
          onBreakthrough={handleBreakthroughOrKiep}
          onToggleInventory={e => {
            e.stopPropagation();
            setShowInventory(p => !p);
          }}
          onDismiss={e => {
            e.stopPropagation();
            setIsDismissed(true);
          }}
        />

        <InventoryPanel
          isOpen={showInventory}
          inventory={inventory}
          herbsInventory={herbsInventory}
          spiritStones={spiritStones}
          selectedForgeBooster={selectedForgeBooster}
          isTalismanActive={isTalismanActive}
          talismanCountdown={talismanCountdown}
          activeRealmPillId={activeRealmPillId}
          realmPillExpiry={realmPillExpiry}
          reviveBuffExpiry={reviveBuffExpiry}
          voCucBuffExpiry={voCucBuffExpiry}
          activeMountId={activeMountId}
          isReadyToBreakthrough={isReadyToBreakthrough}
          onConsumePill={handleConsumePill}
          onFeedMount={handleFeedMount}
        />

        {/* ── Bunny Sprite + Orbiting Cultivation Treasure + Flying Mount ── */}
        <div
          className="mascot-sprite-box relative transition-transform duration-200 hover:scale-110 active:scale-95 flex items-center justify-center"
          style={{
            transform: `translateY(${currentOffsetY}px)`,
            width: `${MASCOT_SIZE}px`,
            height: `${MASCOT_SIZE}px`,
            backgroundColor: 'transparent'
          }}
          title="NHẤP CHUỘT để Vuốt Ve Thỏ 🐰 (+10 XP & +5 💎) | KÉO THẢ để bay cùng Thú Cưỡi 🐴"
        >
          {activeTreasureId && (
            <TreasureOrbit
              treasureId={activeTreasureId}
              treasureLevel={treasureLevels[activeTreasureId] || 1}
              isDeploying={isDeploying}
            />
          )}

          {activeMountId && isDragging && (
            <div
              style={{
                position: 'absolute',
                top: '32px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: -2,
                pointerEvents: 'none'
              }}
            >
              <AnimatedMountSprite mountId={activeMountId} size={92} direction={direction} />
            </div>
          )}

          {activeSkinInfo.skinId === 'god' && (
            <div className="absolute -top-2 -right-3 text-base z-10 animate-ping pointer-events-none">☯️</div>
          )}

          <div
            className={`bg-no-repeat ${
              activeMountId && isDragging
                ? ''
                : activeSkinInfo.skinId === 'dai_la' ||
                  activeSkinInfo.skinId === 'chan_tien' ||
                  activeSkinInfo.skinId === 'huyen_tien'
                ? 'mascot-body-aura-cyan'
                : activeSkinInfo.skinId === 'hon_nguyen'
                ? 'mascot-body-aura-purple'
                : activeSkinInfo.skinId === 'god'
                ? 'mascot-body-aura-god'
                : activeSkinInfo.skinId !== 'none'
                ? 'mascot-body-aura-golden'
                : ''
            }`}
            style={{
              width: `${MASCOT_SIZE}px`,
              height: `${MASCOT_SIZE}px`,
              flexShrink: 0,
              backgroundImage: `url(/skins/${activeSkinInfo?.level || 1}/${state || 'idle'}.png)`,
              backgroundSize: `${MASCOT_SIZE * 10}px ${MASCOT_SIZE}px`,
              backgroundPosition: `${bgX}px 0px`,
              backgroundRepeat: 'no-repeat',
              backgroundColor: 'transparent',
              imageRendering: 'pixelated'
            }}
          />
          {state === 'sleep' && (
            <div className="absolute -top-2 left-0 animate-bounce">
              <Moon style={{ width: '16px', height: '16px', color: '#f59e0b' }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Gacha Reward Toast Modal ── */}
      <GachaRewardModal rewards={recentGachaRewards} onClose={() => setRecentGachaRewards(null)} />

      {/* ── Floating Achievement Toast ── */}
      <AchievementToast achievement={recentAchievementToast} onClose={() => setRecentAchievementToast(null)} />

      {/* ── Costume, Treasure, Mount & Achievement Modal (4-Column Layout) ── */}
      {showCostumePicker && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden"
          style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)' }}
          onPointerDown={e => e.stopPropagation()}
        >
          <div
            style={{
              background: '#0b0f19',
              border: '1px solid rgba(245,158,11,0.45)',
              borderRadius: '22px',
              width: '96%',
              maxWidth: '1180px',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(245,158,11,0.25)',
              color: '#fff',
              position: 'relative',
              overflowX: 'hidden'
            }}
          >
            {/* Header Tabs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                borderBottom: '1px solid rgba(245,158,11,0.18)',
                paddingBottom: '14px',
                marginBottom: '16px',
                justifyContent: 'space-between',
                overflowX: 'hidden'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setModalTab('skins')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: modalTab === 'skins' ? 'rgba(245,158,11,0.22)' : 'transparent',
                    border: `1px solid ${modalTab === 'skins' ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: modalTab === 'skins' ? '#fde68a' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  <Crown style={{ width: '14px', height: '14px', color: modalTab === 'skins' ? '#f59e0b' : '#64748b' }} />
                  🥋 Thân Pháp ({LEVEL_CONFIG.filter(l => xp >= l.reqXp).length}/{LEVEL_CONFIG.length})
                </button>

                <button
                  onClick={() => setModalTab('treasures')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: modalTab === 'treasures' ? 'rgba(245,158,11,0.22)' : 'transparent',
                    border: `1px solid ${modalTab === 'treasures' ? '#38bdf8' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: modalTab === 'treasures' ? '#bae6fd' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  <Zap style={{ width: '14px', height: '14px', color: modalTab === 'treasures' ? '#38bdf8' : '#64748b' }} />
                  🔮 Pháp Bảo ({LEVEL_CONFIG.filter(l => xp >= l.reqXp).length}/{LEVEL_CONFIG.length})
                </button>

                <button
                  onClick={() => setModalTab('crafting')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: modalTab === 'crafting' ? 'rgba(245,158,11,0.22)' : 'transparent',
                    border: `1px solid ${modalTab === 'crafting' ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: modalTab === 'crafting' ? '#6ee7b7' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  <Sparkles style={{ width: '14px', height: '14px', color: modalTab === 'crafting' ? '#10b981' : '#64748b' }} />
                  🧪 Lò Luyện Đan
                </button>

                <button
                  onClick={() => setModalTab('market')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: modalTab === 'market' ? 'rgba(234,179,8,0.25)' : 'transparent',
                    border: `1px solid ${modalTab === 'market' ? '#fde047' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: modalTab === 'market' ? '#fde047' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  <ShoppingBag style={{ width: '14px', height: '14px', color: modalTab === 'market' ? '#fde047' : '#64748b' }} />
                  🏪 Phường Thị
                </button>

                <button
                  onClick={() => setModalTab('mounts')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: modalTab === 'mounts' ? 'rgba(245,158,11,0.22)' : 'transparent',
                    border: `1px solid ${modalTab === 'mounts' ? '#a855f7' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: modalTab === 'mounts' ? '#d8b4fe' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  <Compass style={{ width: '14px', height: '14px', color: modalTab === 'mounts' ? '#a855f7' : '#64748b' }} />
                  🐴 Thú Cưỡi ({ownedMounts.length}/10)
                </button>

                <button
                  onClick={() => setModalTab('achievements')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: modalTab === 'achievements' ? 'rgba(245,158,11,0.22)' : 'transparent',
                    border: `1px solid ${modalTab === 'achievements' ? '#f59e0b' : 'rgba(255,255,255,0.1)'}`,
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: modalTab === 'achievements' ? '#fde68a' : '#94a3b8',
                    cursor: 'pointer'
                  }}
                >
                  <Trophy style={{ width: '14px', height: '14px', color: modalTab === 'achievements' ? '#fbbf24' : '#64748b' }} />
                  🏆 Thành Tựu ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    background: 'rgba(56,189,248,0.15)',
                    border: '1px solid rgba(56,189,248,0.35)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#38bdf8'
                  }}
                >
                  💎 {spiritStones} Linh Thạch
                </div>
                <button
                  onClick={() => setShowCostumePicker(false)}
                  style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <X style={{ width: '18px', height: '18px' }} />
                </button>
              </div>
            </div>

            {/* Progress Card */}
            <div
              style={{
                background: 'rgba(22,31,51,0.9)',
                border: '1px solid rgba(245,158,11,0.28)',
                borderRadius: '14px',
                padding: '14px 18px',
                marginBottom: '16px',
                overflowX: 'hidden'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', overflow: 'hidden' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '56px',
                      height: '56px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <BunnySkinSprite level={activeSkinInfo.level} size={52} />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '-4px',
                        right: '-4px',
                        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
                      }}
                    >
                      <TreasureSprite treasureId={activeTreasureId} size={28} />
                    </div>
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: '15px',
                        color: '#fbbf24',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Lv.{currentLevel}: {currentLevelInfo.name}
                    </div>
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: '#94a3b8',
                        fontWeight: 600,
                        marginTop: '3px',
                        display: 'flex',
                        gap: '14px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <span>
                        🥋 Thân Pháp: <strong style={{ color: '#fde68a' }}>{activeSkinInfo.name}</strong>
                      </span>
                      <span>
                        🔮 Pháp Bảo: <strong style={{ color: '#38bdf8' }}>{activeTreasureInfo.skinName}</strong>{' '}
                        <span style={{ color: '#86efac', fontSize: '10.5px' }}>
                          (Cấp {treasureLevels[activeTreasureId] || 1}: +
                          {getTreasureExpBonusPercent(activeTreasureId, treasureLevels[activeTreasureId] || 1)}% EXP)
                        </span>
                      </span>
                      <span>
                        🐴 Thú Cưỡi:{' '}
                        <strong style={{ color: '#c084fc' }}>
                          {activeMountConfig ? `${activeMountConfig.emoji} ${activeMountConfig.name}` : 'Không'}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#f59e0b' }}>
                    {progressPercent.toFixed(0)}%
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {nextLevelInfo ? `${xp}/${nextLevelInfo.reqXp} XP` : 'TIÊN ĐẾ ĐỈNH CAO'}
                  </div>
                </div>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '10px',
                  background: 'rgba(30,41,59,0.8)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  border: '1px solid rgba(245,158,11,0.2)'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progressPercent}%`,
                    background: 'linear-gradient(90deg,#f59e0b,#a855f7,#22d3ee)',
                    borderRadius: '999px',
                    transition: 'width 0.5s ease'
                  }}
                />
              </div>
            </div>

            {/* TAB 1: Skins Grid */}
            {modalTab === 'skins' && (
              <SkinsTab
                xp={xp}
                activeSkin={activeSkin}
                onSelectSkin={(skinId, skinName) => {
                  setActiveSkin(skinId);
                  setShowCostumePicker(false);
                  setBubbleText(`✨ Đã thay Thân Pháp [${skinName}]! 🐰`);
                }}
              />
            )}

            {/* TAB 2: Treasures Grid */}
            {modalTab === 'treasures' && (
              <TreasuresTab
                xp={xp}
                activeTreasureId={activeTreasureId}
                treasureLevels={treasureLevels}
                spiritStones={spiritStones}
                inventory={inventory}
                effectiveBoosterId={effectiveBoosterId}
                boosterBonusRate={boosterBonusRate}
                onSelectBooster={setSelectedForgeBooster}
                onSelectTreasure={(treasureId, name, bonus) => {
                  setActiveTreasureId(treasureId);
                  setBubbleText(`✨ Đã ngự [${name}]! Nhận buff +${bonus}% EXP 🔮`);
                }}
                onUpgradeTreasure={handleUpgradeTreasure}
                onSwitchToCrafting={() => setModalTab('crafting')}
              />
            )}

            {/* TAB 3: Lò Luyện Đan Bát Quái */}
            {modalTab === 'crafting' && (
              <CraftingTab
                spiritStones={spiritStones}
                inventory={inventory}
                herbsInventory={herbsInventory}
                onCraftPill={handleCraftPill}
              />
            )}

            {/* TAB 4: Phường Thị Tu Chân (Market) */}
            {modalTab === 'market' && (
              <MarketTab
                spiritStones={spiritStones}
                herbsInventory={herbsInventory}
                inventory={inventory}
                onBuyMaterial={handleBuyMaterial}
                onSellMaterial={handleSellMaterial}
                onBuyItem={handleBuyItem}
                onSellItem={handleSellItem}
              />
            )}

            {/* TAB 5: Mounts Gacha & Collection & Nurturing */}
            {modalTab === 'mounts' && (
              <MountsTab
                ownedMounts={ownedMounts}
                activeMountId={activeMountId}
                gachaSpinCount={gachaSpinCount}
                mountLevels={mountLevels}
                mountExp={mountExp}
                herbsInventory={herbsInventory}
                spiritStones={spiritStones}
                onSpinGacha={handleSpinGacha}
                onToggleMount={(mountId, name) => {
                  if (activeMountId === mountId) {
                    setActiveMountId(null);
                    setBubbleText(`✨ Đã tháo Thú Cưỡi! 🐰`);
                  } else {
                    setActiveMountId(mountId);
                    setShowCostumePicker(false);
                    setBubbleText(`✨ Đã cưỡi Thần Thú [${name}] phi hành! 🐴✨`);
                  }
                }}
                onFeedMount={handleFeedMount}
              />
            )}

            {/* TAB 5: Achievements Grid */}
            {modalTab === 'achievements' && (
              <AchievementsTab
                unlockedAchievements={unlockedAchievements}
                searchQuery={achSearchQuery}
                categoryFilter={achCategoryFilter}
                onSearchChange={setAchSearchQuery}
                onCategoryFilterChange={setAchCategoryFilter}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
};
