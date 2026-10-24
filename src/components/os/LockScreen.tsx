"use client";
import React from 'react';

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_WALLPAPER, type Wallpaper } from "@/lib/os/data";
import type { ClockValue } from "@/lib/os/hooks";
import { WallpaperLayer } from "./WallpaperLayer";

interface LockScreenProps {
  wallpaper: Wallpaper;
  clock: ClockValue;
  onUnlock: () => void;
}

/** CineOS-style lock screen: day, date, time, click or key to slide up. */
export function LockScreen({ wallpaper, clock, onUnlock }: LockScreenProps) {
  const [unlocking, setUnlocking] = useState(false);

  const unlock = useCallback(() => {
    if (unlocking) return;
    setUnlocking(true);
    window.setTimeout(onUnlock, 620);
  }, [onUnlock, unlocking]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === "Escape" || event.key === " ") {
        event.preventDefault();
        unlock();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unlock]);

  return (
    <section
      className={`d-lock${unlocking ? " unlocking" : ""}`}
      onClick={unlock}
      role="button"
      tabIndex={0}
      aria-label="Desbloquear Dounia OS"
      onKeyDown={(event) => {
        if (event.key === "Enter") unlock();
      }}
    >
      <WallpaperLayer wallpaper={wallpaper} fallback={DEFAULT_WALLPAPER} />
      <div className="d-lock-ui">
        <h1 className="d-lock-day">{clock.weekday || "DOUNIA"}</h1>
        <p className="d-lock-date">{clock.date || "Dounia OS v3"}</p>
        <p className="d-lock-time">- {clock.time} -</p>
      </div>
      <span className="d-lock-hint">Pulsa para desbloquear</span>
    </section>
  );
}
