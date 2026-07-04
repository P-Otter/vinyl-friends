// Konfetti in Theme-Farben — Port von ConfettiView (iOS Theme.swift, Canvas-basiert).
import { useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';

export default function Confetti() {
  const t = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const colors = [t.accent, t.highlight, t.good, t.text];
    const start = performance.now();
    let raf = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (now: number) => {
      const time = (now - start) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < 80; i++) {
        const fi = i;
        const x = (fi * 47.3) % canvas.width;
        const speed = 130 + ((fi * 17) % 160);
        const y = ((time * speed + fi * 61) % (canvas.height + 40)) - 20;
        const rotation = ((time * 200 + fi * 40) * Math.PI) / 180;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.fillStyle = colors[i % colors.length];
        ctx.fillRect(-4, -2.5, 8, 5);
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [t]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60]"
      aria-hidden
    />
  );
}
