"use client";
import React from 'react';

import {
  ACCENTS,
  ORIGINAL_WALLPAPER,
  THEMES,
  wallpaperById,
  type AccentId,
  type ThemeId,
} from "@/lib/os/data";

export interface OSSettings {
  skipBoot: boolean;
  optimizedBg: boolean;
  showLabels: boolean;
  startVolume: boolean;
  theme: ThemeId;
  widgets: boolean;
  aura: boolean;
  sounds: boolean;
  /** Gaming cursor with the violet light trail. */
  cursor: boolean;
  /** Aura accent used by every glow in the shell. */
  accent: AccentId;
  /** Modo claro u oscuro de todo el sistema. */
  mode: "dark" | "light";
  /** Opacidad del cristal de ventanas y paneles (30-100). */
  glass: number;
  /** Oscurecido del fondo de escritorio (0-80). */
  dim: number;
  /** Desktop icon scale. */
  iconSize: "s" | "m" | "l";
  /** Slow wallpaper carousel. */
  autoWallpaper: boolean;
  /** Kills ambient motion (aurora, ken burns, sweeps). */
  reduceMotion: boolean;
  /** Small live status pill on the desktop. */
  sysHud: boolean;
  /** Screen brightness, 30-100. */
  brightness?: number;
  /** System volume, 30-100 (drives the UI blips). */
  volume?: number;
  /** Control-centre toggles. */
  wifi?: boolean;
  bluetooth?: boolean;
  dnd?: boolean;
  /** Aura light intensity. */
  auraLevel?: number;
  /** Motor x300: perfil de energía del escritorio. */
  power?: "eco" | "balanced" | "x300";
  /** Reloj de 24 horas (si no, 12 h con AM/PM). */
  clock24?: boolean;
  /** Muestra los segundos en todos los relojes. */
  clockSeconds?: boolean;
  /** Filtro cálido para la noche. */
  nightLight?: boolean;
  /** Desenfoque del fondo, 0-18 px. */
  wallBlur?: number;
  /** Bloquea la sesión tras 5 minutos sin actividad. */
  autoLock?: boolean;
  /** Envía una señal periódica para que el preview no se suspenda. */
  keepAwake?: boolean;
}

const CONSOLE_MODES: {
  id: "playstation" | "xbox" | "nintendo" | "cinema";
  name: string;
  badge: string;
  desc: string;
  color: string;
}[] = [
  {
    id: "playstation",
    name: "PlayStation 5",
    badge: "PS",
    desc: "Azul PS, formas △ ○ ✕ □ y estantería de juegos.",
    color: "#0070d1",
  },
  {
    id: "xbox",
    name: "Xbox Series X",
    badge: "X",
    desc: "Verde Xbox, panel destacado y carátulas cuadradas.",
    color: "#107c10",
  },
  {
    id: "nintendo",
    name: "Nintendo Switch",
    badge: "◐",
    desc: "Interfaz clara con rojo Switch y juegos en cuadrícula.",
    color: "#e60012",
  },
  {
    id: "cinema",
    name: "Modo Cine",
    badge: "🎬",
    desc: "Un palacio de cine con la cartelera de cinemitas.org.",
    color: "#d4a95a",
  },
];

const PHONE_MODES: {
  id: "samsung" | "iphone";
  name: string;
  badge: string;
  desc: string;
  color: string;
}[] = [
  {
    id: "samsung",
    name: "Samsung Galaxy",
    badge: "S",
    desc: "One UI: reloj grande, widgets, cuadrícula y dock.",
    color: "#3b82f6",
  },
  {
    id: "iphone",
    name: "iPhone",
    badge: "iOS",
    desc: "iOS: Dynamic Island, dock de cristal y pantalla de inicio.",
    color: "#8e8e93",
  },
];

const POWER_PROFILES: {
  id: "eco" | "balanced" | "x300";
  name: string;
  tag: string;
  desc: string;
  color: string;
}[] = [
  {
    id: "eco",
    name: "Eco",
    tag: "ECO",
    desc: "Apaga vídeo de fondo y aura. La sesión dura más.",
    color: "#22c55e",
  },
  {
    id: "balanced",
    name: "Equilibrado",
    tag: "EQ",
    desc: "Todo el efecto visual, con consumo normal.",
    color: "#38bdf8",
  },
  {
    id: "x300",
    name: "Turbo x300",
    tag: "x300",
    desc: "Animaciones instantáneas y cero capas pesadas.",
    color: "#a855f7",
  },
];

interface SettingsAppProps {
  settings: OSSettings;
  onChange: (patch: Partial<OSSettings>) => void;
  appliedHome: string;
  appliedLock: string;
  favoritesCount: number;
  onOpenStudio: () => void;
  onOpenQuick: () => void;
  onRestoreOriginal: () => void;
  onLock: () => void;
  onReset: () => void;
}

export function SettingsApp({
  settings,
  onChange,
  appliedHome,
  appliedLock,
  favoritesCount,
  onOpenStudio,
  onOpenQuick,
  onRestoreOriginal,
  onLock,
  onReset,
}: SettingsAppProps) {
  const home = wallpaperById(appliedHome);
  const lock = wallpaperById(appliedLock);

  return (
    <div className="d-win-scroll">
      <div className="d-settings">
        <h2>Configuración del sistema</h2>

        <p className="d-set-section">Modos consola y cine</p>
        <div className="d-console-grid">
          {CONSOLE_MODES.map((console) => (
            <button
              key={console.id}
              type="button"
              className={`d-console-card${settings.theme === console.id ? " on" : ""}`}
              style={{ "--mode-color": console.color } as React.CSSProperties}
              onClick={() => onChange({ theme: console.id })}
            >
              <span className={`d-console-badge ${console.id}`} aria-hidden="true">
                {console.badge}
              </span>
              <strong>{console.name}</strong>
              <small>{console.desc}</small>
              <span className="d-console-state">
                {settings.theme === console.id ? "Activo" : "Activar"}
              </span>
            </button>
          ))}
        </div>
        <p className="d-set-note">
          El escritorio entero se convierte en esa consola: su barra, su biblioteca de juegos y un
          reproductor a pantalla completa. Para volver al PC elige «PC Gamer» en Estilo del escritorio
          (o pulsa «Escritorio» dentro de la consola).
        </p>

        <p className="d-set-section">Modos móviles</p>
        <div className="d-console-grid">
          {PHONE_MODES.map((phone) => (
            <button
              key={phone.id}
              type="button"
              className={`d-console-card${settings.theme === phone.id ? " on" : ""}`}
              style={{ "--mode-color": phone.color } as React.CSSProperties}
              onClick={() => onChange({ theme: phone.id })}
            >
              <span className={`d-console-badge ${phone.id}`} aria-hidden="true">
                {phone.badge}
              </span>
              <strong>{phone.name}</strong>
              <small>{phone.desc}</small>
              <span className="d-console-state">{settings.theme === phone.id ? "Activo" : "Activar"}</span>
            </button>
          ))}
        </div>
        <p className="d-set-note">
          Un móvil virtual completo: arranque, pantalla de bloqueo, centro de control, widgets, gestos y
          apps que se abren en formato teléfono. Para volver al PC elige «PC Gamer» en Estilo del escritorio.
        </p>

        <p className="d-set-section">Sistema x300</p>
        <div className="d-power-grid">
          {POWER_PROFILES.map((profile) => (
            <button
              key={profile.id}
              type="button"
              className={`d-power-card${(settings.power ?? "balanced") === profile.id ? " on" : ""}`}
              onClick={() => onChange({ power: profile.id })}
              style={{ "--power-color": profile.color } as React.CSSProperties}
            >
              <span className="d-power-tag">{profile.tag}</span>
              <strong>{profile.name}</strong>
              <small>{profile.desc}</small>
            </button>
          ))}
        </div>
        <p className="d-set-note">
          El perfil se aplica al instante: Eco apaga el vídeo de fondo y el aura, Turbo x300 acorta todas
          las animaciones y retira las capas que más GPU gastan. Se guarda en este navegador.
        </p>

        <div className="d-set-row">
          <div>
            <strong>Reloj de 24 horas</strong>
            <small>Desactívalo para ver la hora en formato 12 h con AM/PM</small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.clock24 ?? true}
              onChange={(event) => onChange({ clock24: event.target.checked })}
            />
            <span />
          </label>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Segundos en el reloj</strong>
            <small>La barra, el panel y los widgets actualizan cada segundo</small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.clockSeconds ?? false}
              onChange={(event) => onChange({ clockSeconds: event.target.checked })}
            />
            <span />
          </label>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Luz nocturna</strong>
            <small>Filtro cálido sobre todo el sistema para cansar menos la vista</small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.nightLight ?? false}
              onChange={(event) => onChange({ nightLight: event.target.checked })}
            />
            <span />
          </label>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Desenfoque del fondo</strong>
            <small>Suaviza la imagen de escritorio: {Math.round(settings.wallBlur ?? 0)} px</small>
          </div>
          <input
            type="range"
            min={0}
            max={18}
            value={settings.wallBlur ?? 0}
            onChange={(event) => onChange({ wallBlur: Number(event.target.value) })}
            aria-label="Desenfoque del fondo"
          />
        </div>
        <div className="d-set-row">
          <div>
            <strong>Bloqueo automático</strong>
            <small>Cierra la sesión tras 5 minutos sin tocar nada</small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.autoLock ?? false}
              onChange={(event) => onChange({ autoLock: event.target.checked })}
            />
            <span />
          </label>
        </div>

        <p className="d-set-section">Estilo del escritorio</p>
        <div className="d-theme-grid">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={`d-theme-card${settings.theme === theme.id ? " on" : ""}`}
              onClick={() => onChange({ theme: theme.id })}
            >
              <span className="d-theme-preview" data-preview={theme.id}>
                <i style={{ background: theme.accent }} />
                <i />
                <i />
              </span>
              <strong>{theme.name}</strong>
              <small>{theme.desc}</small>
            </button>
          ))}
        </div>

        <p className="d-set-section">Acento OD</p>
        <div className="d-set-swatches">
          {ACCENTS.map((accent) => (
            <button
              key={accent.id}
              type="button"
              className={`d-swatch${settings.accent === accent.id ? " on" : ""}`}
              onClick={() => onChange({ accent: accent.id })}
              style={{ color: accent.hex }}
            >
              <i style={{ background: accent.hex }} />
              {accent.name}
            </button>
          ))}
        </div>
        <div className="d-set-accent-preview" />
        <p className="d-set-note">
          El acento repinta al instante los brillos, el cursor, los anillos y los degradados de todo el
          sistema. Se guarda en este navegador.
        </p>

        <p className="d-set-section">Personalización</p>
        <div className="d-set-row">
          <div>
            <strong>Cursor gamer</strong>
            <small>Puntero angular violeta con estela de luz y onda al hacer clic</small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.cursor}
              onChange={(event) => onChange({ cursor: event.target.checked })}
            />
            <span />
          </label>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Tamaño de los iconos</strong>
            <small>Se aplica al escritorio al momento</small>
          </div>
          <div className="d-seg">
            {(["s", "m", "l"] as const).map((size) => (
              <button
                key={size}
                type="button"
                className={settings.iconSize === size ? "on" : ""}
                onClick={() => onChange({ iconSize: size })}
              >
                {size === "s" ? "S" : size === "m" ? "M" : "L"}
              </button>
            ))}
          </div>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Fondo automático</strong>
            <small>Rota el fondo cada 45 segundos con toda la biblioteca</small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.autoWallpaper}
              onChange={(event) => onChange({ autoWallpaper: event.target.checked })}
            />
            <span />
          </label>
        </div>
        <div className="d-set-row">
          <div>
            <strong>HUD del sistema</strong>
            <small>Píldora en vivo con apps, ventanas abiertas y fondo actual</small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.sysHud}
              onChange={(event) => onChange({ sysHud: event.target.checked })}
            />
            <span />
          </label>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Reducir movimiento</strong>
            <small>Detiene la aurora, el Ken Burns y los barridos (más batería)</small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.reduceMotion}
              onChange={(event) => onChange({ reduceMotion: event.target.checked })}
            />
            <span />
          </label>
        </div>

        <p className="d-set-section">Apariencia</p>
        <div className="d-set-row">
          <div>
            <strong>Fondo del escritorio</strong>
            <small>
              {home.name} · {home.type === "video" ? "vídeo" : home.type === "gradient" ? "vector" : "imagen"}
            </small>
          </div>
          <button type="button" className="d-btn" onClick={onOpenStudio}>
            Cambiar
          </button>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Cambio rápido de fondo</strong>
            <small>El mosaico completo — o doble clic en el escritorio</small>
          </div>
          <button type="button" className="d-btn" onClick={onOpenQuick}>
            Abrir mosaico
          </button>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Fondo de bloqueo</strong>
            <small>{lock.name}</small>
          </div>
          <button type="button" className="d-btn" onClick={onOpenStudio}>
            Cambiar
          </button>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Restaurar fondo original</strong>
            <small>{ORIGINAL_WALLPAPER.name} — el bucle de fábrica de CineOS</small>
          </div>
          <button type="button" className="d-btn" onClick={onRestoreOriginal}>
            Restaurar
          </button>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Mostrar nombres en el escritorio</strong>
            <small>Igual que el escritorio original de CineOS</small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.showLabels}
              onChange={(event) => onChange({ showLabels: event.target.checked })}
            />
            <span />
          </label>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Efectos aura</strong>
            <small>Parallax del fondo, luz que sigue al cursor y brillos</small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.aura}
              onChange={(event) => onChange({ aura: event.target.checked })}
            />
            <span />
          </label>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Sonidos de interfaz</strong>
            <small>Un blip corto al pulsar apps y botones (sintetizado, sin archivos)</small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.sounds}
              onChange={(event) => onChange({ sounds: event.target.checked })}
            />
            <span />
          </label>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Widgets laterales</strong>
            <small>Reloj, estado del proxy, fondo actual y accesos GhostCloud</small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.widgets}
              onChange={(event) => onChange({ widgets: event.target.checked })}
            />
            <span />
          </label>
        </div>

        <p className="d-set-section">Rendimiento</p>
        <div className="d-set-row">
          <div>
            <strong>Fondo optimizado</strong>
            <small>Desactiva el vídeo de fondo para ahorrar recursos</small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.optimizedBg}
              onChange={(event) => onChange({ optimizedBg: event.target.checked })}
            />
            <span />
          </label>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Arranque rápido</strong>
            <small>Salta la secuencia de arranque al recargar</small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.skipBoot}
              onChange={(event) => onChange({ skipBoot: event.target.checked })}
            />
            <span />
          </label>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Mantener la sesión despierta</strong>
            <small>
              Hace un ping cada 4 minutos y pide un bloqueo de pantalla al navegador para que el
              Chromebook no apague la pantalla. Solo funciona mientras esta pestaña esté abierta.
            </small>
          </div>
          <label className="d-switch">
            <input
              type="checkbox"
              checked={settings.keepAwake ?? true}
              onChange={(event) => onChange({ keepAwake: event.target.checked })}
            />
            <span />
          </label>
        </div>

        <p className="d-set-section">Sesión</p>
        <div className="d-set-row">
          <div>
            <strong>Favoritos guardados</strong>
            <small>{favoritesCount} fondos marcados en este navegador</small>
          </div>
          <button type="button" className="d-btn" onClick={onOpenStudio}>
            Ver
          </button>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Bloquear el sistema</strong>
            <small>Vuelve a la pantalla de bloqueo con tu fondo</small>
          </div>
          <button type="button" className="d-btn" onClick={onLock}>
            Bloquear
          </button>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Resetear preferencias</strong>
            <small>Borra fondos, favoritos, apps del escritorio y estilo elegido</small>
          </div>
          <button type="button" className="d-btn" onClick={onReset}>
            Resetear
          </button>
        </div>

        <p className="d-set-section">Modo de color</p>
        <div className="d-set-row">
          <div>
            <strong>Claro u oscuro</strong>
            <small>Cambia todo el sistema al instante</small>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className={`d-btn${(settings.mode ?? "dark") === "dark" ? " on" : ""}`}
              onClick={() => onChange({ mode: "dark" })}
            >
              Oscuro
            </button>
            <button
              type="button"
              className={`d-btn${settings.mode === "light" ? " on" : ""}`}
              onClick={() => onChange({ mode: "light" })}
            >
              Claro
            </button>
          </div>
        </div>

        <div className="d-set-row">
          <div>
            <strong>Cristal de las ventanas</strong>
            <small>Desenfoque de fondos y paneles: {Math.round(settings.glass ?? 82)}%</small>
          </div>
          <input
            type="range"
            min={30}
            max={100}
            value={settings.glass ?? 82}
            onChange={(event) => onChange({ glass: Number(event.target.value) })}
            aria-label="Cristal de las ventanas"
          />
        </div>

        <div className="d-set-row">
          <div>
            <strong>Oscurecer el fondo</strong>
            <small>Más contraste para los iconos: {Math.round(settings.dim ?? 30)}%</small>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            value={settings.dim ?? 30}
            onChange={(event) => onChange({ dim: Number(event.target.value) })}
            aria-label="Oscurecer el fondo"
          />
        </div>

        <p className="d-set-section">Dounia OD</p>
        <div className="d-about-card">
          <span className="d-od-mark">D</span>
          <div>
            <strong>Dounia OS · Edición OD</strong>
            <small>build 4.0 · un solo archivo HTML, sin dependencias ni servidor</small>
          </div>
          <a className="d-about-dl" href="/api/od" download="DOUNIA-OD.html">
            Descargar ↓
          </a>
        </div>

        <p className="d-set-section">Atajos</p>
        <div className="d-set-row">
          <div>
            <strong>Ctrl / ⌘ + K</strong>
            <small>Búsqueda universal: apps, marcadores, historial y web por Scramjet</small>
          </div>
          <span style={{ fontSize: "0.62rem", color: "#71717a" }}>apps</span>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Doble clic en el escritorio</strong>
            <small>Abre el mosaico de fondos al instante</small>
          </div>
          <span style={{ fontSize: "0.62rem", color: "#71717a" }}>fondos</span>
        </div>
        <div className="d-set-row">
          <div>
            <strong>Clic derecho sobre una app</strong>
            <small>Abrir, fijar en la barra o quitar del escritorio</small>
          </div>
          <span style={{ fontSize: "0.62rem", color: "#71717a" }}>menú</span>
        </div>

        <p className="d-set-section">Sistema</p>
        <div className="d-set-row">
          <div>
            <strong>Dounia OS v4 · OD</strong>
            <small>Motor Scramjet V2 · /wisp · /api/sj · /api/games · /api/link-check</small>
          </div>
          <span style={{ fontSize: "0.66rem", color: "#71717a", letterSpacing: "0.1em" }}>v4.0</span>
        </div>
      </div>
    </div>
  );
}
