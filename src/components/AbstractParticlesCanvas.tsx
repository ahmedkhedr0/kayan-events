import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulseOffset: number;
  color: string;
  isAccent: boolean;
}

interface AbstractParticlesCanvasProps {
  particleCount?: number;
  interactiveRadius?: number;
  connectDistance?: number;
  className?: string;
}

export const AbstractParticlesCanvas: React.FC<AbstractParticlesCanvasProps> = ({
  particleCount = 65,
  interactiveRadius = 135,
  connectDistance = 110,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number | null; y: number | null; isActive: boolean }>({
    x: null,
    y: null,
    isActive: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Kayan brand palette: Radiant golds, amber, bronze, with occasional emerald telemetry accent
    const colors = [
      '#f59e0b', // Amber 500
      '#fbbf24', // Amber 400
      '#d97706', // Amber 600
      '#fcd34d', // Amber 300
      '#eab308', // Yellow 500
    ];

    const particles: Particle[] = [];

    const initParticles = () => {
      particles.length = 0;
      const count = Math.min(particleCount, Math.floor((width * height) / 14000) || 45);

      for (let i = 0; i < count; i++) {
        const isAccent = Math.random() < 0.12; // 12% emerald cloud telemetry nodes
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.55,
          vy: (Math.random() - 0.5) * 0.55,
          size: Math.random() * 2.2 + 1.2,
          baseAlpha: Math.random() * 0.45 + 0.35,
          pulseSpeed: Math.random() * 0.025 + 0.015,
          pulseOffset: Math.random() * Math.PI * 2,
          color: isAccent ? '#10b981' : colors[Math.floor(Math.random() * colors.length)],
          isAccent,
        });
      }
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initParticles();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.isActive = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
        mouseRef.current.isActive = true;
      }
    };

    const handleMouseLeave = () => {
      mouseRef.current.isActive = false;
      mouseRef.current.x = null;
      mouseRef.current.y = null;
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    window.addEventListener('touchend', handleMouseLeave, { passive: true });

    initParticles();

    let time = 0;

    const render = () => {
      time += 0.016;
      ctx.clearRect(0, 0, width, height);

      const mouse = mouseRef.current;

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Organic pulse
        const currentAlpha = p.baseAlpha + Math.sin(time * p.pulseSpeed * 60 + p.pulseOffset) * 0.15;

        // Position update
        p.x += p.vx;
        p.y += p.vy;

        // Screen wrap-around with smooth buffer
        if (p.x < -20) p.x = width + 20;
        else if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        else if (p.y > height + 20) p.y = -20;

        // Interactive mouse dynamics
        if (mouse.isActive && mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.hypot(dx, dy);

          if (dist < interactiveRadius) {
            // Gentle repulsive/orbital force
            const force = (1 - dist / interactiveRadius) * 0.9;
            const angle = Math.atan2(dy, dx);
            p.x -= Math.cos(angle) * force * 1.5;
            p.y -= Math.sin(angle) * force * 1.5;

            // Draw interactive golden thread between cursor and particle
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(mouse.x, mouse.y);
            const lineAlpha = (1 - dist / interactiveRadius) * 0.45;
            ctx.strokeStyle = p.isAccent
              ? `rgba(16, 185, 129, ${lineAlpha})`
              : `rgba(251, 191, 36, ${lineAlpha})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
            ctx.restore();
          }
        }

        // Draw particle node
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0.15, Math.min(1, currentAlpha));
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 3.5;
        ctx.fill();
        ctx.restore();

        // Connect nearby particles with subtle golden glowing lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);

          if (dist < connectDistance) {
            const lineAlpha = (1 - dist / connectDistance) * 0.22;
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle =
              p.isAccent || p2.isAccent
                ? `rgba(16, 185, 129, ${lineAlpha})`
                : `rgba(245, 158, 11, ${lineAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // Draw subtle cursor pulse if active
      if (mouse.isActive && mouse.x !== null && mouse.y !== null) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.globalAlpha = 0.75;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 12;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 18, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchend', handleMouseLeave);
    };
  }, [particleCount, interactiveRadius, connectDistance]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none z-0 ${className}`}
      style={{ width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  );
};
