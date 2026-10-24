"use client";
import React from 'react';

import { GHOSTCLOUD_GROUP, hostOf, type Wallpaper } from "@/lib/os/data";
import type { ClockValue } from "@/lib/os/hooks";
import { IconChevron, IconImage, IconPlay, IconShield } from "./icons";

interface WidgetsProps {
  clock: ClockValue;
  backend: "checking" | "online" | "offline";
  favorites: number;
  apps: number;
  wallpaper: Wallpaper;
  onOpenStudio: () => void;
  onOpenProxy: (url: string) => void;
  onOpenApp: (id: string) => void;
}

/** Windows/apple style widget stack on the right edge of the desktop. */
export function Widgets({
  clock,
  backend,
  favorites,
  apps,
  wallpaper,
  onOpenStudio,
  onOpenProxy,
  onOpenApp,
}: WidgetsProps) {
  return (
    <aside className="d-widgets" aria-label="Widgets">
      <div className="d-widget d-widget-clock">
        <span className="d-widget-label">Hora local</span>
        <strong>{clock.time}</strong>
        <span className="d-widget-sub">
          {clock.weekday ? `${clock.weekday.charAt(0)}${clock.weekday.slice(1).toLowerCase()}` : ""} · {clock.date}
        </span>
      </div>

      <div className="d-widget">
        <div className="d-widget-row">
          <span className="d-widget-label">Sistema</span>
          <span className={`d-side-dot ${backend === "online" ? "ok" : "off"}`} />
        </div>
        <strong className="d-widget-strong">
          {backend === "online" ? "Scramjet activo" : backend === "checking" ? "Comprobando…" : "Scramjet caído"}
        </strong>
        <div className="d-widget-metrics">
          <span>
            <b>{apps}</b> apps
          </span>
          <span>
            <b>{favorites}</b> favoritos
          </span>
          <span>
            <b>v4</b> build
          </span>
        </div>
      </div>

      <div className="d-widget">
        <div className="d-widget-row">
          <span className="d-widget-label">Fondo</span>
          <button type="button" className="d-mini-btn" onClick={onOpenStudio} aria-label="Cambiar fondo">
            <IconImage />
          </button>
        </div>
        <div className="d-widget-thumb">
          {wallpaper.type === "gradient" ? (
            <span style={{ background: wallpaper.src }} />
          ) : wallpaper.type === "live" ? (
            <span className={`d-live d-live-${wallpaper.src}`} />
          ) : wallpaper.type === "video" ? (
            <video src={wallpaper.src} muted loop autoPlay playsInline preload="metadata" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wallpaper.src} alt={wallpaper.name} />
          )}
        </div>
        <strong className="d-widget-strong">{wallpaper.name}</strong>
      </div>

      <div className="d-widget">
        <div className="d-widget-row">
          <span className="d-widget-label">GhostCloud</span>
          <span className="d-widget-badge">4 links</span>
        </div>
        <ul className="d-widget-links">
          {GHOSTCLOUD_GROUP.items.map((item) => (
            <li key={item.url}>
              <button type="button" onClick={() => onOpenProxy(item.url)}>
                <IconShield />
                <span>{item.name}</span>
                <IconChevron style={{ marginLeft: "auto", opacity: 0.5 }} />
              </button>
              <small>{hostOf(item.url)}</small>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" className="d-widget d-widget-play" onClick={() => onOpenApp("htmlgames")}>
        <IconPlay style={{ width: 18, height: 18 }} />
        <div>
          <strong>Jugar ahora</strong>
          <small>3000+ juegos HTML5</small>
        </div>
      </button>
    </aside>
  );
}
