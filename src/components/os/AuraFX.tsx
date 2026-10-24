"use client";
import React from 'react';

import { useEffect, useRef } from "react";

interface AuraFXProps {
  parallax: boolean;
  glow: boolean;
  sounds: boolean;
}

/**
 * Ambient layer of the OS: pointer parallax on the wallpaper, a soft light that
 * follows the cursor and short synthesised UI blips (no audio files needed).
 */
export function AuraFX({ parallax, glow, sounds }: AuraFXProps) {
  const glowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!parallax && !glow) return;
    const root = document.querySelector<HTMLElement>(".d-os");
    if (!root) return;

    let frame = 0;
    let glowX = -999;
    let glowY = -999;
    let lastParallax = 0;
    const onMove = (event: PointerEvent) => {
      glowX = event.clientX;
      glowY = event.clientY;
      // The wallpaper parallax repaints a full-screen layer, so it is throttled
      // to ~12fps. The light follows the pointer at full speed in the rAF below.
      if (parallax && performance.now() - lastParallax > 80) {
        lastParallax = performance.now();
        root.style.setProperty("--aura-x", (glowX / window.innerWidth - 0.5).toFixed(3));
        root.style.setProperty("--aura-y", (glowY / window.innerHeight - 0.5).toFixed(3));
      }
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (glowRef.current) {
          glowRef.current.style.transform = `translate3d(${glowX - 210}px, ${glowY - 210}px, 0)`;
        }
      });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [parallax, glow]);

  useEffect(() => {
    if (!sounds) return;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    let context: AudioContext | null = null;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("button, a, .d-icon, .d-dock-item")) return;
      try {
        context = context ?? new Ctor();
        if (context.state === "suspended") void context.resume();
        const now = context.currentTime;
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(680, now);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.12);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.045, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
        osc.connect(gain);
        gain.connect(context.destination);
        osc.start(now);
        osc.stop(now + 0.16);
      } catch {
        /* audio blocked: silence is fine */
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [sounds]);

  return glow ? <div ref={glowRef} className="d-aura-glow" aria-hidden="true" /> : null;
}
