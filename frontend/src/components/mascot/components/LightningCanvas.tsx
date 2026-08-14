import React, { useEffect, useRef } from 'react';

export const LightningCanvas: React.FC<{ bunnyX: number; bunnyY: number }> = ({ bunnyX, bunnyY }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (canvas) {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', onResize);

    const tx = (bunnyX / 100) * w;
    const ty = h - bunnyY - 25;

    const makeBolt = (x1: number, y1: number, x2: number, y2: number, rough: number) => {
      const pts: { x: number; y: number }[] = [{ x: x1, y: y1 }];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const steps = Math.max(8, Math.floor(Math.hypot(dx, dy) / 25));
      for (let i = 1; i < steps; i++) {
        const r = i / steps;
        pts.push({
          x: x1 + dx * r + (Math.random() - 0.5) * rough * 30,
          y: y1 + dy * r + (Math.random() - 0.5) * rough * 12
        });
      }
      pts.push({ x: x2, y: y2 });
      return pts;
    };

    let flashA = 0, lastT = 0;
    let bolts: { pts: { x: number; y: number }[]; main: boolean }[] = [];

    const render = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      if (t - lastT > 130 + Math.random() * 120) {
        lastT = t;
        flashA = 0.4;
        bolts = [];
        const sx = tx + (Math.random() - 0.5) * w * 0.4;
        const main = makeBolt(sx, 0, tx, ty, 1.8);
        bolts.push({ pts: main, main: true });
        for (let i = 1; i < main.length - 2; i += 2) {
          if (Math.random() > 0.35) {
            bolts.push({
              pts: makeBolt(
                main[i].x,
                main[i].y,
                main[i].x + (Math.random() - 0.5) * 280,
                main[i].y + Math.random() * 220 + 60,
                1.4
              ),
              main: false
            });
          }
        }
      }
      if (flashA > 0) {
        ctx.fillStyle = `rgba(255,255,235,${flashA})`;
        ctx.fillRect(0, 0, w, h);
        flashA *= 0.82;
      }
      bolts.forEach(({ pts, main }) => {
        if (pts.length < 2) return;
        [
          [main ? 'rgba(245,158,11,0.6)' : 'rgba(192,132,252,0.5)', main ? 16 : 8, main ? '#f59e0b' : '#c084fc', 35],
          [main ? '#fde047' : '#f0abfc', main ? 6 : 3, '', 15],
          ['#ffffff', main ? 3 : 1.5, '', 0]
        ].forEach(([color, lw, shadow, blur]) => {
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
          ctx.strokeStyle = color as string;
          ctx.lineWidth = lw as number;
          ctx.shadowColor = shadow as string;
          ctx.shadowBlur = blur as number;
          ctx.stroke();
        });
      });
      ctx.save();
      ctx.beginPath();
      ctx.arc(tx, ty, 42 + Math.random() * 18, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245,158,11,0.8)';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 25;
      ctx.stroke();
      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animId);
    };
  }, [bunnyX, bunnyY]);

  return <canvas ref={canvasRef} className="fixed inset-0 z-[999] pointer-events-none w-full h-full" />;
};
