import React, { useEffect, useRef } from 'react';

interface SpeedGraphProps {
  speedHistory: number[];
  currentSpeed: number;
}

export const SpeedGraph: React.FC<SpeedGraphProps> = ({ speedHistory }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (speedHistory.length < 2) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(132, 206, 25, 0.2)';
      ctx.lineWidth = 1;
      ctx.moveTo(0, height - 1);
      ctx.lineTo(width, height - 1);
      ctx.stroke();
      return;
    }

    const maxVal = Math.max(...speedHistory, 1024 * 100);
    const stepX = width / (speedHistory.length - 1);

    // Subtle lime/green fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(132, 206, 25, 0.18)');
    gradient.addColorStop(1, 'rgba(132, 206, 25, 0.0)');

    ctx.beginPath();
    ctx.moveTo(0, height);

    for (let i = 0; i < speedHistory.length; i++) {
      const x = i * stepX;
      const y = height - (speedHistory[i] / maxVal) * (height - 4) - 2;
      if (i === 0) ctx.lineTo(x, y);
      else {
        const prevX = (i - 1) * stepX;
        const prevY = height - (speedHistory[i - 1] / maxVal) * (height - 4) - 2;
        const cpX = (prevX + x) / 2;
        ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    }

    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Brand Green stroke (#84ce19)
    ctx.beginPath();
    for (let i = 0; i < speedHistory.length; i++) {
      const x = i * stepX;
      const y = height - (speedHistory[i] / maxVal) * (height - 4) - 2;
      if (i === 0) ctx.moveTo(x, y);
      else {
        const prevX = (i - 1) * stepX;
        const prevY = height - (speedHistory[i - 1] / maxVal) * (height - 4) - 2;
        const cpX = (prevX + x) / 2;
        ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
      }
    }

    ctx.strokeStyle = '#84ce19';
    ctx.lineWidth = 1.5;
    ctx.stroke();

  }, [speedHistory]);

  return (
    <div className="h-8 w-full flex items-center relative overflow-hidden">
      <canvas
        ref={canvasRef}
        width={220}
        height={32}
        className="w-full h-full block"
      />
    </div>
  );
};
