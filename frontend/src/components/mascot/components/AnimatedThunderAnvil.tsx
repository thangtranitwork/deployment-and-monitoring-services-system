import React, { useState, useEffect } from 'react';

export const AnimatedThunderAnvil: React.FC<{ isForging?: boolean; size?: number }> = ({
  isForging = true,
  size = 180
}) => {
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
