"use client";
import React from 'react';

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ORIGINAL_WALLPAPER,
  WALLPAPERS,
  WALL_CATEGORY_LABEL,
  type WallCategory,
  type Wallpaper,
} from "@/lib/os/data";
import { IconCheck, IconClose, IconRefresh, IconStar } from "./icons";

type ApplyTarget = "both" | "home" | "lock";
type Filter = "all" | WallCategory | "favoritos";

interface WallpaperStudioProps {
  appliedHome: string;
  appliedLock: string;
  favorites: string[];
  onApply: (wallpaper: Wallpaper, target: ApplyTarget) => void;
  onToggleFavorite: (id: string) => void;
  onRestoreOriginal: () => void;
  onClose: () => void;
}

const CATEGORIES = Object.keys(WALL_CATEGORY_LABEL) as WallCategory[];

export function WallpaperStudio({
  appliedHome,
  appliedLock,
  favorites,
  onApply,
  onToggleFavorite,
  onRestoreOriginal,
  onClose,
}: WallpaperStudioProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<Wallpaper>(
    () => WALLPAPERS.find((w) => w.id === appliedHome) ?? WALLPAPERS[0],
  );
  const [target, setTarget] = useState<ApplyTarget>("both");

  const list = useMemo(() => {
    if (filter === "all") return WALLPAPERS;
    if (filter === "favoritos") return WALLPAPERS.filter((w) => favorites.includes(w.id));
    return WALLPAPERS.filter((w) => w.category === filter);
  }, [filter, favorites]);

  const isApplied = selected.id === appliedHome || selected.id === appliedLock;

  return (
    <div
      className="d-studio"
      role="dialog"
      aria-modal="true"
      aria-label="Estudio de fondos"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="d-studio-panel">
        <header className="d-studio-head">
          <h2>Estudio de fondos</h2>
          <span className="d-spacer" />
          <div className="d-studio-toggles" role="group" aria-label="Dónde aplicar">
            {(
              [
                ["both", "Ambos"],
                ["home", "Escritorio"],
                ["lock", "Bloqueo"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={target === value ? "on" : ""}
                onClick={() => setTarget(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <button type="button" className="d-mini-btn" onClick={onClose} aria-label="Cerrar">
            <IconClose />
          </button>
        </header>

        <div className="d-studio-tabs" role="tablist" aria-label="Categorías">
          <button
            type="button"
            className={`d-chip${filter === "all" ? " on" : ""}`}
            onClick={() => setFilter("all")}
          >
            Todos ({WALLPAPERS.length})
          </button>
          <button
            type="button"
            className={`d-chip${filter === "favoritos" ? " on" : ""}`}
            onClick={() => setFilter("favoritos")}
          >
            Favoritos ({favorites.length})
          </button>
          {CATEGORIES.map((category) => (
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

        <div className="d-studio-body">
          <div className="d-studio-grid">
            {list.length === 0 ? (
              <p className="d-empty">
                Todavía no has marcado favoritos. Toca la estrella de cualquier fondo para guardarlo aquí.
              </p>
            ) : (
              list.map((wallpaper) => (
                <WallpaperCard
                  key={wallpaper.id}
                  wallpaper={wallpaper}
                  active={selected.id === wallpaper.id}
                  applied={wallpaper.id === appliedHome || wallpaper.id === appliedLock}
                  favorite={favorites.includes(wallpaper.id)}
                  onSelect={() => setSelected(wallpaper)}
                  onToggleFavorite={() => onToggleFavorite(wallpaper.id)}
                />
              ))
            )}
          </div>

          <aside className="d-studio-preview">
            <div className="d-preview-frame">
              <WallpaperPreview wallpaper={selected} autoplay />
            </div>
            <h3 className="d-preview-title">{selected.name}</h3>
            <p className="d-preview-meta">
              {WALL_CATEGORY_LABEL[selected.category]} ·{" "}
              {selected.type === "video"
                ? "Vídeo en bucle"
                : selected.type === "gradient"
                  ? "Vector"
                  : selected.type === "live"
                    ? "Animado en vivo"
                    : selected.motion
                      ? "Imagen con movimiento"
                      : "Imagen"}
            </p>
            <div className="d-preview-actions">
              <button type="button" className="d-btn primary" onClick={() => onApply(selected, target)}>
                <IconCheck /> {isApplied ? "Volver a aplicar" : "Aplicar fondo"}
              </button>
              <button
                type="button"
                className="d-btn"
                onClick={() => onToggleFavorite(selected.id)}
                aria-pressed={favorites.includes(selected.id)}
              >
                <IconStar
                  style={{
                    fill: favorites.includes(selected.id) ? "#fbbf24" : "none",
                    color: favorites.includes(selected.id) ? "#fbbf24" : "currentColor",
                  }}
                />
                {favorites.includes(selected.id) ? "Quitar de favoritos" : "Añadir a favoritos"}
              </button>
              <button type="button" className="d-btn" onClick={onRestoreOriginal}>
                <IconRefresh /> Restaurar fondo original
              </button>
            </div>
            <p className="d-gateway-note">
              Original: «{ORIGINAL_WALLPAPER.name}», el bucle de fábrica de CineOS. Los cambios se
              guardan en este navegador y se aplican al escritorio real.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

interface CardProps {
  wallpaper: Wallpaper;
  active: boolean;
  applied: boolean;
  favorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}

function WallpaperCard({ wallpaper, active, applied, favorite, onSelect, onToggleFavorite }: CardProps) {
  return (
    <div
      className={`d-wp-card${active ? " on" : ""}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      aria-label={`Fondo ${wallpaper.name}`}
    >
      <WallpaperPreview wallpaper={wallpaper} />
      <span className="d-wp-tag">
        {applied
          ? "Activo"
          : wallpaper.type === "video"
            ? "Vídeo"
            : wallpaper.type === "gradient"
              ? "Vector"
              : wallpaper.type === "live"
                ? "Live"
                : wallpaper.motion
                  ? "Movimiento"
                  : "Imagen"}
      </span>
      <button
        type="button"
        className={`d-wp-fav${favorite ? " on" : ""}`}
        aria-label={favorite ? "Quitar de favoritos" : "Añadir a favoritos"}
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite();
        }}
      >
        <IconStar style={{ fill: favorite ? "#fbbf24" : "none" }} />
      </button>
      <span className="d-wp-label">{wallpaper.name}</span>
    </div>
  );
}

/** Thumbnail / preview renderer with hover-to-play for video wallpapers. */
export function WallpaperPreview({
  wallpaper,
  autoplay = false,
  poster,
}: {
  wallpaper: Wallpaper;
  autoplay?: boolean;
  poster?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);

  /* Antes, si un fondo fallaba una vez, el marco se quedaba en degradado para
   * siempre aunque eligieras otro. Ahora cada selección vuelve a intentarlo. */
  useEffect(() => {
    setFailed(false);
  }, [wallpaper.id]);

  if (wallpaper.type === "live") {
    return <div className={`d-live d-live-${wallpaper.src}`} />;
  }

  if (wallpaper.type === "gradient") {
    return <div className="d-grad-swatch" style={{ background: wallpaper.src }} />;
  }

  if (wallpaper.type === "image") {
    if (failed) {
      return <div className="d-grad-swatch" style={{ background: "linear-gradient(135deg,#241040,#060409)" }} />;
    }
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={wallpaper.src}
        alt={wallpaper.name}
        loading="lazy"
        decoding="async"
        draggable={false}
        className={wallpaper.motion ? "d-wall-motion" : undefined}
        onError={() => setFailed(true)}
      />
    );
  }

  if (failed) {
    return <div className="d-grad-swatch" style={{ background: "linear-gradient(135deg,#241040,#060409)" }} />;
  }

  return (
    <video
      ref={videoRef}
      key={`${wallpaper.id}-${autoplay ? "play" : "still"}`}
      src={`${wallpaper.src}${autoplay ? "" : "#t=0.1"}`}
      poster={poster}
      muted
      loop
      playsInline
      autoPlay={autoplay}
      // Metadata basta para pintar el primer frame; el vídeo completo solo se
      // descarga al pasar el ratón o al seleccionarlo.
      preload={autoplay ? "auto" : "metadata"}
      onMouseEnter={() => {
        void videoRef.current?.play().catch(() => undefined);
      }}
      onMouseLeave={() => {
        videoRef.current?.pause();
      }}
      onError={() => setFailed(true)}
    />
  );
}


