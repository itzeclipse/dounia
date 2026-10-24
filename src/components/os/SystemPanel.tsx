"use client";
import React from 'react';

import type { ReactNode } from "react";

import type { OSSettings } from "./apps/SettingsApp";
import { ACCENTS, THEMES, type ThemeId } from "@/lib/os/data";
import type { ClockValue } from "@/lib/os/hooks";
import {
  IconBluetooth,
  IconBolt,
  IconClose,
  IconImage,
  IconGrid,
  IconLock,
  IconMoon,
  IconPower,
  IconRefresh,
  IconSun,
  IconVolume,
  IconWifi,
} from "./icons";

export interface SystemPanelProps {
  settings: OSSettings;
  onChange: (patch: Partial<OSSettings>) => void;
  clock: ClockValue;
  user: string;
  windows: number;
  onClose: () => void;
  onOpenStudio: () => void;
  onOpenApps: () => void;
  onLock: () => void;
  onRestart: () => void;
  onShutdown: () => void;
}

function Slider({
  label,
  icon,
  value,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="syspanel-slider">
      <span className="syspanel-slider-id">
        {icon}
        {label}
      </span>
      <input
        type="range"
        min={30}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={label}
      />
      <span className="syspanel-slider-value">{value}%</span>
    </label>
  );
}

export function SystemPanel({
  settings,
  onChange,
  clock,
  user,
  windows,
  onClose,
  onOpenStudio,
  onOpenApps,
  onLock,
  onRestart,
  onShutdown,
}: SystemPanelProps) {
  const brightness = settings.brightness ?? 100;
  const volume = settings.volume ?? 70;

  return (
    <>
      <div className="d-scrim" style={{ background: "transparent", backdropFilter: "none" }} onClick={onClose} />
      <aside className="syspanel" role="dialog" aria-label="Panel del sistema">
        <header className="syspanel-head">
          <div>
            <strong>{user}</strong>
            <small>
              {clock.weekday ? `${clock.weekday.charAt(0)}${clock.weekday.slice(1).toLowerCase()} · ` : ""}
              {clock.date}
            </small>
          </div>
          <span className="syspanel-badge">{clock.time}</span>
          <button type="button" className="syspanel-x" aria-label="Cerrar panel" onClick={onClose}>
            <IconClose />
          </button>
        </header>

        <div className="syspanel-quick">
          <button
            type="button"
            className={`syspanel-tile${settings.wifi === false ? "" : " on"}`}
            onClick={() => onChange({ wifi: settings.wifi === false })}
          >
            <IconWifi />
            <span>WiFi</span>
            <small>{settings.wifi === false ? "off" : "conectado"}</small>
          </button>
          <button
            type="button"
            className={`syspanel-tile${settings.bluetooth ? " on" : ""}`}
            onClick={() => onChange({ bluetooth: !settings.bluetooth })}
          >
            <IconBluetooth />
            <span>Bluetooth</span>
            <small>{settings.bluetooth ? "activo" : "apagado"}</small>
          </button>
          <button
            type="button"
            className={`syspanel-tile${settings.dnd ? " on" : ""}`}
            onClick={() => onChange({ dnd: !settings.dnd })}
          >
            <IconMoon />
            <span>No molestar</span>
            <small>{settings.dnd ? "silenciado" : "normal"}</small>
          </button>
          <button
            type="button"
            className={`syspanel-tile${settings.aura ? " on" : ""}`}
            onClick={() => onChange({ aura: !settings.aura })}
          >
            <IconBolt />
            <span>Aura</span>
            <small>{settings.aura ? "brillo activo" : "apagado"}</small>
          </button>
        </div>

        <div className="syspanel-sliders">
          <Slider
            label="Brillo"
            icon={<IconSun />}
            value={brightness}
            onChange={(value) => onChange({ brightness: value })}
          />
          <Slider
            label="Volumen"
            icon={<IconVolume />}
            value={volume}
            onChange={(value) => onChange({ volume: value })}
          />
        </div>

        <div className="syspanel-block">
          <p>Estilo</p>
          <div className="syspanel-chips">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`syspanel-chip${settings.theme === theme.id ? " on" : ""}`}
                onClick={() => onChange({ theme: theme.id as ThemeId })}
              >
                <i style={{ background: theme.accent }} />
                {theme.name}
              </button>
            ))}
          </div>
        </div>

        <div className="syspanel-block">
          <p>Motor x300</p>
          <div className="syspanel-chips">
            {(
              [
                ["eco", "Eco"],
                ["balanced", "Equilibrado"],
                ["x300", "Turbo x300"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`syspanel-chip${(settings.power ?? "balanced") === id ? " on" : ""}`}
                onClick={() => onChange({ power: id })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="syspanel-block">
          <p>Acento</p>
          <div className="syspanel-accents">
            {ACCENTS.map((accent) => (
              <button
                key={accent.id}
                type="button"
                aria-label={accent.name}
                title={accent.name}
                className={`syspanel-accent${settings.accent === accent.id ? " on" : ""}`}
                style={{ background: accent.hex }}
                onClick={() => onChange({ accent: accent.id })}
              />
            ))}
          </div>
        </div>

        <div className="syspanel-toggles">
          <button
            type="button"
            className={`syspanel-toggle${settings.cursor ? " on" : ""}`}
            onClick={() => onChange({ cursor: !settings.cursor })}
          >
            Cursor gamer
          </button>
          <button
            type="button"
            className={`syspanel-toggle${settings.widgets ? " on" : ""}`}
            onClick={() => onChange({ widgets: !settings.widgets })}
          >
            Widgets
          </button>
          <button
            type="button"
            className={`syspanel-toggle${settings.reduceMotion ? " on" : ""}`}
            onClick={() => onChange({ reduceMotion: !settings.reduceMotion })}
          >
            Menos animación
          </button>
          <button
            type="button"
            className={`syspanel-toggle${settings.sysHud ? " on" : ""}`}
            onClick={() => onChange({ sysHud: !settings.sysHud })}
          >
            HUD
          </button>
          <button
            type="button"
            className={`syspanel-toggle${settings.sounds ? " on" : ""}`}
            onClick={() => onChange({ sounds: !settings.sounds })}
          >
            Sonidos
          </button>
          <button
            type="button"
            className={`syspanel-toggle${settings.optimizedBg ? " on" : ""}`}
            onClick={() => onChange({ optimizedBg: !settings.optimizedBg })}
          >
            Fondo ligero
          </button>
          <button
            type="button"
            className={`syspanel-toggle${settings.nightLight ? " on" : ""}`}
            onClick={() => onChange({ nightLight: !settings.nightLight })}
          >
            Luz nocturna
          </button>
          <button
            type="button"
            className={`syspanel-toggle${(settings.clock24 ?? true) ? " on" : ""}`}
            onClick={() => onChange({ clock24: !(settings.clock24 ?? true) })}
          >
            Reloj 24 h
          </button>
        </div>

        <div className="syspanel-actions">
          <button type="button" onClick={onOpenStudio}>
            <IconImage /> Fondos
          </button>
          <button type="button" onClick={onOpenApps}>
            <IconGrid /> Apps
          </button>
          <button type="button" onClick={onRestart}>
            <IconRefresh /> Reiniciar
          </button>
        </div>

        <footer className="syspanel-foot">
          <span>{windows} ventanas abiertas</span>
          <div>
            <button type="button" aria-label="Bloquear" title="Bloquear" onClick={onLock}>
              <IconLock />
            </button>
            <button type="button" aria-label="Apagar" title="Apagar" className="danger" onClick={onShutdown}>
              <IconPower />
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
