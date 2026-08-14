import React, { useState, useEffect } from 'react';
import { TreasureSprite } from './TreasureSprite';

export const TreasureOrbit: React.FC<{
  treasureId: number;
  treasureLevel?: number;
  isDeploying?: boolean;
}> = ({ treasureId, treasureLevel = 1, isDeploying }) => {
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    const update = (now: number) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;
      const speed = isDeploying ? 3.5 : 1.5 + (treasureLevel - 1) * 0.1;
      setAngle((prev) => (prev + speed * delta) % (Math.PI * 2));
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [isDeploying, treasureLevel]);

  const radiusX = 64;
  const radiusY = 22;
  const offsetX = Math.cos(angle) * radiusX;
  const offsetY = Math.sin(angle) * radiusY - 14;
  const isFront = Math.sin(angle) >= 0;
  const zIndex = isFront ? 30 : -1;
  const scale = 0.8 + (Math.sin(angle) + 1) * 0.25;
  const opacity = 0.8 + (Math.sin(angle) + 1) * 0.1;

  const auraGlow = treasureLevel >= 8
    ? 'drop-shadow(0 0 22px rgba(192,132,252,0.95)) drop-shadow(0 0 10px rgba(245,158,11,0.9))'
    : treasureLevel >= 4
    ? 'drop-shadow(0 0 16px rgba(56,189,248,0.85))'
    : isDeploying
    ? 'drop-shadow(0 0 16px rgba(245,158,11,0.9))'
    : 'drop-shadow(0 0 10px rgba(245,158,11,0.5))';

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px)) scale(${scale})`,
        zIndex,
        opacity,
        transition: 'transform 0.05s linear',
        filter: auraGlow,
        pointerEvents: 'none'
      }}
    >
      <TreasureSprite treasureId={treasureId} size={50} />
      {treasureLevel >= 8 && (
        <div
          style={{
            position: 'absolute',
            inset: '-6px',
            borderRadius: '50%',
            border: '1.5px dashed #c084fc',
            animation: 'spin 6s linear infinite',
            opacity: 0.85
          }}
        />
      )}
    </div>
  );
};
