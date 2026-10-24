"use client";
import React from 'react';

import { useEffect, useState } from "react";
import type { Wallpaper } from "@/lib/os/data";

interface WallpaperLayerProps {
  wallpaper: Wallpaper;
  /** Used when a remote video cannot load (offline / CDN issue). */
  fallback?: Wallpaper;
  /** Show the first frame without playing the video (eco / light background). */
  still?: boolean;
}

/**
 * Renders the live desktop background: video, still image (with Ken Burns
 * motion), gradient or a pure-CSS animated scene.
 */
export function WallpaperLayer({ wallpaper, fallback, still = false }: WallpaperLayerProps) {
  const [broken, setBroken] = useState(false);
  const active = broken && fallback ? fallback : wallpaper;

  useEffect(() => {
    setBroken(false);
  }, [wallpaper.id]);

  if (active.type === "live") {
    return (
      <div className="d-wall d-wall-live" aria-hidden="true">
        <div className={`d-live d-live-${active.src}`} />
      </div>
    );
  }

  if (active.type === "gradient") {
    return <div className="d-wall" style={{ background: active.src }} aria-hidden="true" />;
  }

  if (active.type === "video") {
    return (
      <div className="d-wall" aria-hidden="true">
        <video
          key={`${active.id}-${still ? "still" : "play"}`}
          src={`${active.src}${still ? "#t=0.1" : ""}`}
          autoPlay={!still}
          loop
          muted
          playsInline
          preload={still ? "metadata" : "auto"}
          onLoadedMetadata={(event) => {
            if (still) event.currentTarget.currentTime = 0.1;
          }}
          onError={() => setBroken(true)}
        />
      </div>
    );
  }

  return (
    <div className="d-wall" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={active.id}
        src={active.src}
        alt=""
        draggable={false}
        className={active.motion ? "d-wall-motion" : undefined}
        onError={() => setBroken(true)}
      />
    </div>
  );
}
