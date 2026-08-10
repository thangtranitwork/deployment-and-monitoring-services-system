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
  { level: 1, name: 'Thỏ Mới Sinh 🐣', reqXp: 0, skinId: 'none', skinName: 'Mặc Định', emoji: '🐰' },
  { level: 2, name: 'Thỏ Tập Sự 🎓', reqXp: 40, skinId: 'grad_cap', skinName: 'Mũ Cử Nhân', emoji: '🎓' },
  { level: 3, name: 'Thỏ Dev Jr. 🧢', reqXp: 100, skinId: 'cap', skinName: 'Mũ Lưỡi Trai', emoji: '🧢' },
  { level: 4, name: 'Thỏ Kỹ Sư 🪖', reqXp: 200, skinId: 'helmet', skinName: 'Mũ Bảo Hiểm', emoji: '🪖' },
  { level: 5, name: 'Thỏ DevOps 🪐', reqXp: 380, skinId: 'astro', skinName: 'Mũ Phi Hành Gia', emoji: '🪐' },
  { level: 6, name: 'Thỏ Cyber Neon 🕶️', reqXp: 600, skinId: 'glasses', skinName: 'Kính Cyberpunk', emoji: '🕶️' },
  { level: 7, name: 'Thỏ Ninja 🥷', reqXp: 900, skinId: 'ninja', skinName: 'Băng Trán Ninja', emoji: '🥷' },
  { level: 8, name: 'Thỏ Vua 👑', reqXp: 1300, skinId: 'crown', skinName: 'Vương Miện Vàng', emoji: '👑' },
  { level: 9, name: 'Thỏ Hào Quang ✨', reqXp: 1800, skinId: 'aura', skinName: 'Hào Quang Thiên Hà', emoji: '✨' },
  { level: 10, name: 'Thỏ Thần PIXEL ⚡', reqXp: 2500, skinId: 'god', skinName: 'Mũ Thần Pixel ⚡', emoji: '👑⚡' }
];

const BUNNY_STORAGE_KEY = 'ids_bunny_progress_v1';

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

  const [carrotsEaten, setCarrotsEaten] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(BUNNY_STORAGE_KEY);
      if (saved) return JSON.parse(saved).carrotsEaten || 0;
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
  const [bubbleText, setBubbleText] = useState<string>('Xin chào! Tui là Thỏ 🐰');
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

  // Compute Current Level
  const currentLevelInfo = LEVEL_CONFIG.slice().reverse().find(lvl => xp >= lvl.reqXp) || LEVEL_CONFIG[0];
  const currentLevel = currentLevelInfo.level;
  const nextLevelInfo = LEVEL_CONFIG.find(lvl => lvl.level === currentLevel + 1);

  // Save Progression to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(BUNNY_STORAGE_KEY, JSON.stringify({
        xp,
        activeSkin,
        carrotsEaten
      }));
    } catch (e) {}
  }, [xp, activeSkin, carrotsEaten]);

  // XP Add Helper with Level-Up Detection
  const addXP = (amount: number, reasonText?: string) => {
    setXp(prevXp => {
      const newXp = prevXp + amount;
      const prevLvl = (LEVEL_CONFIG.slice().reverse().find(lvl => prevXp >= lvl.reqXp) || LEVEL_CONFIG[0]).level;
      const newLvlInfo = LEVEL_CONFIG.slice().reverse().find(lvl => newXp >= lvl.reqXp) || LEVEL_CONFIG[0];

      if (newLvlInfo.level > prevLvl) {
        // Trigger Level-Up Celebration!
        setIsLevelUpAnim(true);
        setState('dance');
        setActiveSkin(newLvlInfo.skinId); // Auto equip new skin!
        setBubbleText(`🎉 LEVEL UP! Thỏ đã đạt Cấp ${newLvlInfo.level}: ${newLvlInfo.name}!`);
        setTimeout(() => setIsLevelUpAnim(false), 4000);
      } else if (reasonText) {
        setBubbleText(`${reasonText} (+${amount} XP)`);
      }

      return newXp;
    });
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

  // Reaction to deploying state (+20 XP for deploying)
  const wasDeployingRef = useRef(false);
  useEffect(() => {
    if (isDeploying && !wasDeployingRef.current) {
      wasDeployingRef.current = true;
      setDirection('left');
      setState('run_left');
      addXP(20, `🚀 Runnn! Deploy ${selectedService || 'Service'}`);
    } else if (!isDeploying && wasDeployingRef.current) {
      wasDeployingRef.current = false;
      setState('idle');
      addXP(15, `✨ Deploy thành công rực rỡ!`);
    }
  }, [isDeploying, selectedService]);

  // Autonomous Natural State Machine
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
          setBubbleText(currentDir === 'left' ? '🐰 Đang đi dạo thong dong...' : '🐰 Đi tung tăng bên phải...');
        } else if (rand < 0.65) {
          nextState = 'sleep';
          duration = Math.floor(Math.random() * 8000) + 10000;
          addXP(2); // +2 XP for a restful sleep
          setBubbleText('😴 Buồn ngủ quá... Zzz zzz...');
        } else if (rand < 0.8) {
          nextState = 'eat';
          duration = Math.floor(Math.random() * 4000) + 5000;
          setBubbleText('🥕 Nhai củ cà rốt ngon quá!');
        } else {
          nextState = currentDir === 'left' ? 'jump_left' : 'jump_right';
          duration = 4000;

          const altitudes = [12, 45, 95, 140];
          const newAlt = altitudes[Math.floor(Math.random() * altitudes.length)];
          setPosYBottom(newAlt);

          setBubbleText(newAlt > 12 ? '🚀 Nhảy lên bậc cao nè!' : '✨ Bật nhảy vút cao!');
        }
      } else if (state.startsWith('walk')) {
        if (rand < 0.5) {
          nextState = 'idle';
          duration = Math.floor(Math.random() * 4000) + 4000;
          setBubbleText('🐰 Thỏ đứng nghỉ ngơi hóng mát...');
        } else if (rand < 0.75) {
          nextState = currentDir === 'left' ? 'jump_left' : 'jump_right';
          duration = 4000;

          const shouldChangeAlt = Math.random() > 0.5;
          if (shouldChangeAlt) {
            const altitudes = [12, 50, 110];
            setPosYBottom(altitudes[Math.floor(Math.random() * altitudes.length)]);
          }

          setBubbleText('🚀 Bật nhảy chuyển độ cao!');
        } else {
          nextState = 'eat';
          duration = 5000;
          setBubbleText('🥕 Tìm thấy củ cà rốt rồi!');
        }
      } else if (state === 'sleep') {
        if (rand < 0.6) {
          nextState = 'idle';
          duration = 4000;
          setBubbleText('🥱 Thỏ vừa vươn vai thức dậy...');
        } else {
          nextState = 'eat';
          duration = 5000;
          setBubbleText('🥕 Thức dậy đói bụng ăn cà rốt!');
        }
      } else {
        nextState = 'idle';
        duration = Math.floor(Math.random() * 3000) + 4000;
        setBubbleText('🐰 Thỏ đứng quan sát hệ thống...');
      }

      setState(nextState);
      setFrame(0);

      timeoutId = setTimeout(planNextAction, duration);
    };

    timeoutId = setTimeout(planNextAction, 5000);
    return () => clearTimeout(timeoutId);
  }, [isDeploying, isDismissed, isDragging, state]);

  // Action: Feed Carrot 🥕 (+5 XP)
  const handleFeedCarrot = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setState('eat');
    setFrame(0);
    setCarrotsEaten(prev => prev + 1);
    addXP(5);

    const eatMessages = [
      '🥕 Cảm ơn bạn! Cà rốt ngon tuyệt~ (+5 XP)',
      '😋 Nhai nhai... Ngon mê li! (+5 XP)',
      '🥕 Bạn cưng Thỏ nhất! Yêu nhiều ❤️ (+5 XP)',
      '✨ Được ăn no rồi, quậy tiếp thôi! (+5 XP)'
    ];
    setBubbleText(eatMessages[Math.floor(Math.random() * eatMessages.length)]);
  };

  // Pointer Down: Distinguish Click (Feed) vs Drag (Move +8 XP)
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
        setBubbleText('🎈 Ối ối! Đang được bạn bế nè...');
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
        setState('dance');
        addXP(8, '🎉 Đáp đất an toàn!');
      } else {
        handleFeedCarrot();
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

  // Calibrate exact costume hat positioning to fit bunny head in every action state
  const getHatStyle = () => {
    let top = '-12px';
    let left = '42%';
    
    if (state === 'sleep') {
      top = '8px';
      left = '32%';
    } else if (state === 'eat') {
      top = '-10px';
      left = '38%';
    } else if (state.endsWith('_left')) {
      top = '-12px';
      left = '38%';
    } else if (state.endsWith('_right')) {
      top = '-12px';
      left = '48%';
    }

    if (activeSkin === 'glasses') {
      top = state === 'sleep' ? '16px' : '10px';
    } else if (activeSkin === 'ninja') {
      top = state === 'sleep' ? '10px' : '2px';
    } else if (activeSkin === 'crown' || activeSkin === 'god') {
      top = state === 'sleep' ? '0px' : '-14px';
    }

    return { top, left, transform: 'translateX(-50%)' };
  };

  const hatStyle = getHatStyle();

  // Progress Bar Percentage
  const prevReq = currentLevelInfo.reqXp;
  const nextReq = nextLevelInfo ? nextLevelInfo.reqXp : currentLevelInfo.reqXp + 1000;
  const progressPercent = Math.min(100, Math.max(0, ((xp - prevReq) / (nextReq - prevReq)) * 100));

  return (
    <>
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
        {/* Level Up Celebration Aura */}
        {isLevelUpAnim && (
          <div className="absolute -inset-10 rounded-full bg-yellow-400/20 animate-ping pointer-events-none z-10 flex items-center justify-center">
            <div className="text-sm font-black text-yellow-300 drop-shadow-[0_0_10px_#f59e0b] animate-bounce whitespace-nowrap">
              ✨ LEVEL UP! Lv.{currentLevel} ✨
            </div>
          </div>
        )}

        {/* Speech Bubble Banner */}
        <div className="relative mb-2 px-3 py-1.5 rounded-xl bg-[#0e1422]/95 border border-pink-500/40 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.6)] text-[11px] text-white flex items-center gap-2 animate-bounce">
          {/* Level Badge Button (Click to open Costume Drawer) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowCostumePicker(prev => !prev);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="bg-gradient-to-r from-pink-500/30 to-purple-500/30 hover:from-pink-500/50 hover:to-purple-500/50 border border-pink-400/40 px-2 py-0.5 rounded-lg text-[10px] font-extrabold text-pink-200 flex items-center gap-1 transition-all active:scale-95 shrink-0"
            title="Mở tủ đồ & xem tiến trình Cấp độ"
          >
            <span>Lv.{currentLevel}</span>
            <span className="text-[12px]">{currentLevelInfo.emoji || '🐰'}</span>
          </button>

          <span className="font-medium text-pink-100 whitespace-nowrap">{bubbleText}</span>
          
          {/* Feed Carrot Button */}
          <button
            onClick={handleFeedCarrot}
            onPointerDown={(e) => e.stopPropagation()}
            className="bg-pink-500/20 hover:bg-pink-500/40 text-pink-200 hover:text-white px-2 py-0.5 rounded-lg border border-pink-500/40 text-[10.5px] font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95 ml-1"
            title="Cho thỏ ăn củ cà rốt 🥕 (+5 XP)"
          >
            <span>🥕 Cho ăn</span>
            {carrotsEaten > 0 && <span className="bg-pink-500/30 px-1.5 rounded-full text-[9.5px]">{carrotsEaten}</span>}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-[#94a3b8] hover:text-white text-xs p-0.5 rounded-full hover:bg-white/10 transition-all shrink-0"
            title="Tắt thỏ pixel"
          >
            <X className="w-3 h-3" />
          </button>

          {/* Triangle Pointer */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#0e1422] border-r border-b border-pink-500/40 transform rotate-45" />
        </div>

        {/* Interactive Pixel Bunny Body + Costume Layer */}
        <div
          className="relative transition-transform duration-200 hover:scale-125 active:scale-95"
          title="Nhấp chuột để CHO ĂN 🥕 | Bấm Lv Badge chọn MŨ 🎓 | KÉO THẢ 🎈"
        >
          {/* Costume / Hat Overlay Layer */}
          {activeSkin === 'grad_cap' && (
            <div className="absolute text-xl select-none z-10 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={hatStyle}>
              🎓
            </div>
          )}
          {activeSkin === 'cap' && (
            <div className="absolute text-xl select-none z-10 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={hatStyle}>
              🧢
            </div>
          )}
          {activeSkin === 'helmet' && (
            <div className="absolute text-xl select-none z-10 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={hatStyle}>
              🪖
            </div>
          )}
          {activeSkin === 'astro' && (
            <div className="absolute text-2xl select-none z-10 animate-pulse filter drop-shadow-[0_0_8px_#38bdf8]" style={hatStyle}>
              🪐
            </div>
          )}
          {activeSkin === 'glasses' && (
            <div className="absolute text-lg select-none z-10 filter drop-shadow-[0_0_6px_#f43f5e]" style={hatStyle}>
              🕶️
            </div>
          )}
          {activeSkin === 'ninja' && (
            <div className="absolute text-lg select-none z-10 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={hatStyle}>
              🥷
            </div>
          )}
          {activeSkin === 'crown' && (
            <div className="absolute text-2xl select-none z-10 animate-bounce filter drop-shadow-[0_0_10px_#eab308]" style={hatStyle}>
              👑
            </div>
          )}
          {activeSkin === 'aura' && (
            <>
              <div className="absolute text-xl select-none z-10" style={hatStyle}>✨</div>
              <div className="absolute inset-0 rounded-full animate-pulse shadow-[0_0_25px_8px_rgba(168,85,247,0.7)] pointer-events-none" />
            </>
          )}
          {activeSkin === 'god' && (
            <>
              <div className="absolute text-2xl select-none z-10 animate-bounce" style={hatStyle}>👑</div>
              <div className="absolute -top-1 -right-2 text-sm z-10 animate-ping">⚡</div>
              <div className="absolute inset-0 rounded-full animate-pulse shadow-[0_0_30px_10px_rgba(234,179,8,0.8)] pointer-events-none border-2 border-amber-300" />
            </>
          )}

          {/* Pixel Sprite Canvas Container */}
          <div
            className="w-[50px] h-[50px] bg-no-repeat drop-shadow-[0_4px_10px_rgba(244,114,182,0.4)]"
            style={{
              backgroundImage: 'url(/bunny_10x10_grid.png)',
              backgroundSize: '500px 500px',
              backgroundPosition: `${bgX}px ${bgY}px`,
              imageRendering: 'pixelated'
            }}
          />

          {/* Moon indicator when sleeping */}
          {state === 'sleep' && (
            <div className="absolute -top-2 right-1 text-pink-300 font-bold text-xs animate-bounce flex items-center">
              <Moon className="w-3.5 h-3.5 text-pink-400" />
            </div>
          )}
        </div>
      </div>

      {/* Costume & Progression Drawer Modal */}
      {showCostumePicker && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-pink-500/40 rounded-2xl w-full max-w-md p-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)] relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-pink-200">Tủ Đồ & Tiến Trình Cấp Độ</h3>
              </div>
              <button
                onClick={() => setShowCostumePicker(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current Level Progress Card */}
            <div className="bg-[#1e293b]/80 border border-pink-500/20 rounded-xl p-3.5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{currentLevelInfo.emoji || '🐰'}</span>
                  <div>
                    <div className="font-bold text-sm text-pink-300">Cấp {currentLevel}: {currentLevelInfo.name}</div>
                    <div className="text-[11px] text-gray-400">Tổng XP: {xp} XP • Đã ăn: {carrotsEaten} 🥕</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-amber-400">{progressPercent.toFixed(0)}%</div>
                  <div className="text-[10px] text-gray-400">
                    {nextLevelInfo ? `${xp} / ${nextLevelInfo.reqXp} XP` : 'MAX LEVEL'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-gray-700/80 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-amber-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Costume Grid Selection */}
            <div className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">Bộ Trang Phục / Mũ Pixel</div>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
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
                        setBubbleText(`✨ Đã diện ${lvl.skinName}!`);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isEquipped
                        ? 'bg-pink-500/20 border-pink-500 text-white shadow-[0_0_15px_rgba(244,114,182,0.3)]'
                        : isUnlocked
                        ? 'bg-white/5 border-white/10 hover:border-pink-400/50 hover:bg-white/10 text-gray-200 cursor-pointer'
                        : 'bg-black/30 border-white/5 text-gray-500 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-xl shrink-0">{lvl.emoji || '🐰'}</span>
                      <div className="truncate">
                        <div className="font-bold text-xs truncate">{lvl.skinName}</div>
                        <div className="text-[10px] text-gray-400 truncate">
                          {isUnlocked ? `Lv.${lvl.level}` : `Yêu cầu Lv.${lvl.level} (${lvl.reqXp} XP)`}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 ml-1">
                      {isEquipped ? (
                        <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center text-white">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : isUnlocked ? (
                        <span className="text-[10px] font-bold text-pink-400">Chọn</span>
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
