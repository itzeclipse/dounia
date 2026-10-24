"use client";
import React from 'react';
import { useEffect, useRef } from "react";

interface CursorFXProps {
  enabled: boolean;
}

/** Zones where the native cursor must win (frames, text fields, media). */
const NATIVE_ZONE =
  "iframe, video, object, embed, input, textarea, select, [contenteditable='true'], [data-cursor='native']";

/**
 * Gaming cursor, rebuilt for low-end machines.
 *
 * - The arrow is written straight from pointermove (zero rAF latency), the
 *   trail alone is animated on a single requestAnimationFrame loop that stops
 *   as soon as it settles.
 * - No blur filters, no mix-blend-mode and no shadow animation: every layer is
 *   a composited transform.
 * - It never "disappears": over iframes, videos and text fields the native
 *   pointer is restored instead of hiding both.
 */
export function CursorFX({ enabled }: CursorFXProps) {
  const arrowRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const trailRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const shell = document.documentElement;
    const arrow = arrowRef.current;
    const ring = ringRef.current;
    const trail = trailRef.current;
    if (!arrow || !ring || !trail) return;

    let px = -200;
    let py = -200;
    let tx = -200;
    let ty = -200;
    let raf = 0;
    let shown = false;
    let painting = false;
    let native = false;
    let pressed = false;

    const settle = () => {
      if (Math.abs(px - tx) < 0.3 && Math.abs(py - ty) < 0.3) {
        tx = px;
        ty = py;
        trail.style.transform = `translate3d(${px}px, ${py}px, 0)`;
        painting = false;
        raf = 0;
        return;
      }
      painting = true;
      raf = requestAnimationFrame(settle);
      tx += (px - tx) * 0.22;
      ty += (py - ty) * 0.22;
      trail.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    };

    const show = () => {
      if (shown) return;
      shown = true;
      // Only now is the native pointer safe to hide: before the first move there
      // is no custom arrow on screen, so hiding it would leave the page without
      // any cursor at all.
      shell.classList.add("d-gcursor-live");
      arrow.style.opacity = "1";
      ring.style.opacity = "1";
      trail.style.opacity = "0.9";
    };

    const hide = () => {
      if (!shown) return;
      shown = false;
      shell.classList.remove("d-gcursor-live");
      arrow.style.opacity = "0";
      ring.style.opacity = "0";
      trail.style.opacity = "0";
    };

    const setNative = (next: boolean) => {
      if (native === next) return;
      native = next;
      shell.classList.toggle("d-gcursor-native", next);
      if (next) hide();
      else show();
    };

    const place = (x: number, y: number) => {
      px = x;
      py = y;
      arrow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      ring.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (!painting) {
        tx = x;
        ty = y;
        trail.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }
    };

    const onMove = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const inNative = Boolean(target && typeof target.closest === "function" && target.closest(NATIVE_ZONE));
      setNative(inNative);
      if (inNative) return;
      if (!shown) {
        tx = event.clientX;
        ty = event.clientY;
        show();
      }
      place(event.clientX, event.clientY);
      if (!painting) {
        painting = true;
        raf = requestAnimationFrame(settle);
      }
    };

    const onDown = () => {
      pressed = true;
      arrow.classList.add("press");
      if (!shown) return;
      // Web Animations API: restarts cleanly without forcing a reflow.
      ring.animate(
        [
          { transform: `${ring.style.transform} scale(1)`, opacity: 1 },
          { transform: `${ring.style.transform} scale(1.65)`, opacity: 0.25, offset: 0.55 },
          { transform: `${ring.style.transform} scale(1)`, opacity: 1 },
        ],
        { duration: 420, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      );
    };

    const onUp = () => {
      if (!pressed) return;
      pressed = false;
      arrow.classList.remove("press");
    };

    const onOut = (event: MouseEvent) => {
      if (event.relatedTarget) return;
      hide();
    };

    const onBlur = () => hide();

    window.addEventListener("pointermove", onMove, { passive: true });
    // Fallback: a few Chromebook / iframe edge cases drop pointermove for a
    // frame; mousemove carries the same coordinates and re-syncs the arrow.
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    document.addEventListener("pointerout", onOut);
    document.addEventListener("mouseleave", onOut);
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("mouseleave", onOut);
      window.removeEventListener("blur", onBlur);
      if (raf) cancelAnimationFrame(raf);
      shell.classList.remove("d-gcursor-native");
      shell.classList.remove("d-gcursor-live");
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="d-gcursor-layer" aria-hidden="true">
      <div className="d-gcursor-trail" ref={trailRef} />
      <div className="d-gcursor-ring" ref={ringRef} />
      <div className="d-gcursor" ref={arrowRef}>
        <svg viewBox="0 0 30 34" width="28" height="32" focusable="false">
          <path
            d="M5 2 L24.5 17.2 L15.2 18.9 L20.6 30.4 L16 32.4 L10.6 20.9 L5 26.4 Z"
            fill="#ffffff"
            stroke="#6d28d9"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path d="M8.6 6.4 L19.2 15.4 L13.6 16.3 Z" fill="#c084fc" />
        </svg>
      </div>
    </div>
  );
}
