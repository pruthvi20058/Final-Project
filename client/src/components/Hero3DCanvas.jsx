import React, { useEffect, useRef } from 'react';

export default function Hero3DCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse interactive tracking
    let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 3D Particles & Neural Nodes
    const numParticles = 80;
    const particles = [];
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: (Math.random() - 0.5) * width * 1.2,
        y: (Math.random() - 0.5) * height * 1.2,
        z: Math.random() * 1000 + 1,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.8,
        vz: (Math.random() - 0.5) * 1.5,
        radius: Math.random() * 2.5 + 1,
        color: i % 3 === 0 ? '#00d4aa' : i % 3 === 1 ? '#6366f1' : '#38bdf8'
      });
    }

    // 3D DNA Double Helix Nodes
    const dnaPoints = [];
    const dnaLength = 36;
    for (let i = 0; i < dnaLength; i++) {
      const t = (i / dnaLength) * Math.PI * 4;
      dnaPoints.push({
        t,
        y: (i - dnaLength / 2) * 16,
        radius: 70
      });
    }

    let angleY = 0;
    let angleX = 0;

    const render = () => {
      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      const normMouseX = (mouse.x / width - 0.5) * 2;
      const normMouseY = (mouse.y / height - 0.5) * 2;

      angleY += 0.008 + normMouseX * 0.005;
      angleX = normMouseY * 0.3;

      ctx.clearRect(0, 0, width, height);

      // Center origin for 3D projection
      const cx = width / 2;
      const cy = height / 2;
      const fov = 400;

      // 1. Draw 3D Neural Constellation Connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move particles
        p.z -= p.vz;
        if (p.z <= 1) p.z = 1000;
        if (p.z > 1000) p.z = 1;
        p.x += p.vx;
        p.y += p.vy;

        if (Math.abs(p.x) > width) p.vx *= -1;
        if (Math.abs(p.y) > height) p.vy *= -1;

        const scale = fov / (fov + p.z);
        const px = cx + (p.x + normMouseX * 40) * scale;
        const py = cy + (p.y + normMouseY * 40) * scale;

        // Render Connections
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const scale2 = fov / (fov + p2.z);
          const p2x = cx + (p2.x + normMouseX * 40) * scale2;
          const p2y = cy + (p2.y + normMouseY * 40) * scale2;

          const dist = Math.hypot(px - p2x, py - p2y);
          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.25 * scale;
            ctx.strokeStyle = `rgba(0, 212, 170, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(p2x, p2y);
            ctx.stroke();
          }
        }

        // Render Particle Node
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.min(1, scale * 1.5);
        ctx.beginPath();
        ctx.arc(px, py, p.radius * scale * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // 2. Draw Rotating Holographic 3D DNA Helix on the right center
      const dnaCenterX = cx + (width > 800 ? width * 0.25 : 0);
      const dnaCenterY = cy;

      for (let i = 0; i < dnaPoints.length; i++) {
        const pt = dnaPoints[i];
        const currentAngle = pt.t + angleY * 1.5;

        // Strand 1
        const x1 = Math.cos(currentAngle) * pt.radius;
        const z1 = Math.sin(currentAngle) * pt.radius;

        // Strand 2 (180 deg offset)
        const x2 = Math.cos(currentAngle + Math.PI) * pt.radius;
        const z2 = Math.sin(currentAngle + Math.PI) * pt.radius;

        // Pitch tilt
        const rotatedY1 = pt.y * Math.cos(angleX) - z1 * Math.sin(angleX);
        const rotatedZ1 = pt.y * Math.sin(angleX) + z1 * Math.cos(angleX);

        const rotatedY2 = pt.y * Math.cos(angleX) - z2 * Math.sin(angleX);
        const rotatedZ2 = pt.y * Math.sin(angleX) + z2 * Math.cos(angleX);

        const scale1 = fov / (fov + rotatedZ1 + 300);
        const scale2 = fov / (fov + rotatedZ2 + 300);

        const px1 = dnaCenterX + x1 * scale1;
        const py1 = dnaCenterY + rotatedY1 * scale1;

        const px2 = dnaCenterX + x2 * scale2;
        const py2 = dnaCenterY + rotatedY2 * scale2;

        // Draw Base Pair Connecting Rung
        ctx.strokeStyle = `rgba(99, 102, 241, ${(scale1 + scale2) * 0.25})`;
        ctx.lineWidth = 1.5 * scale1;
        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.stroke();

        // Draw Nucleotide Strand 1 Node (Cyan Glow)
        ctx.fillStyle = '#00d4aa';
        ctx.shadowColor = '#00d4aa';
        ctx.shadowBlur = 8 * scale1;
        ctx.beginPath();
        ctx.arc(px1, py1, 4 * scale1, 0, Math.PI * 2);
        ctx.fill();

        // Draw Nucleotide Strand 2 Node (Purple Glow)
        ctx.fillStyle = '#818cf8';
        ctx.shadowColor = '#818cf8';
        ctx.shadowBlur = 8 * scale2;
        ctx.beginPath();
        ctx.arc(px2, py2, 4 * scale2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0; // reset blur
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0
      }}
    />
  );
}
