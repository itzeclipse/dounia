"use client";
import React from "react";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ClockValue } from "@/lib/os/hooks";
import type { OSApp, Wallpaper } from "@/lib/os/data";
import { AppIcon } from "./AppIcon";
import {
  IconBluetooth,
  IconClose,
  IconExternal,
  IconGrid,
  IconImage,
  IconLock,
  IconMoon,
  IconSearch,
  IconSun,
  IconVolume,
  IconWifi,
} from "./icons";

export type PhoneMode = "samsung" | "iphone";

type Stage = "boot" | "lock" | "home";

interface PhoneSettingsPatch {
  volume?: number;
  brightness?: number;
  wifi?: boolean;
  bluetooth?: boolean;
  dnd?: boolean;
}

interface PhoneHomeProps {
  mode: PhoneMode;
  clock: ClockValue;
  user: string;
  apps: OSApp[];
  dock: OSApp[];
  running: OSApp[];
  wallpaper: Wallpaper;
  backend: "checking" | "online" | "offline";
  volume: number;
  brightness: number;
  wifi: boolean;
  bluetooth: boolean;
  dnd: boolean;
  onOpenApp: (id: string) => void;
  onOpenDrawer: () => void;
  onOpenSettings: () => void;
  onOpenWallpapers: () => void;
  onLock: () => void;
  onExit: () => void;
  onChange: (patch: PhoneSettingsPatch) => void;
  onHome: () => void;
}

function AppleMark() {
  return (
    <svg className="phone-apple" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.7 12.9c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.6-1.3-.1-2.5.8-3.1.8-.7 0-1.6-.8-2.7-.8-1.4 0-2.7.8-3.4 2.1-1.5 2.5-.4 6.2 1 8.2.7 1 1.5 2.1 2.6 2 1-.04 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7 1.1 0 1.8-1 2.5-2 .8-1.1 1.1-2.2 1.1-2.3-.1 0-2.2-.9-2.2-3.2z" />
      <path d="M14.7 6.3c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.8 2.6 1 .1 1.9-.5 2.4-1.2z" />
    </svg>
  );
}

/**
 * Móviles virtuales: un Samsung Galaxy (One UI) y un iPhone (iOS) completos,
 * con arranque, pantalla de bloqueo, centro de control, widgets, apps reales,
 * páginas deslizables y botones de hardware que responden.
 */
export function PhoneHome({
  mode,
  clock,
  user,
  apps,
  dock,
  running,
  wallpaper,
  backend,
  volume,
  brightness,
  wifi,
  bluetooth,
  dnd,
  onOpenApp,
  onOpenDrawer,
  onOpenSettings,
  onOpenWallpapers,
  onLock,
  onExit,
  onChange,
  onHome,
}: PhoneHomeProps) {
  const perPage = mode === "iphone" ? 16 : 20;
  const [stage, setStage] = useState<Stage>("boot");
  const [page, setPage] = useState(0);
  const [controlCenter, setControlCenter] = useState(false);
  const [volumeHud, setVolumeHud] = useState<number | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const volumeTimer = useRef<number | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setStage("boot");
    setPage(0);
    setControlCenter(false);
  }, [mode]);

  useEffect(() => {
    if (stage !== "boot") return;
    const timer = window.setTimeout(() => setStage("lock"), 2_400);
    return () => window.clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    type BatteryLike = { level: number };
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
    let active = true;
    nav
      .getBattery?.()
      .then((manager) => {
        if (active) setBattery(Math.round(manager.level * 100));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(
    () => () => {
      if (volumeTimer.current) window.clearTimeout(volumeTimer.current);
    },
    [],
  );

  const pages = useMemo(() => {
    const chunks: OSApp[][] = [];
    for (let index = 0; index < apps.length; index += perPage) {
      chunks.push(apps.slice(index, index + perPage));
    }
    return chunks.length > 0 ? chunks : [[]];
  }, [apps, perPage]);

  const safePage = Math.min(page, pages.length - 1);
  const pageApps = pages[safePage] ?? [];
  const showDrawerTile = safePage === pages.length - 1;
  const wallpaperImage = wallpaper.type === "image" ? wallpaper.src : null;
  const wallpaperCss = wallpaper.type === "gradient" ? wallpaper.src : null;
  const model = mode === "iphone" ? "iPhone 15 Pro" : "Galaxy S24 Ultra";

  const unlock = () => {
    setStage("home");
    setPage(0);
  };

  const togglePower = () => {
    if (stage === "boot") return;
    setStage(stage === "home" ? "lock" : "home");
    setControlCenter(false);
  };

  const pushVolume = (delta: number) => {
    const next = Math.max(0, Math.min(100, volume + delta));
    onChange({ volume: next });
    setVolumeHud(next);
    if (volumeTimer.current) window.clearTimeout(volumeTimer.current);
    volumeTimer.current = window.setTimeout(() => setVolumeHud(null), 1_600);
  };

  const goHome = () => {
    onHome();
    unlock();
    setControlCenter(false);
  };

  const onGridPointerDown = (event: React.PointerEvent) => {
    swipeRef.current = { x: event.clientX, y: event.clientY };
  };

  const onGridPointerUp = (event: React.PointerEvent) => {
    const start = swipeRef.current;
    swipeRef.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) setPage((value) => Math.min(pages.length - 1, value + 1));
    else setPage((value) => Math.max(0, value - 1));
  };

  return (
    <section
      className={`phone-stage phone-${mode}`}
      aria-label={mode === "iphone" ? "Móvil virtual iPhone" : "Móvil virtual Samsung"}
    >
      <div className="phone-ambient" aria-hidden="true" />

      <div className="phone-device">
        <button
          type="button"
          className="phone-btn phone-btn-silent"
          aria-label="Silenciar"
          onClick={() => {
            onChange({ volume: 0 });
            setVolumeHud(0);
            if (volumeTimer.current) window.clearTimeout(volumeTimer.current);
            volumeTimer.current = window.setTimeout(() => setVolumeHud(null), 1_600);
          }}
        />
        <button type="button" className="phone-btn phone-btn-volup" aria-label="Subir volumen" onClick={() => pushVolume(10)} />
        <button type="button" className="phone-btn phone-btn-voldown" aria-label="Bajar volumen" onClick={() => pushVolume(-10)} />
        <button type="button" className="phone-btn phone-btn-power" aria-label="Encender o bloquear" onClick={togglePower} />

        <div className="phone-screen">
          <div className="phone-wall" aria-hidden="true">
            {wallpaperImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={wallpaperImage} alt="" />
            ) : (
              <span className="phone-wall-fill" style={wallpaperCss ? { background: wallpaperCss } : undefined} />
            )}
            <span className="phone-wall-dim" />
          </div>

          {mode === "iphone" ? <span className="phone-island" aria-hidden="true" /> : <span className="phone-punch" aria-hidden="true" />}

          {stage !== "boot" && (
            <div className="phone-status">
              <span className="phone-status-time">{clock.time}</span>
              <button type="button" className="phone-status-icons" onClick={() => setControlCenter(true)} aria-label="Centro de control">
                {dnd && <IconMoon className="phone-status-moon" />}
                <i className={`phone-bars${wifi ? "" : " off"}`} />
                <i className={`phone-wifi${wifi ? "" : " off"}`} />
                <span className="phone-battery-pct">{battery !== null ? `${battery}%` : ""}</span>
                <i className="phone-battery" />
              </button>
            </div>
          )}

          {stage === "home" && (
            <div className="phone-content">
              <header className="phone-head">
                <p className="phone-greeting">{mode === "iphone" ? `Hola, ${user}` : clock.weekday}</p>
                <h1 className="phone-clock">{clock.time}</h1>
                <p className="phone-date">{clock.date}</p>
              </header>

              <button type="button" className="phone-search" onClick={onOpenDrawer}>
                <IconSearch />
                <span>{mode === "iphone" ? "Buscar" : "Buscar en el móvil"}</span>
              </button>

              <div className="phone-widgets">
                <button type="button" className="phone-widget" onClick={onOpenSettings}>
                  <span className="phone-widget-label">Sistema</span>
                  <strong>
                    {backend === "online" ? "Scramjet activo" : backend === "checking" ? "Comprobando…" : "Sin conexión"}
                  </strong>
                  <span className="phone-widget-metrics">
                    <span>
                      <b>{apps.length}</b> apps
                    </span>
                    <span>
                      <b>{battery ?? "--"}%</b> batería
                    </span>
                  </span>
                </button>
                <button type="button" className="phone-widget small" onClick={onOpenWallpapers}>
                  <span className="phone-widget-label">Fondo</span>
                  <strong>{wallpaper.name}</strong>
                  <span className="phone-widget-icon">
                    <IconImage />
                  </span>
                </button>
              </div>

              <div
                className={`phone-grid${mode === "iphone" ? " ios" : ""}`}
                onPointerDown={onGridPointerDown}
                onPointerUp={onGridPointerUp}
              >
                {pageApps.map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    className="phone-app"
                    onClick={() => onOpenApp(app.id)}
                    title={`${app.name} — ${app.sub}`}
                  >
                    <AppIcon src={app.icon} alt={app.name} accent={app.accent} size={mode === "iphone" ? 56 : 54} />
                    <span>{app.name}</span>
                  </button>
                ))}

                {showDrawerTile && (
                  <button type="button" className="phone-app phone-app-more" onClick={onOpenDrawer}>
                    <span className="phone-app-more-icon">
                      <IconGrid />
                    </span>
                    <span>Todas</span>
                  </button>
                )}
              </div>

              {pages.length > 1 && (
                <div className="phone-dots" role="tablist" aria-label="Páginas de inicio">
                  {pages.map((_, index) => (
                    <button
                      key={`page-${index}`}
                      type="button"
                      role="tab"
                      aria-selected={safePage === index}
                      aria-label={`Página ${index + 1}`}
                      className={safePage === index ? "on" : ""}
                      onClick={() => setPage(index)}
                    />
                  ))}
                </div>
              )}

              <nav className="phone-dock" aria-label="Dock">
                {dock.slice(0, 4).map((app) => (
                  <button key={`dock-${app.id}`} type="button" onClick={() => onOpenApp(app.id)} aria-label={app.name}>
                    <AppIcon src={app.icon} alt={app.name} accent={app.accent} size={52} />
                  </button>
                ))}
              </nav>
            </div>
          )}

          {stage === "lock" && (
            <button type="button" className="phone-lock" onClick={unlock}>
              <span className="phone-lock-pill">
                <IconLock /> {model}
              </span>
              <p className="phone-lock-day">{clock.weekday}</p>
              <h1 className="phone-lock-clock">{clock.time}</h1>
              <p className="phone-lock-date">{clock.date}</p>

              <span className="phone-lock-notes">
                <span className="phone-note">
                  <span className="phone-note-app">Sistema</span>
                  <strong>{backend === "online" ? "Scramjet activo" : "Comprobando el motor…"}</strong>
                  <span>{apps.length} apps listas · {battery ?? "--"}% de batería</span>
                </span>
                {running.length > 0 && (
                  <span className="phone-note">
                    <span className="phone-note-app">Ahora</span>
                    <strong>{running.length} apps abiertas</strong>
                    <span>{running.slice(0, 3).map((app) => app.name).join(" · ")}</span>
                  </span>
                )}
              </span>

              <span className="phone-lock-hint">Pulsa o desliza para desbloquear</span>
            </button>
          )}

          {stage === "boot" && (
            <button type="button" className="phone-boot" onClick={() => setStage("lock")} aria-label="Saltar arranque">
              {mode === "iphone" ? <AppleMark /> : <span className="phone-boot-brand">SAMSUNG</span>}
              <span className="phone-boot-model">{model}</span>
              <span className="phone-boot-track">
                <i />
              </span>
              <span className="phone-boot-hint">Iniciando el dispositivo virtual…</span>
            </button>
          )}

          {controlCenter && stage !== "boot" && (
            <div className="phone-cc" role="dialog" aria-label="Centro de control">
              <header className="phone-cc-head">
                <strong>Centro de control</strong>
                <button type="button" onClick={() => setControlCenter(false)} aria-label="Cerrar">
                  <IconClose />
                </button>
              </header>

              <div className="phone-cc-tiles">
                <button type="button" className={wifi ? "on" : ""} onClick={() => onChange({ wifi: !wifi })}>
                  <IconWifi />
                  <span>
                    <strong>Wi-Fi</strong>
                    <small>{wifi ? "Activado" : "Desactivado"}</small>
                  </span>
                </button>
                <button type="button" className={bluetooth ? "on" : ""} onClick={() => onChange({ bluetooth: !bluetooth })}>
                  <IconBluetooth />
                  <span>
                    <strong>Bluetooth</strong>
                    <small>{bluetooth ? "Activado" : "Desactivado"}</small>
                  </span>
                </button>
                <button type="button" className={dnd ? "on" : ""} onClick={() => onChange({ dnd: !dnd })}>
                  <IconMoon />
                  <span>
                    <strong>No molestar</strong>
                    <small>{dnd ? "Activado" : "Desactivado"}</small>
                  </span>
                </button>
              </div>

              <label className="phone-cc-slider">
                <span>
                  <IconSun /> Brillo
                </span>
                <input
                  type="range"
                  min={30}
                  max={100}
                  value={brightness}
                  onChange={(event) => onChange({ brightness: Number(event.target.value) })}
                />
              </label>

              <label className="phone-cc-slider">
                <span>
                  <IconVolume /> Volumen
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={volume}
                  onChange={(event) => onChange({ volume: Number(event.target.value) })}
                />
              </label>

              <div className="phone-cc-actions">
                <button type="button" onClick={() => { setControlCenter(false); setStage("lock"); }}>
                  <IconLock /> Bloquear
                </button>
                <button type="button" onClick={() => { setControlCenter(false); onOpenWallpapers(); }}>
                  <IconImage /> Fondos
                </button>
                <button type="button" onClick={() => { setControlCenter(false); onOpenSettings(); }}>
                  Ajustes
                </button>
                <button type="button" onClick={() => { setControlCenter(false); onOpenDrawer(); }}>
                  <IconGrid /> Apps
                </button>
              </div>
            </div>
          )}

          {volumeHud !== null && (
            <div className="phone-volume">
              <IconVolume />
              <span className="phone-volume-track">
                <i style={{ width: `${volumeHud}%` }} />
              </span>
              <b>{volumeHud}</b>
            </div>
          )}

          {stage === "home" && (
            <button type="button" className="phone-homebar" onClick={goHome} aria-label="Inicio" />
          )}
        </div>
      </div>

      <div className="phone-external">
        <span className="phone-external-brand">{model}</span>
        <button type="button" onClick={onOpenDrawer}>
          <IconGrid /> Apps
        </button>
        <button type="button" onClick={onOpenSettings}>
          Ajustes
        </button>
        <button type="button" onClick={onOpenWallpapers}>
          <IconImage /> Fondos
        </button>
        <button type="button" onClick={onLock}>
          <IconLock /> Bloquear
        </button>
        <button type="button" className="exit" onClick={onExit}>
          <IconExternal /> Escritorio
        </button>
      </div>
    </section>
  );
}
