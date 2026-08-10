import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Heart, Moon, X } from 'lucide-react';

interface BunnyMascotProps {
  isDeploying?: boolean;
  selectedService?: string;
}

type BunnyState = 'idle' | 'walk_right' | 'walk_left' | 'jump_right' | 'jump_left' | 'sleep' | 'eat' | 'run_right' | 'run_left' | 'dance';

export const BunnyMascot: React.FC<BunnyMascotProps> = ({
  isDeploying = false,
  selectedService = ''
}) => {
  const [state, setState] = useState<BunnyState>('idle');
  const [frame, setFrame] = useState<number>(0);
  const [posX, setPosX] = useState<number>(82); // percentage from left
  const [posYBottom, setPosYBottom] = useState<number>(12); // bottom altitude in px
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [bubbleText, setBubbleText] = useState<string>('Xin chào! Tui là Thỏ 🐰');
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [carrotsEaten, setCarrotsEaten] = useState<number>(0);

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

  // Row Y offsets in 10x10 grid (each cell is 50px x 50px, total image 500px x 500px)
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

  // Reaction to deploying state
  useEffect(() => {
    if (isDeploying) {
      setDirection('left');
      setState('run_left');
      setBubbleText(`🚀 Runnn! Đang deploy ${selectedService || 'Service'}...`);
    } else if (state.startsWith('run')) {
      setState('idle');
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

  // Separate Action: Feed Carrot 🥕
  const handleFeedCarrot = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setState('eat');
    setFrame(0);
    setCarrotsEaten(prev => prev + 1);
    const eatMessages = [
      '🥕 Cảm ơn bạn! Cà rốt giòn ngọt quá~',
      '😋 Nhai nhai... Ngon mê li!',
      '🥕 Bạn cưng Thỏ nhất! Yêu nhiều ❤️',
      '✨ Được ăn no rồi, chuẩn bị quậy tiếp!'
    ];
    setBubbleText(eatMessages[Math.floor(Math.random() * eatMessages.length)]);
  };

  // Pointer Down: Distinguish Click (Feed Carrot) vs Drag (Move Anywhere)
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

      // Only enter Drag state if cursor moved more than 6px
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
        setBubbleText('🎉 Đáp đất an toàn! Cảm ơn bạn ❤️');
      } else {
        // Simple Click -> Feed Carrot!
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

  return (
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
      {/* Speech Bubble */}
      <div className="relative mb-2 px-3 py-1.5 rounded-xl bg-[#0e1422]/95 border border-pink-500/40 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.6)] text-[11px] text-white flex items-center gap-2 animate-bounce">
        <Sparkles className="w-3.5 h-3.5 text-pink-400 shrink-0" />
        <span className="font-medium text-pink-100 whitespace-nowrap">{bubbleText}</span>
        
        {/* Explicit Feed Carrot Button */}
        <button
          onClick={handleFeedCarrot}
          onPointerDown={(e) => e.stopPropagation()}
          className="bg-pink-500/20 hover:bg-pink-500/40 text-pink-200 hover:text-white px-2 py-0.5 rounded-lg border border-pink-500/40 text-[10.5px] font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95 ml-1"
          title="Cho thỏ ăn củ cà rốt 🥕"
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

      {/* Interactive Pixel Bunny Body */}
      <div
        className="relative transition-transform duration-200 hover:scale-125 active:scale-95"
        title="Nhấp chuột để CHO ĂN 🥕 | Nhấp giữ & Rê chuột để KÉO THẢ 🎈"
      >
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
  );
};
