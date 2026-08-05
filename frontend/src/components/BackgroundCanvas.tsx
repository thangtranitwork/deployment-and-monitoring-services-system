import React, { useEffect, useRef } from 'react';

interface BackgroundCanvasProps {
  isLightMode: boolean;
}

export const BackgroundCanvas: React.FC<BackgroundCanvasProps> = ({ isLightMode }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const STAR_COLORS = [
      '#FFFFFF', '#FFFFAA', '#AAAAFF', '#FFAAAA', '#AAFFAA', '#FFAAFF', '#AAFFFF'
    ];
    const LIGHT_METEOR_COLORS = [
      '#2563eb', '#7c3aed', '#10b981', '#06b6d4', '#4f46e5', '#3b82f6'
    ];

    const starDensity = 0.00004;
    const twinkleProbability = 0.7;
    const minTwinkleSpeed = 2;
    const maxTwinkleSpeed = 4;
    const pixelSize = 5;
    const starRegenerationInterval = 5000;
    const percentToRegenerate = 0.15;
    const shootingStarPixelSize = 2;
    const targetFps = 16;
    const frameInterval = 1000 / targetFps;

    let backgroundStars: any[] = [];
    let shootingStars: any[] = [];
    let lightMeteors: any[] = [];
    let lastRenderTime = 0;
    let animFrameId: number;

    function hexToRgba(hex: string, alpha: number) {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const r = parseInt(c.substring(0, 2), 16);
      const g = parseInt(c.substring(2, 4), 16);
      const b = parseInt(c.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function initLightMeteors() {
      lightMeteors = [];
      const count = Math.floor(window.innerWidth / 40);
      for (let i = 0; i < count; i++) {
        lightMeteors.push({
          x: Math.random() * (canvas!.width + 400) - 200,
          y: Math.random() * (canvas!.height + 400) - 200,
          length: 80 + Math.random() * 160,
          speed: 4 + Math.random() * 8,
          thickness: 1.5 + Math.random() * 2.5,
          color: LIGHT_METEOR_COLORS[Math.floor(Math.random() * LIGHT_METEOR_COLORS.length)],
          opacity: 0.35 + Math.random() * 0.5
        });
      }
    }

    function initBackgroundStars() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
      backgroundStars = [];

      const area = canvas!.width * canvas!.height;
      const numStars = Math.floor(area * starDensity);

      for (let i = 0; i < numStars; i++) {
        const shouldTwinkle = Math.random() < twinkleProbability;
        const gridX = Math.floor(Math.random() * (canvas!.width / pixelSize)) * pixelSize;
        const gridY = Math.floor(Math.random() * (canvas!.height / pixelSize)) * pixelSize;
        const colorIndex = Math.floor(Math.random() * STAR_COLORS.length);
        const baseOpacity = Math.random() * 0.5 + 0.5;

        backgroundStars.push({
          x: gridX,
          y: gridY,
          color: STAR_COLORS[colorIndex],
          baseOpacity,
          currentOpacity: baseOpacity,
          twinkle: shouldTwinkle,
          twinkleSpeed: minTwinkleSpeed + Math.random() * (maxTwinkleSpeed - minTwinkleSpeed),
          twinkleDirection: -1,
          twinkleTimer: 0
        });
      }
      initLightMeteors();
    }

    function regenerateBackgroundStars() {
      if (backgroundStars.length === 0) return;
      const numToRegenerate = Math.max(1, Math.floor(backgroundStars.length * percentToRegenerate));

      for (let i = 0; i < numToRegenerate; i++) {
        const randomIndex = Math.floor(Math.random() * backgroundStars.length);
        const shouldTwinkle = Math.random() < twinkleProbability;
        const gridX = Math.floor(Math.random() * (canvas!.width / pixelSize)) * pixelSize;
        const gridY = Math.floor(Math.random() * (canvas!.height / pixelSize)) * pixelSize;
        const colorIndex = Math.floor(Math.random() * STAR_COLORS.length);
        const baseOpacity = Math.random() * 0.5 + 0.5;

        backgroundStars[randomIndex] = {
          x: gridX,
          y: gridY,
          color: STAR_COLORS[colorIndex],
          baseOpacity,
          currentOpacity: baseOpacity,
          twinkle: shouldTwinkle,
          twinkleSpeed: minTwinkleSpeed + Math.random() * (maxTwinkleSpeed - minTwinkleSpeed),
          twinkleDirection: -1,
          twinkleTimer: 0
        };
      }
    }

    function animateCanvas(timestamp: number) {
      if (timestamp - lastRenderTime < frameInterval) {
        animFrameId = requestAnimationFrame(animateCanvas);
        return;
      }
      lastRenderTime = timestamp;

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);

      if (document.body.classList.contains('light-theme')) {
        const cos45 = 0.7071;
        const sin45 = 0.7071;

        lightMeteors.forEach((m) => {
          const tailX = m.x - m.length * cos45;
          const tailY = m.y - m.length * sin45;

          const grad = ctx!.createLinearGradient(tailX, tailY, m.x, m.y);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          grad.addColorStop(0.6, hexToRgba(m.color, m.opacity * 0.35));
          grad.addColorStop(1, hexToRgba(m.color, m.opacity));

          ctx!.beginPath();
          ctx!.moveTo(tailX, tailY);
          ctx!.lineTo(m.x, m.y);
          ctx!.lineWidth = m.thickness;
          ctx!.strokeStyle = grad;
          ctx!.lineCap = 'round';
          ctx!.stroke();

          ctx!.fillStyle = m.color;
          ctx!.globalAlpha = m.opacity;
          ctx!.beginPath();
          ctx!.arc(m.x, m.y, m.thickness * 1.2, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.globalAlpha = 1.0;

          m.x += m.speed * cos45;
          m.y += m.speed * sin45;

          if (m.x > canvas!.width + 200 || m.y > canvas!.height + 200) {
            if (Math.random() < 0.5) {
              m.x = Math.random() * (canvas!.width + 200) - 200;
              m.y = -60;
            } else {
              m.x = -60;
              m.y = Math.random() * (canvas!.height + 200) - 200;
            }
            m.color = LIGHT_METEOR_COLORS[Math.floor(Math.random() * LIGHT_METEOR_COLORS.length)];
          }
        });

        animFrameId = requestAnimationFrame(animateCanvas);
        return;
      }

      // Dark theme stars & shooting stars
      backgroundStars.forEach((star) => {
        ctx!.fillStyle = star.color;
        ctx!.globalAlpha = star.currentOpacity;
        ctx!.fillRect(star.x, star.y, pixelSize, pixelSize);

        if (star.twinkle) {
          star.twinkleTimer += 1 / targetFps;
          if (star.twinkleTimer >= star.twinkleSpeed) {
            star.twinkleTimer = 0;
            star.twinkleDirection *= -1;
          }
          const progress = star.twinkleTimer / star.twinkleSpeed;
          if (progress < 0.5) {
            star.currentOpacity = star.twinkleDirection < 0 ? star.baseOpacity : star.baseOpacity * 0.3;
          } else {
            star.currentOpacity = star.twinkleDirection < 0 ? star.baseOpacity * 0.3 : star.baseOpacity;
          }
        }
      });

      if (shootingStars.length) {
        shootingStars = shootingStars
          .map((star) => {
            const newX = star.x + star.speed * Math.cos((star.angle * Math.PI) / 180);
            const newY = star.y + star.speed * Math.sin((star.angle * Math.PI) / 180);
            const newDistance = star.distance + star.speed;

            const newTrail = [...star.trail];
            if (newDistance % 8 < star.speed) {
              newTrail.push({ x: star.x, y: star.y, opacity: 1.0 });
            }

            const updatedTrail = newTrail
              .map((point) => ({ ...point, opacity: point.opacity - 0.1 }))
              .filter((point) => point.opacity > 0);

            return {
              ...star,
              x: newX,
              y: newY,
              distance: newDistance,
              trail: updatedTrail
            };
          })
          .filter(
            (star) =>
              star.x >= -30 &&
              star.x <= window.innerWidth + 30 &&
              star.y >= -30 &&
              star.y <= window.innerHeight + 30
          );

        shootingStars.forEach((star) => {
          star.trail.forEach((point: any) => {
            ctx!.save();
            ctx!.translate(point.x, point.y);
            ctx!.rotate((star.angle * Math.PI) / 180);
            ctx!.translate(-point.x, -point.y);

            ctx!.fillStyle = `rgba(180, 242, 255, ${point.opacity})`;
            ctx!.fillRect(point.x, point.y, shootingStarPixelSize, shootingStarPixelSize);
            ctx!.restore();
          });

          const starWidth = 4;
          const starHeight = 2;

          ctx!.save();
          ctx!.translate(star.x, star.y);
          ctx!.rotate((star.angle * Math.PI) / 180);
          ctx!.translate(-star.x, -star.y);

          ctx!.fillStyle = '#ffffff';
          ctx!.globalAlpha = 1.0;

          for (let y = 0; y < starHeight; y++) {
            for (let x = 0; x < starWidth; x++) {
              if ((x === 0 && y === 1) || (x === 3 && y === 0)) continue;
              ctx!.fillRect(
                star.x + x * shootingStarPixelSize,
                star.y + y * shootingStarPixelSize,
                shootingStarPixelSize,
                shootingStarPixelSize
              );
            }
          }

          ctx!.restore();
        });
      }

      animFrameId = requestAnimationFrame(animateCanvas);
    }

    initBackgroundStars();
    animFrameId = requestAnimationFrame(animateCanvas);

    const shootingStarTimer = setInterval(() => {
      if (!document.body.classList.contains('light-theme')) {
        const x = Math.random() * window.innerWidth;
        const angle = 45 + Math.random() * 90;
        shootingStars.push({
          id: Date.now(),
          x,
          y: 0,
          angle,
          scale: 1,
          speed: Math.random() * 5 + 8,
          distance: 0,
          trail: []
        });
      }
    }, 3500);

    const regenTimer = setInterval(regenerateBackgroundStars, starRegenerationInterval);

    const handleResize = () => {
      initBackgroundStars();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      clearInterval(shootingStarTimer);
      clearInterval(regenTimer);
      window.removeEventListener('resize', handleResize);
    };
  }, [isLightMode]);

  return (
    <canvas
      id="bg-pixel-stars"
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: -1
      }}
    />
  );
};
