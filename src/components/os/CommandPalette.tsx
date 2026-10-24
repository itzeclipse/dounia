"use client";
import React from 'react';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OSApp } from "@/lib/os/data";

/**
 * Paleta universal de Dounia OS (⌘K / Ctrl+K).
 *
 * Un solo sitio para todo: abrir apps, ejecutar acciones del sistema, saltar a
 * marcadores o historial y buscar en la web **a través de Scramjet**. Muestra
 * además la salud real del motor (Wisp + conexiones) leyendo /api/wisp-status.
 */

export interface PaletteHandlers {
  onOpenApp: (id: string) => void;
  onOpenUrl: (url: string) => void;
  onLock: () => void;
  onWallpapers: () => void;
  onToggleTheme: () => void;
  onOpenMonitor: () => void;
  onToast: (title: string, body: string) => void;
}

interface CommandPaletteProps extends PaletteHandlers {
  open: boolean;
  onClose: () => void;
  apps: OSApp[];
}

interface Item {
  key: string;
  group: "apps" | "acciones" | "marcadores" | "historial";
  title: string;
  sub: string;
  icon?: string;
  glyph?: string;
  run: () => void;
}

interface EngineState {
  ready: boolean;
  upgrades: number;
  connections: number;
}

const GROUP_LABEL: Record<Item["group"], string> = {
  apps: "Apps",
  acciones: "Acciones",
  marcadores: "Marcadores",
  historial: "Historial",
};

/** Puntuación simple de coincidencia (subcadena + principio de palabra). */
function score(text: string, query: string): number {
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  if (!needle) return 1;
  const direct = haystack.indexOf(needle);
  if (direct === 0) return 100;
  if (direct > 0) return 60 - Math.min(30, direct);
  // subsecuencia (tipo fuzzy)
  let index = 0;
  for (const char of needle) {
    index = haystack.indexOf(char, index);
    if (index === -1) return -1;
    index += 1;
  }
  return 12;
}

function readStored<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function looksLikeUrl(value: string): boolean {
  return /^(https?:\/\/|www\.)/i.test(value) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(value);
}

export function CommandPalette({
  open,
  onClose,
  apps,
  onOpenApp,
  onOpenUrl,
  onLock,
  onWallpapers,
  onToggleTheme,
  onOpenMonitor,
  onToast,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [engine, setEngine] = useState<EngineState | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setCursor(0);
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    void fetch("/api/wisp-status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { wisp?: { installed?: boolean; upgrades?: number; connections?: number } }) =>
        setEngine({
          ready: Boolean(data.wisp?.installed),
          upgrades: data.wisp?.upgrades ?? 0,
          connections: data.wisp?.connections ?? 0,
        }),
      )
      .catch(() => setEngine({ ready: false, upgrades: 0, connections: 0 }));
    return () => window.clearTimeout(timer);
  }, [open]);

  const marks = useMemo(
    () => (open ? readStored<{ url: string; title: string }>("dounia.browser.marks.v1") : []),
    [open],
  );
  const history = useMemo(
    () => (open ? readStored<{ url: string; title: string }>("dounia.browser.history.v1") : []),
    [open],
  );

  const items = useMemo<Item[]>(() => {
    const base: Item[] = [
      ...apps.map((app) => ({
        key: `app-${app.id}`,
        group: "apps" as const,
        title: app.name,
        sub: app.sub,
        icon: app.icon,
        run: () => {
          onOpenApp(app.id);
          onClose();
        },
      })),
      {
        key: "act-lock",
        group: "acciones",
        title: "Bloquear el sistema",
        sub: "Vuelve a la pantalla de entrada",
        glyph: "⏻",
        run: () => {
          onLock();
          onClose();
        },
      },
      {
        key: "act-walls",
        group: "acciones",
        title: "Estudio de fondos",
        sub: "Cambiar el fondo del escritorio y de la pantalla de bloqueo",
        glyph: "▦",
        run: () => {
          onWallpapers();
          onClose();
        },
      },
      {
        key: "act-theme",
        group: "acciones",
        title: "Cambiar estilo del escritorio",
        sub: "Gamer · Windows 11 · macOS",
        glyph: "◇",
        run: () => {
          onToggleTheme();
          onClose();
        },
      },
      {
        key: "act-monitor",
        group: "acciones",
        title: "Monitor del sistema",
        sub: "Procesos, memoria y datos del dispositivo",
        glyph: "▤",
        run: () => {
          onOpenMonitor();
          onClose();
        },
      },
    ];

    const markItems: Item[] = marks.slice(0, 12).map((mark) => ({
      key: `mark-${mark.url}`,
      group: "marcadores" as const,
      title: mark.title || mark.url,
      sub: "Marcador guardado",
      glyph: "★",
      run: () => {
        onOpenUrl(mark.url);
        onClose();
      },
    }));

    const historyItems: Item[] = history.slice(0, 12).map((entry) => ({
      key: `hist-${entry.url}`,
      group: "historial" as const,
      title: entry.title || entry.url,
      sub: entry.url.replace(/^https?:\/\//, "").slice(0, 60),
      glyph: "↺",
      run: () => {
        onOpenUrl(entry.url);
        onClose();
      },
    }));

    return [...base, ...markItems, ...historyItems];
  }, [apps, marks, history, onClose, onLock, onOpenApp, onOpenMonitor, onOpenUrl, onToggleTheme, onWallpapers]);

  const trimmed = query.trim();

  const results = useMemo<Item[]>(() => {
    const webItem: Item | null = trimmed
      ? {
          key: "web-search",
          group: "apps",
          title: looksLikeUrl(trimmed)
            ? `Abrir ${trimmed.replace(/^https?:\/\//, "")}`
            : `Buscar «${trimmed}» en la web`,
          sub: "Con Scramjet V2 · Wisp + libcurl",
          glyph: "◍",
          run: () => {
            const target = looksLikeUrl(trimmed)
              ? /^https?:\/\//i.test(trimmed)
                ? trimmed
                : `https://${trimmed}`
              : `https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`;
            onOpenUrl(target);
            onToast("Scramjet", `Abriendo ${target.replace(/^https?:\/\//, "").slice(0, 48)}`);
            onClose();
          },
        }
      : null;

    const scored = items
      .map((item) => ({ item, value: score(`${item.title} ${item.sub}`, trimmed) }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((entry) => entry.item);

    const list = webItem ? [webItem, ...scored] : scored;
    return list.slice(0, 24);
  }, [items, trimmed, onClose, onOpenUrl, onToast]);

  useEffect(() => {
    setCursor(0);
  }, [trimmed]);

  const runAt = useCallback(
    (index: number) => {
      const item = results[index];
      if (!item) return;
      item.run();
    },
    [results],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        setCursor((previous) => {
          const delta = event.key === "ArrowDown" ? 1 : -1;
          const next = previous + delta;
          if (next < 0) return results.length - 1;
          if (next >= results.length) return 0;
          return next;
        });
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        runAt(cursor);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, results.length, cursor, runAt, onClose]);

  useEffect(() => {
    const active = listRef.current?.querySelector<HTMLElement>('[data-active="1"]');
    active?.scrollIntoView({ block: "nearest" });
  }, [cursor, results]);

  if (!open) return null;

  let lastGroup: Item["group"] | null = null;

  return (
    <div className="d-pal-overlay" onMouseDown={onClose} role="presentation">
      <div
        className="d-pal"
        role="dialog"
        aria-modal="true"
        aria-label="Búsqueda universal de Dounia OS"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="d-pal-top">
          <span className="d-pal-glyph" aria-hidden="true">
            ⌕
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca apps, marcadores, historial… o escribe una web"
            spellCheck={false}
            aria-label="Búsqueda universal"
          />
          <kbd className="d-pal-kbd">esc</kbd>
        </header>

        <div className="d-pal-meta">
          <span className={`d-pal-engine${engine?.ready ? " on" : ""}`}>
            <i />
            {engine
              ? engine.ready
                ? `Scramjet listo · ${engine.connections} conexiones Wisp`
                : "Scramjet sin conexión con Wisp"
              : "Comprobando motor…"}
          </span>
          <span className="d-pal-count">{results.length} resultados</span>
        </div>

        <div className="d-pal-list" ref={listRef}>
          {results.length === 0 && (
            <p className="d-pal-empty">Nada coincide con «{trimmed}». Prueba con otra palabra.</p>
          )}

          {results.map((item, index) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            const active = index === cursor;
            return (
              <React.Fragment key={item.key}>
                {showGroup && <p className="d-pal-group">{GROUP_LABEL[item.group]}</p>}
                <button
                  type="button"
                  data-active={active ? "1" : "0"}
                  className={`d-pal-row${active ? " on" : ""}`}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => runAt(index)}
                >
                  <span className="d-pal-ico">
                    {item.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.icon} alt="" width={18} height={18} />
                    ) : (
                      <b aria-hidden="true">{item.glyph}</b>
                    )}
                  </span>
                  <span className="d-pal-text">
                    <strong>{item.title}</strong>
                    <small>{item.sub}</small>
                  </span>
                  {active && <span className="d-pal-enter">↵</span>}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <footer className="d-pal-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> moverse</span>
          <span><kbd>↵</kbd> abrir</span>
          <span><kbd>esc</kbd> cerrar</span>
          <span className="d-pal-brand">Dounia OS · ⌘K</span>
        </footer>
      </div>
    </div>
  );
}
