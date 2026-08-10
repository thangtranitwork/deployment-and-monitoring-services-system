import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Heart, Moon, X, Crown, Shield, Award, Zap, ChevronUp, Lock, Check } from 'lucide-react';

interface BunnyMascotProps {
  isDeploying?: boolean;
  selectedService?: string;
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

export const LEVEL_CONFIG: LevelInfo[] = [
  // Phase 1: Phàm Nhân Tu Tiên (Hạ Giới)
  { level: 1, name: 'Luyện Khí Kỳ 🌫️', reqXp: 0, skinId: 'none', skinName: 'Thỏ Phàm Nhân', emoji: '🐰' },
  { level: 2, name: 'Trúc Cơ Kỳ 🧘', reqXp: 40, skinId: 'grad_cap', skinName: 'Bồ Đoàn Tụ Linh', emoji: '🧘' },
  { level: 3, name: 'Kim Đan Kỳ 🔮', reqXp: 100, skinId: 'cap', skinName: 'Kim Đan Phù Chú', emoji: '🔮' },
  { level: 4, name: 'Nguyên Anh Kỳ 👶', reqXp: 200, skinId: 'helmet', skinName: 'Hào Quang Nguyên Anh', emoji: '👶' },
  { level: 5, name: 'Hóa Thần Kỳ ⚡', reqXp: 350, skinId: 'astro', skinName: 'Linh Phù Hóa Thần', emoji: '⚡' },
  { level: 6, name: 'Luyện Hư Kỳ 🪐', reqXp: 550, skinId: 'glasses', skinName: 'Linh Chu Vũ Trụ', emoji: '🪐' },
  { level: 7, name: 'Hợp Thể Kỳ ⚔️', reqXp: 800, skinId: 'ninja', skinName: 'Phi Kiếm Trảm Tiên', emoji: '⚔️' },
  { level: 8, name: 'Đại Thừa Kỳ ☯️', reqXp: 1100, skinId: 'crown', skinName: 'Bát Quái Kính', emoji: '☯️' },
  { level: 9, name: 'Độ Kiếp Kỳ 🌩️', reqXp: 1500, skinId: 'aura', skinName: 'Mũ Tiên Vương', emoji: '👑🌩️' },

  // Phase 2: Tiên Giới Phi Thăng (Thượng Giới)
  { level: 10, name: 'Chân Tiên 🌟', reqXp: 2000, skinId: 'chan_tien', skinName: 'Bồ Đề Tiên Thần', emoji: '🎓🌟' },
  { level: 11, name: 'Huyền Tiên 🔮', reqXp: 2600, skinId: 'huyen_tien', skinName: 'Pháp Tắc Khí Huấn', emoji: '🕶️🔮' },
  { level: 12, name: 'Kim Tiên 👑', reqXp: 3300, skinId: 'kim_tien', skinName: 'Vương Miện Kim Tiên', emoji: '👑✨' },
  { level: 13, name: 'Thái Ất Ngọc Tiên 💎', reqXp: 4100, skinId: 'ngoc_tien', skinName: 'Ngọc Bích Pháp Bảo', emoji: '💎' },
  { level: 14, name: 'Thái Ất Kim Tiên ⚡', reqXp: 5000, skinId: 'thai_at', skinName: 'Lôi Đình Thần Phù', emoji: '⚡🪖' },
  { level: 15, name: 'Đại La Kim Tiên 🌌', reqXp: 6000, skinId: 'dai_la', skinName: 'Vạn Giới Hào Quang', emoji: '🌌👑' },
  { level: 16, name: 'Hỗn Nguyên Đại La 🌌✨', reqXp: 7200, skinId: 'hon_nguyen', skinName: 'Vũ Trụ Trận Pháp', emoji: '🌌✨' },
  { level: 17, name: 'Thánh Nhân (Tiên Đế) 👑⚡', reqXp: 8500, skinId: 'god', skinName: 'Chân Thể Tiên Đế Vô Cực', emoji: '👑⚡☯️' }
];

// Calculate Tribulation Success Rate based on level: Cảnh giới càng cao tỉ lệ thất bại càng cao!
// Level 2 (Trúc Cơ -> Kim Đan): 85% success
// Level 9 (Độ Kiếp -> Chân Tiên): 53% success
// Level 16 (Hỗn Nguyên -> Tiên Đế): 22% success
export const getSuccessRate = (level: number): number => {
  const baseSuccess = 90 - (level - 2) * 4.5;
  return Math.max(0.20, Math.min(0.85, baseSuccess / 100));
};

const BUNNY_STORAGE_KEY = 'ids_bunny_progress_v1';

// Real Procedural Full-Screen Lightning Strike Canvas Component
interface LightningCanvasProps {
  bunnyX: number;
  bunnyY: number;
}

const LightningCanvas: React.FC<LightningCanvasProps> = ({ bunnyX, bunnyY }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const targetX = (bunnyX / 100) * width;
    const targetY = height - bunnyY - 25;

    const createBolt = (x1: number, y1: number, x2: number, y2: number, roughness: number) => {
      const points: { x: number; y: number }[] = [{ x: x1, y: y1 }];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const distance = Math.hypot(dx, dy);
      const steps = Math.max(8, Math.floor(distance / 25));

      for (let i = 1; i < steps; i++) {
        const ratio = i / steps;
        const currentX = x1 + dx * ratio + (Math.random() - 0.5) * roughness * 30;
        const currentY = y1 + dy * ratio + (Math.random() - 0.5) * roughness * 12;
        points.push({ x: currentX, y: currentY });
      }
      points.push({ x: x2, y: y2 });
      return points;
    };

    let flashAlpha = 0;
    let lastStrikeTime = 0;
    let currentBolts: { points: { x: number; y: number }[]; isMain: boolean }[] = [];

    const render = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Trigger lightning strikes every 120ms - 220ms
      if (time - lastStrikeTime > 130 + Math.random() * 120) {
        lastStrikeTime = time;
        flashAlpha = 0.4;

        currentBolts = [];
        const mainStartX = targetX + (Math.random() - 0.5) * (width * 0.4);
        const mainPoints = createBolt(mainStartX, 0, targetX, targetY, 1.8);
        currentBolts.push({ points: mainPoints, isMain: true });

        // Extra side strikes
        for (let i = 1; i < mainPoints.length - 2; i += 2) {
          if (Math.random() > 0.35) {
            const startPt = mainPoints[i];
            const branchEndX = startPt.x + (Math.random() - 0.5) * 280;
            const branchEndY = startPt.y + Math.random() * 220 + 60;
            const branchPoints = createBolt(startPt.x, startPt.y, branchEndX, branchEndY, 1.4);
            currentBolts.push({ points: branchPoints, isMain: false });
          }
        }
      }

      // 1. Draw Screen Flash Background
      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 235, ${flashAlpha})`;
        ctx.fillRect(0, 0, width, height);
        flashAlpha *= 0.82;
      }

      // 2. Draw Procedural Lightning Bolts with Glow
      currentBolts.forEach(bolt => {
        if (bolt.points.length < 2) return;

        // Pass A: Outer Glow
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) {
          ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        }
        ctx.strokeStyle = bolt.isMain ? 'rgba(245, 158, 11, 0.6)' : 'rgba(192, 132, 252, 0.5)';
        ctx.lineWidth = bolt.isMain ? 16 : 8;
        ctx.shadowColor = bolt.isMain ? '#f59e0b' : '#c084fc';
        ctx.shadowBlur = 35;
        ctx.stroke();

        // Pass B: Bright Golden Core
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) {
          ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        }
        ctx.strokeStyle = bolt.isMain ? '#fde047' : '#f0abfc';
        ctx.lineWidth = bolt.isMain ? 6 : 3;
        ctx.shadowBlur = 15;
        ctx.stroke();

        // Pass C: Pure White Center Spark
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) {
          ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        }
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = bolt.isMain ? 3 : 1.5;
        ctx.shadowBlur = 0;
        ctx.stroke();
      });

      // 3. Ground Shockwave Aura around Bunny
      ctx.save();
      ctx.beginPath();
      ctx.arc(targetX, targetY, 42 + Math.random() * 18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.8)';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 25;
      ctx.stroke();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [bunnyX, bunnyY]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[999] pointer-events-none w-full h-full"
    />
  );
};

export const BunnyMascot: React.FC<BunnyMascotProps> = ({
  isDeploying = false,
  selectedService = ''
}) => {
  // Progression State
  const [xp, setXp] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(BUNNY_STORAGE_KEY);
      if (saved) return JSON.parse(saved).xp || 0;
    } catch (e) {}
    return 0;
  });

  const [activeSkin, setActiveSkin] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(BUNNY_STORAGE_KEY);
      if (saved) return JSON.parse(saved).activeSkin || 'none';
    } catch (e) {}
    return 'none';
  });

  const [pillsEaten, setPillsEaten] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(BUNNY_STORAGE_KEY);
      if (saved) return JSON.parse(saved).pillsEaten || JSON.parse(saved).carrotsEaten || 0;
    } catch (e) {}
    return 0;
  });

  const [isLevelUpAnim, setIsLevelUpAnim] = useState<boolean>(false);
  const [showCostumePicker, setShowCostumePicker] = useState<boolean>(false);

  // Mascot Animations State
  const [state, setState] = useState<BunnyState>('idle');
  const [frame, setFrame] = useState<number>(0);
  const [posX, setPosX] = useState<number>(82);
  const [posYBottom, setPosYBottom] = useState<number>(12);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [bubbleText, setBubbleText] = useState<string>('Bổn Thỏ xin chào Chân Tiên! 🐰');
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  // Drag & Drop State
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initPosX: number; initPosY: number }>({
    startX: 0,
    startY: 0,
    initPosX: 82,
    initPosY: 12
  });

  const directionRef = useRef<'left' | 'right'>('left');
  directionRef.current = direction;

  // Compute Current Level & Next Level
  const currentLevelInfo = LEVEL_CONFIG.slice().reverse().find(lvl => xp >= lvl.reqXp) || LEVEL_CONFIG[0];
  const currentLevel = currentLevelInfo.level;
  const nextLevelInfo = LEVEL_CONFIG.find(lvl => lvl.level === currentLevel + 1);

  // Require EVERY level up (starting from Level 1 -> Level 2 onwards) to be manually triggered!
  const isReadyToBreakthrough = Boolean(
    nextLevelInfo && xp >= nextLevelInfo.reqXp - 1
  );
  // Level 1 -> Level 2 (Luyện Khí -> Trúc Cơ) is ĐỘT PHÁ (Breakthrough). Level 2+ requires 🌩️ ĐỘ KIẾP (Thunder Tribulation)!
  const isTribulationLevel = currentLevel >= 2;

  // Save Progression to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(BUNNY_STORAGE_KEY, JSON.stringify({
        xp,
        activeSkin,
        pillsEaten
      }));
    } catch (e) {}
  }, [xp, activeSkin, pillsEaten]);

  // Gentle Single Hop Helper
  const triggerGentleHop = () => {
    setState('jump_right');
    setFrame(0);
    setTimeout(() => {
      setState('idle');
    }, 1200);
  };

  // XP Add Helper with Strict Manual Lock (No level up ever happens automatically!)
  const addXP = (amount: number, reasonText?: string) => {
    setXp(prevXp => {
      let newXp = prevXp + amount;
      const prevLvl = (LEVEL_CONFIG.slice().reverse().find(lvl => prevXp >= lvl.reqXp) || LEVEL_CONFIG[0]).level;
      const nextLvlInfo = LEVEL_CONFIG.find(lvl => lvl.level === prevLvl + 1);

      // STRICT LOCK: Cap XP at reqXp - 1 until user manually clicks button!
      if (nextLvlInfo && newXp >= nextLvlInfo.reqXp) {
        newXp = nextLvlInfo.reqXp - 1;
        if (prevLvl === 1) {
          setBubbleText(`✨ Linh lực dạt dào! Bổn Thỏ đã sẵn sàng ĐỘT PHÁ lên [${nextLvlInfo.name}]!`);
        } else {
          const ratePercent = Math.round(getSuccessRate(prevLvl) * 100);
          setBubbleText(`🌩️ Linh lực dạt dào! Bổn Thỏ sẵn sàng ĐỘ KIẾP [${nextLvlInfo.name}] (Thành công: ${ratePercent}%)!`);
        }
        return newXp;
      }

      if (reasonText) {
        setBubbleText(`${reasonText} (+${amount} Linh Lực)`);
      }

      return newXp;
    });
  };

  // Manual User Trigger for Breakthrough (Level 1 -> 2) OR Thunder Tribulation with Dynamic Success Rate (Level 2+)
  const handleBreakthroughOrKiep = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!nextLevelInfo) return;

    const targetLevel = nextLevelInfo;

    if (isTribulationLevel) {
      // Thunder Tribulation with Canvas Lightning Strike & Dynamic Success Rate
      setIsLevelUpAnim(true);
      triggerGentleHop();
      setBubbleText(`🌩️ OÀNGGG! Cửu Trùng Thiên Kiếp Sấm Sét giáng xuống! Thỏ đang chống chịu...`);

      const rateRatio = getSuccessRate(currentLevel);
      const isSuccess = Math.random() < rateRatio;

      setTimeout(() => {
        setIsLevelUpAnim(false);

        if (isSuccess) {
          // SUCCESS! Level up to new realm!
          setXp(targetLevel.reqXp + 1);
          setActiveSkin(targetLevel.skinId);
          triggerGentleHop();

          if (targetLevel.level === 10) {
            setBubbleText(`✨ PHI THĂNG TIÊN GIỚI THÀNH CÔNG! Thỏ đã đắc đạo Chân Tiên 🌟!`);
          } else {
            setBubbleText(`✨ ĐỘ KIẾP THÀNH CÔNG! Thỏ đã kiên cường vượt lôi đình, đột phá [${targetLevel.name}]!`);
          }
        } else {
          // FAILURE! Deduct 10% of current realm gap!
          const currentReq = currentLevelInfo.reqXp;
          const nextReq = targetLevel.reqXp;
          const realmGap = nextReq - currentReq;
          const penalty = Math.round(realmGap * 0.10);

          setXp(prev => Math.max(currentReq, prev - penalty));
          setState('sleep'); // Bunny gets knocked down to sleep state to recover

          setBubbleText(
            `😿 ĐỘ KIẾP THẤT BẠI! Thiên Kiếp quá hung hãn, Thỏ bị tổn hại 10% Linh Lực (-${penalty} XP)! Cắn đan nạp lại nhé 💊!`
          );
        }
      }, 3200);
    } else {
      // Gentle Breakthrough for Luyện Khí -> Trúc Cơ (100% Success, No Lightning Strike)
      triggerGentleHop();
      setXp(targetLevel.reqXp + 1);
      setActiveSkin(targetLevel.skinId);
      setBubbleText(`✨ ĐỘT PHÁ THÀNH CÔNG! Bổn Thỏ đã khai phá đan điền, bước vào Trúc Cơ Kỳ 🧘!`);
    }
  };

  // Row Y offsets in 10x10 grid (each cell is 50px x 50px)
  const stateRowY: Record<BunnyState, number> = {
    idle: 0,
    walk_right: 50,
    walk_left: 100,
    jump_right: 150,
    jump_left: 200,
    sleep: 250,
    eat: 300,
    run_right: 350,
    run_left: 400,
    dance: 450
  };

  // 110ms Frame Animation Ticker
  useEffect(() => {
    const speed = state.startsWith('run') ? 75 : state.startsWith('walk') ? 110 : 130;

    const timer = setInterval(() => {
      setFrame(prev => (prev + 1) % 10);
    }, speed);

    return () => clearInterval(timer);
  }, [state]);

  // Gentle & Relaxed Walking Position Updater
  useEffect(() => {
    if (isDragging || (!state.startsWith('walk') && !state.startsWith('run'))) return;

    const walkInterval = setInterval(() => {
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

    return () => clearInterval(walkInterval);
  }, [state, direction, isDragging]);

  // Reaction to deploying state (+25 Linh Lực for spell invocation)
  const wasDeployingRef = useRef(false);
  useEffect(() => {
    if (isDeploying && !wasDeployingRef.current) {
      wasDeployingRef.current = true;
      setDirection('left');
      setState('run_left');
      addXP(25, `🚀 Phân Thần Thuật! Thần tốc deploy ${selectedService || 'Service'}`);
    } else if (!isDeploying && wasDeployingRef.current) {
      wasDeployingRef.current = false;
      setState('idle');
      addXP(20, `✨ Công Đức Vô Lượng! Deploy thành công`);
    }
  }, [isDeploying, selectedService]);

  // Idle Meditation XP Ticker: Grant +1 Linh Lực (XP) every 1 minute of active web session
  useEffect(() => {
    const minuteXpInterval = setInterval(() => {
      addXP(1, '🧘 Hấp thu 1 phút Linh Khí Trời Đất');
    }, 60000);

    return () => clearInterval(minuteXpInterval);
  }, []);

  // Autonomous Natural Tu Tiên State Machine
  useEffect(() => {
    if (isDeploying || isDismissed || isDragging) return;

    let timeoutId: NodeJS.Timeout;

    const planNextAction = () => {
      let nextState: BunnyState = 'idle';
      let duration = 6000;

      const rand = Math.random();
      const currentDir = directionRef.current;

      if (state === 'idle') {
        if (rand < 0.45) {
          nextState = currentDir === 'left' ? 'walk_left' : 'walk_right';
          duration = Math.floor(Math.random() * 6000) + 8000;
          setBubbleText(currentDir === 'left' ? '🐰 Bổn Thỏ đi tuần du sơn thủy, tìm Linh Thảo...' : '🐰 Du ngoạn tìm kiếm linh khí...');
        } else if (rand < 0.65) {
          nextState = 'sleep';
          duration = Math.floor(Math.random() * 8000) + 10000;
          addXP(3);
          setBubbleText('🧘 Tọa thiền bế quan 100 năm... Khô Thiền Cảnh... Zzz');
        } else if (rand < 0.8) {
          nextState = 'eat';
          duration = Math.floor(Math.random() * 4000) + 5000;
          setBubbleText('💊 Nhai 1 viên Tụ Linh Đan, dạt dào linh khí!');
        } else {
          nextState = currentDir === 'left' ? 'jump_left' : 'jump_right';
          duration = 4000;

          const altitudes = [12, 45, 95, 140];
          const newAlt = altitudes[Math.floor(Math.random() * altitudes.length)];
          setPosYBottom(newAlt);

          setBubbleText(newAlt > 12 ? '⚔️ Ngự kiếm phi hành lên ngọn núi cao!' : '✨ Vạn Kiếm Quy Tông! Bật nhảy!');
        }
      } else if (state.startsWith('walk')) {
        if (rand < 0.5) {
          nextState = 'idle';
          duration = Math.floor(Math.random() * 4000) + 4000;
          setBubbleText('🐰 Bổn Thỏ đứng ngưng thần dưỡng khí...');
        } else if (rand < 0.75) {
          nextState = currentDir === 'left' ? 'jump_left' : 'jump_right';
          duration = 4000;

          const shouldChangeAlt = Math.random() > 0.5;
          if (shouldChangeAlt) {
            const altitudes = [12, 50, 110];
            setPosYBottom(altitudes[Math.floor(Math.random() * altitudes.length)]);
          }

          setBubbleText('🚀 Nhảy vút qua Thiên Hà!');
        } else {
          nextState = 'eat';
          duration = 5000;
          setBubbleText('💊 Nhặt được viên Tụ Linh Đan Cổ Tích!');
        }
      } else if (state === 'sleep') {
        if (rand < 0.6) {
          nextState = 'idle';
          duration = 4000;
          setBubbleText('🥱 Xuất quan! Thỏ vừa thu hoạch linh khí...');
        } else {
          nextState = 'eat';
          duration = 5000;
          setBubbleText('💊 Xuất quan đói bụng, cắn Linh Đan!');
        }
      } else {
        nextState = 'idle';
        duration = Math.floor(Math.random() * 3000) + 4000;
        setBubbleText('🐰 Bổn Thỏ đứng quan sát thiên địa...');
      }

      setState(nextState);
      setFrame(0);

      timeoutId = setTimeout(planNextAction, duration);
    };

    timeoutId = setTimeout(planNextAction, 5000);
    return () => clearTimeout(timeoutId);
  }, [isDeploying, isDismissed, isDragging, state]);

  // Action: Swallow Spirit Pill 💊 (+8 Linh Lực XP)
  const handleFeedPill = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setState('eat');
    setFrame(0);
    setPillsEaten(prev => prev + 1);
    addXP(8);

    const eatMessages = [
      '💊 Cắn 1 viên Tụ Linh Đan! Dạt dào linh khí~ (+8 Linh Lực)',
      '😋 Nuốt Tiên Đan! Linh lực cuồn cuộn dâng trào! (+8 Linh Lực)',
      '💊 Cảm ơn Chân Tiên ban thưởng Linh Đan! ❤️ (+8 Linh Lực)',
      '✨ Được nạp linh khí đầy đủ, quậy tiếp thôi! (+8 Linh Lực)'
    ];
    setBubbleText(eatMessages[Math.floor(Math.random() * eatMessages.length)]);
  };

  // Pointer Down: Distinguish Click (Eat Pill) vs Drag (Fly Anywhere +10 XP)
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    let isActualDrag = false;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: posX,
      initPosY: posYBottom
    };

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const deltaX = moveEvt.clientX - dragStartRef.current.startX;
      const deltaY = moveEvt.clientY - dragStartRef.current.startY;
      const dist = Math.hypot(deltaX, deltaY);

      if (dist > 6 && !isActualDrag) {
        isActualDrag = true;
        setIsDragging(true);
        setState(directionRef.current === 'left' ? 'jump_left' : 'jump_right');
        setBubbleText('🎈 Thi triển Thuật Nhiếp Hồn! Tiên đại nhân bế Thỏ bay nè...');
      }

      if (isActualDrag) {
        const deltaXPercent = (deltaX / window.innerWidth) * 100;
        const newPosX = Math.max(5, Math.min(95, dragStartRef.current.initPosX + deltaXPercent));
        const newPosY = Math.max(10, Math.min(window.innerHeight - 80, dragStartRef.current.initPosY - deltaY));

        setPosX(newPosX);
        setPosYBottom(newPosY);
      }
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (isActualDrag) {
        setIsDragging(false);
        triggerGentleHop();
        addXP(10, '🎉 Thi triển Ngự Kiếm đáp đất an toàn!');
      } else {
        handleFeedPill();
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  if (isDismissed) return null;

  const bgX = -(frame * 50);
  const bgY = -stateRowY[state];

  // High Leap Parabolic Physics Jump & Subtle Bobbing
  const getVerticalOffset = () => {
    if (state.startsWith('jump') || isDragging) {
      const highJumpCurve = [0, -20, -42, -62, -75, -70, -50, -28, -10, 0];
      return highJumpCurve[frame % 10];
    }
    if (state.startsWith('walk') || state.startsWith('run')) {
      const walkBob = [0, -2, -4, -2, 0, -2, -4, -2, 0, 0];
      return walkBob[frame % 10];
    }
    if (state === 'dance') {
      const danceBob = [0, -6, -12, -6, 0, -6, -12, -6, 0, 0];
      return danceBob[frame % 10];
    }
    if (state === 'idle') {
      const breathBob = [0, -1, -3, -1];
      return breathBob[frame % 4];
    }
    return 0; // sleep
  };

  const currentOffsetY = getVerticalOffset();

  // Floating Xianxia Artifact style (floats nicely to the top-right side of the bunny)
  const artifactSideStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-4px',
    right: '-24px',
    zIndex: 20
  };

  // Progress Bar Percentage
  const prevReq = currentLevelInfo.reqXp;
  const nextReq = nextLevelInfo ? nextLevelInfo.reqXp : currentLevelInfo.reqXp + 1500;
  const progressPercent = Math.min(100, Math.max(0, ((xp - prevReq) / (nextReq - prevReq)) * 100));

  const currentSuccessRatePercent = Math.round(getSuccessRate(currentLevel) * 100);

  return (
    <>
      {/* Real Full-Screen Procedural Canvas Lightning Strikes Overlay 🌩️ (Only for Level 2+ Tribulations) */}
      {isLevelUpAnim && (
        <>
          <LightningCanvas bunnyX={posX} bunnyY={posYBottom} />
          
          {/* Floating Xianxia Tribulation Announcement Banner */}
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none flex flex-col items-center gap-2 animate-bounce">
            <div className="bg-black/90 border-2 border-amber-400 px-6 py-3.5 rounded-2xl shadow-[0_0_60px_rgba(245,158,11,0.9)] text-center">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-amber-400 animate-bounce" />
                <div>
                  <div className="text-amber-300 font-black text-lg tracking-wider uppercase">
                    🌩️ CỬU TRÙNG THIÊN KIẾP SẤM SÉT REAL 🌩️
                  </div>
                  <div className="text-amber-100 font-semibold text-xs mt-0.5">
                    Bổn Thỏ đang giáng lôi đình đột phá {nextLevelInfo ? nextLevelInfo.name : currentLevelInfo.name}!
                  </div>
                </div>
                <Zap className="w-8 h-8 text-amber-400 animate-bounce" />
              </div>
            </div>
          </div>
        </>
      )}

      <div
        className={`fixed z-[95] flex flex-col items-center select-none ${
          isDragging ? 'cursor-grabbing transition-none' : 'cursor-grab transition-all duration-300 ease-linear'
        }`}
        style={{
          left: `${posX}%`,
          bottom: `${posYBottom}px`,
          transform: `translate(-50%, ${currentOffsetY}px)`
        }}
        onPointerDown={handlePointerDown}
      >
        {/* Speech Bubble Banner */}
        <div className="relative mb-2 px-3 py-1.5 rounded-xl bg-[#0e1422]/95 border border-amber-500/40 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.6)] text-[11px] text-white flex items-center gap-2 animate-bounce">
          {/* Cultivation Realm Badge Button (Click to open Xianxia Costume Drawer) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCostumePicker(prev => !prev);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="bg-gradient-to-r from-amber-500/30 via-purple-500/30 to-emerald-500/30 hover:from-amber-500/50 hover:to-emerald-500/50 border border-amber-400/40 px-2 py-0.5 rounded-lg text-[10.5px] font-black text-amber-200 flex items-center gap-1 transition-all active:scale-95 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
            title="Xem Cảnh Giới Tu Tiên & Tủ Đồ Pháp Bảo"
          >
            <span>{currentLevelInfo.name}</span>
          </button>

          <span className="font-medium text-amber-100 whitespace-nowrap">{bubbleText}</span>
          
          {/* Manual User Button: [ ✨ ĐỘT PHÁ ] for Level 1 -> 2, or [ 🌩️ ĐỘ KIẾP (X%) ] for Level 2+ */}
          {isReadyToBreakthrough ? (
            <button
              onClick={handleBreakthroughOrKiep}
              onPointerDown={(e) => e.stopPropagation()}
              className={`px-2.5 py-0.5 rounded-lg border font-black text-[10.5px] animate-pulse shadow-[0_0_15px_#f59e0b] flex items-center gap-1 active:scale-95 shrink-0 ml-1 cursor-pointer ${
                isTribulationLevel
                  ? 'bg-gradient-to-r from-amber-500 via-red-500 to-yellow-400 border-amber-300 text-black'
                  : 'bg-gradient-to-r from-emerald-400 via-teal-400 to-amber-300 border-emerald-300 text-black'
              }`}
              title={
                isTribulationLevel
                  ? `Bấm để ĐỘ KIẾP! Tỉ lệ thành công: ${currentSuccessRatePercent}% (Cảnh giới càng cao nguy cơ thất bại càng tăng!)`
                  : 'Bấm để ĐỘT PHÁ khai phá đan điền lên Trúc Cơ Kỳ!'
              }
            >
              <span>{isTribulationLevel ? `🌩️ ĐỘ KIẾP (${currentSuccessRatePercent}%)` : '✨ ĐỘT PHÁ'}</span>
            </button>
          ) : (
            <button
              onClick={handleFeedPill}
              onPointerDown={(e) => e.stopPropagation()}
              className="bg-amber-500/20 hover:bg-amber-500/40 text-amber-200 hover:text-white px-2 py-0.5 rounded-lg border border-amber-500/40 text-[10.5px] font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95 ml-1"
              title="Cắn Linh Đan Tụ Linh 💊 (+8 Linh Lực)"
            >
              <span>💊 Cắn Đan</span>
              {pillsEaten > 0 && <span className="bg-amber-500/30 px-1.5 rounded-full text-[9.5px]">{pillsEaten}</span>}
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-[#94a3b8] hover:text-white text-xs p-0.5 rounded-full hover:bg-white/10 transition-all shrink-0"
            title="Ẩn Thỏ Tiên"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Triangle Pointer */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0e1422] border-r border-b border-amber-500/40 transform rotate-45" />
        </div>

        {/* Interactive Pixel Bunny Body + Floating Xianxia Magical Treasure Layer */}
        <div
          className="relative transition-transform duration-200 hover:scale-125 active:scale-95"
          title="Nhấp chuột CẮN LINH ĐAN 💊 | Xem 17 CẢNH GIỚI TU TIÊN 🧘 | KÉO THẢ 🎈"
        >
          {/* Floating Xianxia Magical Artifact Layer (Rendered to top-right side) */}
          {activeSkin === 'grad_cap' && (
            <div className="text-xl select-none animate-bounce filter drop-shadow-[0_0_8px_#f59e0b]" style={artifactSideStyle}>
              🧘
            </div>
          )}
          {activeSkin === 'cap' && (
            <div className="text-xl select-none animate-pulse filter drop-shadow-[0_0_8px_#a855f7]" style={artifactSideStyle}>
              🔮
            </div>
          )}
          {activeSkin === 'helmet' && (
            <div className="text-xl select-none animate-pulse filter drop-shadow-[0_0_8px_#38bdf8]" style={artifactSideStyle}>
              👶
            </div>
          )}
          {activeSkin === 'astro' && (
            <div className="text-2xl select-none animate-pulse filter drop-shadow-[0_0_10px_#f59e0b]" style={artifactSideStyle}>
              ⚡
            </div>
          )}
          {activeSkin === 'glasses' && (
            <div className="text-lg select-none animate-bounce filter drop-shadow-[0_0_8px_#38bdf8]" style={artifactSideStyle}>
              🪐
            </div>
          )}
          {activeSkin === 'ninja' && (
            <div className="text-lg select-none animate-bounce filter drop-shadow-[0_0_8px_#ef4444]" style={artifactSideStyle}>
              ⚔️
            </div>
          )}
          {activeSkin === 'crown' && (
            <div className="text-2xl select-none animate-bounce filter drop-shadow-[0_0_10px_#eab308]" style={artifactSideStyle}>
              ☯️
            </div>
          )}
          {activeSkin === 'aura' && (
            <>
              <div className="text-xl select-none animate-bounce" style={artifactSideStyle}>👑</div>
              <div className="absolute inset-0 rounded-full animate-pulse shadow-[0_0_25px_8px_rgba(245,158,11,0.7)] pointer-events-none" />
            </>
          )}
          {activeSkin === 'chan_tien' && (
            <div className="text-xl select-none animate-pulse filter drop-shadow-[0_0_10px_#eab308]" style={artifactSideStyle}>
              🎓🌟
            </div>
          )}
          {activeSkin === 'huyen_tien' && (
            <div className="text-lg select-none animate-bounce filter drop-shadow-[0_0_10px_#a855f7]" style={artifactSideStyle}>
              🕶️🔮
            </div>
          )}
          {activeSkin === 'kim_tien' && (
            <div className="text-2xl select-none animate-bounce filter drop-shadow-[0_0_12px_#f59e0b]" style={artifactSideStyle}>
              👑✨
            </div>
          )}
          {activeSkin === 'ngoc_tien' && (
            <div className="text-xl select-none animate-pulse filter drop-shadow-[0_0_10px_#10b981]" style={artifactSideStyle}>
              💎
            </div>
          )}
          {activeSkin === 'thai_at' && (
            <div className="text-xl select-none animate-bounce filter drop-shadow-[0_0_10px_#38bdf8]" style={artifactSideStyle}>
              ⚡🪖
            </div>
          )}
          {activeSkin === 'dai_la' && (
            <>
              <div className="text-2xl select-none animate-bounce" style={artifactSideStyle}>🌌👑</div>
              <div className="absolute inset-0 rounded-full animate-pulse shadow-[0_0_30px_10px_rgba(56,189,248,0.8)] pointer-events-none" />
            </>
          )}
          {activeSkin === 'hon_nguyen' && (
            <>
              <div className="text-2xl select-none animate-bounce" style={artifactSideStyle}>🌌✨</div>
              <div className="absolute inset-0 rounded-full animate-pulse shadow-[0_0_35px_12px_rgba(168,85,247,0.8)] pointer-events-none border-2 border-purple-400" />
            </>
          )}
          {activeSkin === 'god' && (
            <>
              <div className="text-2xl select-none animate-bounce" style={artifactSideStyle}>👑⚡</div>
              <div className="absolute -top-1 -right-2 text-sm z-10 animate-ping">☯️</div>
              <div className="absolute inset-0 rounded-full animate-pulse shadow-[0_0_35px_14px_rgba(234,179,8,0.9)] pointer-events-none border-2 border-amber-300" />
            </>
          )}

          {/* Pixel Sprite Canvas Container */}
          <div
            className="w-[50px] h-[50px] bg-no-repeat drop-shadow-[0_4px_10px_rgba(245,158,11,0.4)]"
            style={{
              backgroundImage: 'url(/bunny_10x10_grid.png)',
              backgroundSize: '500px 500px',
              backgroundPosition: `${bgX}px ${bgY}px`,
              imageRendering: 'pixelated'
            }}
          />

          {/* Moon indicator when sleeping */}
          {state === 'sleep' && (
            <div className="absolute -top-2 left-0 text-amber-300 font-bold text-xs animate-bounce flex items-center">
              <Moon className="w-3.5 h-3.5 text-amber-400" />
            </div>
          )}
        </div>
      </div>

      {/* Xianxia 17 Cultivation Realms & Artifacts Drawer Modal */}
      {showCostumePicker && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-amber-500/50 rounded-2xl w-full max-w-lg p-5 text-white shadow-[0_20px_50px_rgba(245,158,11,0.2)] relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-amber-200">17 Cảnh Giới Tu Tiên & Pháp Bảo Tiên Giới</h3>
              </div>
              <button
                onClick={() => setShowCostumePicker(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Cultivation Progress Card */}
            <div className="bg-[#161f33]/90 border border-amber-500/30 rounded-xl p-3.5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{currentLevelInfo.emoji || '🐰'}</span>
                  <div>
                    <div className="font-bold text-sm text-amber-300">Cảnh Giới Lv.{currentLevel}: {currentLevelInfo.name}</div>
                    <div className="text-[11px] text-gray-300">Linh Lực: {xp} XP • Đã cắn: {pillsEaten} 💊 Linh Đan</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-amber-400">{progressPercent.toFixed(0)}%</div>
                  <div className="text-[10px] text-gray-400">
                    {nextLevelInfo ? `${xp} / ${nextLevelInfo.reqXp} XP` : 'TIÊN ĐẾ ĐỈNH CAO'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden border border-amber-500/20">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-purple-500 to-cyan-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* 17 Realm Grid Selection */}
            <div className="text-xs font-bold text-amber-300/80 mb-2 uppercase tracking-wider">Danh Sách 17 Cảnh Giới & Pháp Bảo Tu Tiên</div>
            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {LEVEL_CONFIG.map(lvl => {
                const isUnlocked = xp >= lvl.reqXp;
                const isEquipped = activeSkin === lvl.skinId;

                return (
                  <button
                    key={lvl.skinId}
                    disabled={!isUnlocked}
                    onClick={() => {
                      if (isUnlocked) {
                        setActiveSkin(lvl.skinId);
                        setShowCostumePicker(false);
                        setBubbleText(`✨ Đã triệu hồi Pháp Bảo [${lvl.skinName}]!`);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isEquipped
                        ? 'bg-amber-500/20 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                        : isUnlocked
                        ? 'bg-white/5 border-white/10 hover:border-amber-400/50 hover:bg-white/10 text-gray-200 cursor-pointer'
                        : 'bg-black/40 border-white/5 text-gray-500 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-xl shrink-0">{lvl.emoji || '🐰'}</span>
                      <div className="truncate">
                        <div className="font-bold text-xs truncate">{lvl.name}</div>
                        <div className="text-[10px] text-amber-200/60 truncate">
                          {isUnlocked ? `Pháp Bảo: ${lvl.skinName}` : `Cần Lv.${lvl.level} (${lvl.reqXp} XP)`}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-1">
                      {isEquipped ? (
                        <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-black font-bold">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : isUnlocked ? (
                        <span className="text-[10px] font-bold text-amber-400">Trần thiết</span>
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-gray-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
