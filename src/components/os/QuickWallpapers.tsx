"use client";
import React from 'react';

import { useMemo, useState } from "react";
import {
  WALLPAPERS,
  WALL_CATEGORY_LABEL,
  type WallCategory,
  type Wallpaper,
} from "@/lib/os/data";
import { IconClose, IconImage, IconRefresh } from "./icons";

interface QuickWallpapersProps {
  appliedHome: string;
  onApply: (wallpaper: Wallpaper) => void;
  onClose: () => void;
}

/**
 * Double-click quick switcher: the whole wallpaper library as a living mosaic.
 * Tap a tile and the desktop repaints instantly, without leaving the desktop.
 */
export function QuickWallpapers({ appliedHome, onApply, onClose }: QuickWallpapersProps) {
  const [filter, setFilter] = useState<WallCategory | "all">("all");

  const categories = useMemo(() => {
    const seen: WallCategory[] = [];
    WALLPAPERS.forEach((wallpaper) => {
      if (!seen.includes(wallpaper.category)) seen.push(wallpaper.category);
    });
    return seen;
  }, []);

  const visible = useMemo(
    () => (filter === "all" ? WALLPAPERS : WALLPAPERS.filter((wallpaper) => wallpaper.category === filter)),
    [filter],
  );

  const surprise = () => {
    const index = Math.floor(Math.random() * WALLPAPERS.length);
    onApply(WALLPAPERS[index]);
  };

  return (
    <div className="d-qs" role="dialog" aria-label="Cambiar fondo de pantalla">
      <button type="button" className="d-qs-backdrop" aria-label="Cerrar" onClick={onClose} />
      <div className="d-qs-panel">
        <header className="d-qs-head">
          <div>
            <p className="d-qs-eyebrow">Doble clic · cambio rápido</p>
            <h2>Cambiar fondo</h2>
            <p className="d-qs-sub">Toca un fondo y se aplica al escritorio y al bloqueo al instante.</p>
          </div>
          <div className="d-qs-actions">
            <button type="button" className="d-btn" onClick={surprise}>
              <IconRefresh /> Sorpréndeme
            </button>
            <button type="button" className="d-mini-btn" aria-label="Cerrar" onClick={onClose}>
              <IconClose />
            </button>
          </div>
        </header>

        <div className="d-qs-filters">
          <button type="button" className={`d-chip${filter === "all" ? " on" : ""}`} onClick={() => setFilter("all")}>
            Todos · {WALLPAPERS.length}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`d-chip${filter === category ? " on" : ""}`}
              onClick={() => setFilter(category)}
            >
              {WALL_CATEGORY_LABEL[category]}
            </button>
          ))}
        </div>

        <div className="d-qs-grid">
          {visible.map((wallpaper) => (
            <button
              key={wallpaper.id}
              type="button"
              className={`d-qs-tile${appliedHome === wallpaper.id ? " on" : ""}`}
              onClick={() => onApply(wallpaper)}
              title={`${wallpaper.name} · ${WALL_CATEGORY_LABEL[wallpaper.category]}`}
            >
              <span className="d-qs-prev">
                {wallpaper.type === "gradient" && <span className="d-qs-flat" style={{ background: wallpaper.src }} />}
                {wallpaper.type === "live" && <span className={`d-live d-live-${wallpaper.src}`} />}
                {wallpaper.type === "image" && <WallpaperImageThumb wallpaper={wallpaper} />}
                {wallpaper.type === "video" && <WallpaperVideoThumb wallpaper={wallpaper} />}
                {appliedHome === wallpaper.id && <span className="d-qs-check">●</span>}
              </span>
              <span className="d-qs-meta">
                <strong>{wallpaper.name}</strong>
                <small>{WALL_CATEGORY_LABEL[wallpaper.category]}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Still preview that never leaves an empty tile if the file cannot load. */
function WallpaperImageThumb({ wallpaper }: { wallpaper: Wallpaper }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        className="d-qs-flat"
        style={{ background: "linear-gradient(135deg,#2a1140 0%,#0b0713 60%,#050308 100%)" }}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={wallpaper.src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Video wallpapers used to render a generic icon, so the whole CineOS section
 * looked empty. The browser now paints the real first frame (#t=0.1), which is
 * a tiny metadata request over our own /api/wall proxy.
 */
function WallpaperVideoThumb({ wallpaper }: { wallpaper: Wallpaper }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="d-qs-flat d-qs-video">
        <IconImage />
      </span>
    );
  }
  return (
    <span className="d-qs-flat d-qs-video">
      <video
        src={`${wallpaper.src}#t=0.1`}
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        onError={() => setFailed(true)}
      />
      <i className="d-qs-playdot" aria-hidden="true" />
    </span>
  );
}
