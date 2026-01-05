import React, { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

interface ShootingStar {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  angle: number;
}

// Big sparkly diamond stars
interface DiamondStar {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  pulseSpeed: number;
  baseOpacity: number;
}

export const SpaceBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const stars: Star[] = [];
    const shootingStars: ShootingStar[] = [];
    const diamondStars: DiamondStar[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
      initDiamondStars();
    };

    const initStars = () => {
      stars.length = 0;
      // Reduced star count (divide by 6000 instead of 3000)
      const count = Math.floor((canvas.width * canvas.height) / 6000);
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          // Larger stars (2.5 + 1 instead of 1.5 + 0.5)
          size: Math.random() * 2.5 + 1,
          opacity: Math.random() * 0.9 + 0.3,
          speed: Math.random() * 0.5 + 0.1,
        });
      }
    };

    const createShootingStar = () => {
      // Much more frequent (0.015 instead of 0.002), more concurrent (5 instead of 3)
      if (Math.random() < 0.015 && shootingStars.length < 5) {
        shootingStars.push({
          x: Math.random() * canvas.width * 0.8,
          y: Math.random() * canvas.height * 0.3,
          // Longer trails
          length: Math.random() * 120 + 80,
          speed: Math.random() * 10 + 8,
          opacity: 1,
          angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
        });
      }
    };

    // Initialize big diamond stars (5-8 of them)
    const initDiamondStars = () => {
      diamondStars.length = 0;
      const count = Math.floor(Math.random() * 4) + 5; // 5-8 diamond stars
      for (let i = 0; i < count; i++) {
        diamondStars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 150 + 50, // 50-200px (more variation)
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.01, // slower rotation
          pulseSpeed: Math.random() * 0.4 + 0.2, // very slow pulse (0.2-0.6)
          baseOpacity: Math.random() * 0.4 + 0.5,
        });
      }
    };

    // Draw a 4-pointed diamond/sparkle shape
    const drawDiamond = (x: number, y: number, size: number, rotation: number, opacity: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      
      // Main 4-pointed star shape
      ctx.beginPath();
      const points = 4;
      const outerRadius = size;
      const innerRadius = size * 0.2;
      
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / points - Math.PI / 2;
        if (i === 0) {
          ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        } else {
          ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
      }
      ctx.closePath();
      
      // Gradient fill from center
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
      gradient.addColorStop(0.3, `rgba(255, 220, 120, ${opacity * 0.8})`);
      gradient.addColorStop(0.6, `rgba(255, 180, 80, ${opacity * 0.5})`);
      gradient.addColorStop(1, `rgba(255, 150, 50, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.shadowBlur = size * 0.8;
      ctx.shadowColor = 'rgba(255, 200, 100, 0.8)';
      ctx.fill();
      
      // Inner bright core
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.15, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
      ctx.shadowBlur = size * 0.5;
      ctx.shadowColor = 'rgba(255, 255, 255, 1)';
      ctx.fill();
      
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw stars with twinkling
      const time = Date.now() * 0.001;
      stars.forEach((star) => {
        const twinkle = Math.sin(time * star.speed * 3 + star.x) * 0.3 + 0.7;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        // Golden/amber color for better visibility
        ctx.fillStyle = `rgba(255, 180, 60, ${star.opacity * twinkle})`;
        ctx.fill();
        // Add glow effect
        ctx.shadowBlur = star.size * 3;
        ctx.shadowColor = 'rgba(255, 150, 50, 0.6)';
      });
      ctx.shadowBlur = 0;

      // Draw big diamond sparkle stars
      diamondStars.forEach((ds) => {
        const pulse = Math.sin(time * ds.pulseSpeed) * 0.3 + 0.7;
        const currentOpacity = ds.baseOpacity * pulse;
        ds.rotation += ds.rotationSpeed;
        drawDiamond(ds.x, ds.y, ds.size * pulse, ds.rotation, currentOpacity);
      });
      ctx.shadowBlur = 0;

      // Draw shooting stars
      createShootingStar();
      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const ss = shootingStars[i];
        const gradient = ctx.createLinearGradient(
          ss.x, ss.y,
          ss.x - Math.cos(ss.angle) * ss.length,
          ss.y - Math.sin(ss.angle) * ss.length
        );
        // Orange-red gradient for shooting stars
        gradient.addColorStop(0, `rgba(255, 100, 50, ${ss.opacity})`);
        gradient.addColorStop(0.3, `rgba(255, 150, 50, ${ss.opacity * 0.8})`);
        gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');

        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(
          ss.x - Math.cos(ss.angle) * ss.length,
          ss.y - Math.sin(ss.angle) * ss.length
        );
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();

        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;
        ss.opacity -= 0.015;

        if (ss.opacity <= 0 || ss.x > canvas.width || ss.y > canvas.height) {
          shootingStars.splice(i, 1);
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Warm Space Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-100 to-orange-200" />
      <div className="absolute inset-0 bg-gradient-to-t from-violet-200/30 via-transparent to-amber-100/50" />
      <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-gradient-radial from-orange-300/40 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-gradient-radial from-violet-300/30 to-transparent rounded-full blur-3xl" />
      
      {/* Stars Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 opacity-60" />
      
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/40 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${10 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
          25% { transform: translateY(-20px) translateX(10px); opacity: 0.8; }
          50% { transform: translateY(-10px) translateX(-5px); opacity: 0.6; }
          75% { transform: translateY(-30px) translateX(5px); opacity: 0.9; }
        }
        .animate-float { animation: float 15s ease-in-out infinite; }
      `}</style>
    </div>
  );
};
