import React, { useState, useEffect } from 'react';

export const TreasureSprite: React.FC<{
  treasureId: number;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}> = ({ treasureId, size = 48, className = '', style = {} }) => {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % 10), 100);
    return () => clearInterval(timer);
  }, []);

  const safeTreasureId = treasureId || 1;
  const bgX = -frame * size;

  return (
    <div
      className={`select-none pointer-events-none ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        flexShrink: 0,
        flexGrow: 0,
        backgroundImage: `url(/treasures/${safeTreasureId}.png)`,
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
