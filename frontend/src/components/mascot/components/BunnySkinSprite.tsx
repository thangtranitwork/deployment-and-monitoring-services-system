import React, { useState, useEffect } from 'react';
import { BunnyState } from '../types';

export const BunnySkinSprite: React.FC<{
  level: number;
  action?: BunnyState;
  size?: number;
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
}> = ({
  level,
  action = 'idle',
  size = 48,
  animated = true,
  className = '',
  style = {}
}) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!animated) return;
    const timer = setInterval(() => setFrame((f) => (f + 1) % 10), 130);
    return () => clearInterval(timer);
  }, [animated]);

  const safeLevel = level || 1;
  const safeAction = action || 'idle';
  const bgX = -frame * size;

  return (
    <div
      className={`select-none pointer-events-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        flexGrow: 0,
        backgroundImage: `url(/skins/${safeLevel}/${safeAction}.png)`,
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
