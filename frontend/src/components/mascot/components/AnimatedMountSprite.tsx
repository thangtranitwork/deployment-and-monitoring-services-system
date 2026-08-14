import React, { useState, useEffect } from 'react';
import { MOUNT_CONFIG } from '../constants';

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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
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
