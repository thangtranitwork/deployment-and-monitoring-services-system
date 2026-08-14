import React, { useState, useEffect } from 'react';

export const AnimatedFurnaceSprite: React.FC<{ isCrafting?: boolean; size?: number }> = ({
  isCrafting = true,
  size = 180
}) => {
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
