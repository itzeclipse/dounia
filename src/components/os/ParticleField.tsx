"use client";
import React from 'react';

import { useEffect, useRef } from "react";

const COLORS = ["#a855f7", "#22d3ee", "#ec4899", "#e9d5ff", "#f0abfc", "#7c3aed"];

interface DriftParticle {
  baseX: number; // 0..100 (percent of viewport width)
  baseY: number; // 0..100 (percent of viewport height)
  z: number; // depth 0..1
  radius: number;
  ampX: number;
  ampY: number;
  freqX: number;
  freqY: number;
  phaseX: number;
  phaseY: number;
  color: string;
  twinkle: number;
  phaseT: number;
}

/**
 * A living field of drifting, glowing particles behind the wordmark. Each
 * point follows its own independent sine path, sits at its own depth (near
 * points bigger and brighter, far points small and dim) and parallax-shifts
 * against the cursor — ambient depth without a single repeating loop.
 */
export const ParticleField = React.memo(function ParticleField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const COUNT = 240;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let particles: DriftParticle[] = [];
    let raf = 0;
    const start = performance.now();
    const mouse = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    particles = Array.from({ length: COUNT }, () => ({
      baseX: Math.random() * 100,
      baseY: Math.random() * 100,
      z: Math.random(),
      radius: 0.35 + Math.random() * 2.4,
      ampX: 0.4 + Math.random() * 2.2,
      ampY: 0.4 + Math.random() * 2.2,
      freqX: 0.18 + Math.random() * 0.7,
      freqY: 0.18 + Math.random() * 0.7,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      twinkle: 0.5 + Math.random() * 0.5,
      phaseT: Math.random() * Math.PI * 2,
    }));

    const draw = (now: number) => {
      const t = (now - start) * 0.001;
      mouse.x += (target.x - mouse.x) * 0.05;
      mouse.y += (target.y - mouse.y) * 0.05;

      ctx.clearRect(0, 0, width, height);

      for (const p of particles) {
        const dx = Math.sin(t * p.freqX + p.phaseX) * p.ampX;
        const dy = Math.sin(t * p.freqY + p.phaseY) * p.ampY;
        const parallax = 1 + p.z * 0.9;

        const sx = (p.baseX / 100) * width + dx * parallax - mouse.x * (p.z * 26);
        const sy = (p.baseY / 100) * height + dy * parallax - mouse.y * (p.z * 26);

        const size = p.radius * (0.4 + p.z * 1.4) * parallax;
        const alpha =
          (0.1 + p.z * 0.5) * (0.55 + 0.45 * Math.sin(t * 0.9 + p.phaseT) * p.twinkle);

        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 3);
        glow.addColorStop(0, p.color);
        glow.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(sx, sy, size * 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = Math.max(0, Math.min(1, alpha * 1.35));
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(sx, sy, size * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      raf = requestAnimationFrame(draw);
    };

    const onMove = (event: MouseEvent) => {
      target.x = (event.clientX / Math.max(1, width) - 0.5) * 2;
      target.y = (event.clientY / Math.max(1, height) - 0.5) * 2;
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return <canvas ref={ref} className="d-boot3-particles" aria-hidden="true" />;
});
