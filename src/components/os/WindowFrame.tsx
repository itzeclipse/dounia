"use client";
import React from 'react';

import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AppIcon } from "./AppIcon";
import {
  IconClose,
  IconContract,
  IconExpand,
  IconExternal,
  IconMaximize,
  IconMinus,
  IconRestore,
} from "./icons";

export interface WindowRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface WindowFrameProps {
  id: string;
  appId: string;
  title: string;
  subtitle?: string;
  icon: string;
  accent: string;
  index: number;
  z: number;
  focused: boolean;
  maximized: boolean;
  fullscreen?: boolean;
  externalHref?: string;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onToggleMax: () => void;
  onToggleFullscreen?: () => void;
  onSnapPreview: (rect: WindowRect | null) => void;
  children: ReactNode;
}

const STORE = "dounia.winpos.v4";
const MIN_W = 380;
const MIN_H = 260;
/** Room reserved at the bottom for the dock. */
const DOCK_SPACE = 92;

function readStore(): Record<string, WindowRect> {
  try {
    const raw = window.localStorage.getItem(STORE);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, WindowRect>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(map: Record<string, WindowRect>) {
  try {
    window.localStorage.setItem(STORE, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Deterministic on the server, then fitted to the real viewport on mount. */
function baseRect(index: number): WindowRect {
  const w = 940;
  const h = 620;
  return { x: 170 + (index % 4) * 26, y: 70 + (index % 4) * 26, w, h };
}

function clampRect(rect: WindowRect, minW = MIN_W, minH = MIN_H): WindowRect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.max(Math.min(minW, vw - 24), Math.min(rect.w, vw - 24));
  const h = Math.max(Math.min(minH, vh - 60), Math.min(rect.h, vh - 60));
  return {
    x: Math.max(8, Math.min(rect.x, vw - w - 8)),
    y: Math.max(8, Math.min(rect.y, vh - h - 8)),
    w,
    h,
  };
}

function fitRect(rect: WindowRect): WindowRect {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = Math.max(320, Math.min(rect.w, vw - 24));
  const h = Math.max(240, Math.min(rect.h, vh - DOCK_SPACE));
  return {
    x: Math.max(8, Math.min(rect.x, Math.max(8, vw - w - 8))),
    y: Math.max(8, Math.min(rect.y, Math.max(8, vh - h - DOCK_SPACE))),
    w,
    h,
  };
}

type Direction = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const HANDLES: Direction[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

export function WindowFrame({
  appId,
  title,
  subtitle,
  icon,
  accent,
  index,
  z,
  focused,
  maximized,
  fullscreen,
  externalHref,
  onFocus,
  onClose,
  onMinimize,
  onToggleMax,
  onToggleFullscreen,
  onSnapPreview,
  children,
}: WindowFrameProps) {
  const [rect, setRect] = useState<WindowRect>(() => baseRect(index));
  const [viewport, setViewport] = useState({ w: 1280, h: 800 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ px: number; py: number; rect: WindowRect } | null>(null);
  const resizeRef = useRef<{ px: number; py: number; rect: WindowRect; dir: Direction } | null>(null);
  const rectRef = useRef(rect);
  rectRef.current = rect;

  /* Restore the saved geometry, fitted to this screen. */
  useEffect(() => {
    const saved = readStore()[appId];
    const next = fitRect(saved ?? baseRect(index));
    setRect(next);
  }, [appId, index]);

  useEffect(() => {
    const sync = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      setRect((previous) => fitRect(previous));
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const commit = useCallback(
    (next: WindowRect) => {
      setRect(next);
      const map = readStore();
      map[appId] = next;
      writeStore(map);
    },
    [appId],
  );

  /* --------------------------------------------------------------- moving */

  const startDrag = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    if (fullscreen) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea")) return;
    onFocus();
    let base = rectRef.current;
    if (maximized) {
      const restored: WindowRect = {
        x: event.clientX - baseRect(index).w / 2,
        y: Math.max(8, event.clientY - 18),
        w: Math.min(baseRect(index).w, window.innerWidth - 40),
        h: baseRect(index).h,
      };
      onToggleMax();
      base = fitRect(restored);
      setRect(base);
    }
    dragRef.current = { px: event.clientX, py: event.clientY, rect: base };
    setDragging(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onDragMove = (event: React.PointerEvent) => {
    const info = dragRef.current;
    if (!info) return;
    const vw = window.innerWidth;
    const next = clampRect({
      ...info.rect,
      x: info.rect.x + (event.clientX - info.px),
      y: info.rect.y + (event.clientY - info.py),
    });
    setRect(next);
    const zone =
      event.clientY <= 4 ? "top" : event.clientX <= 4 ? "left" : event.clientX >= vw - 4 ? "right" : null;
    if (!zone) {
      onSnapPreview(null);
      return;
    }
    const h = window.innerHeight - DOCK_SPACE;
    onSnapPreview(
      zone === "top"
        ? { x: 8, y: 8, w: vw - 16, h }
        : zone === "left"
          ? { x: 8, y: 8, w: vw / 2 - 12, h }
          : { x: vw / 2 + 4, y: 8, w: vw / 2 - 12, h },
    );
  };

  const endDrag = (event: React.PointerEvent) => {
    const info = dragRef.current;
    dragRef.current = null;
    setDragging(false);
    onSnapPreview(null);
    if (!info) return;
    const vw = window.innerWidth;
    const h = window.innerHeight - DOCK_SPACE;
    if (event.clientY <= 4) {
      if (!maximized) onToggleMax();
      return;
    }
    if (event.clientX <= 4) {
      commit({ x: 8, y: 8, w: vw / 2 - 12, h });
      return;
    }
    if (event.clientX >= vw - 4) {
      commit({ x: vw / 2 + 4, y: 8, w: vw / 2 - 12, h });
      return;
    }
    commit(rectRef.current);
  };

  /* -------------------------------------------------------------- resizing */

  const startResize = (event: React.PointerEvent, dir: Direction) => {
    if (event.button !== 0) return;
    if (fullscreen) return;
    event.stopPropagation();
    onFocus();
    if (maximized) onToggleMax();
    resizeRef.current = { px: event.clientX, py: event.clientY, rect: rectRef.current, dir };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  };

  const onResizeMove = (event: React.PointerEvent) => {
    const info = resizeRef.current;
    if (!info) return;
    const dx = event.clientX - info.px;
    const dy = event.clientY - info.py;
    const base = info.rect;
    let { x, y, w, h } = base;
    if (info.dir.includes("e")) w = base.w + dx;
    if (info.dir.includes("s")) h = base.h + dy;
    if (info.dir.includes("w")) {
      w = base.w - dx;
      x = base.x + dx;
    }
    if (info.dir.includes("n")) {
      h = base.h - dy;
      y = base.y + dy;
    }
    if (w < MIN_W) {
      if (info.dir.includes("w")) x -= MIN_W - w;
      w = MIN_W;
    }
    if (h < MIN_H) {
      if (info.dir.includes("n")) y -= MIN_H - h;
      h = MIN_H;
    }
    setRect({ x, y, w, h });
  };

  const endResize = () => {
    if (!resizeRef.current) return;
    resizeRef.current = null;
    commit(rectRef.current);
  };

  const geometry = fullscreen
    ? { x: 0, y: 0, w: viewport.w, h: viewport.h }
    : maximized
      ? { x: 8, y: 8, w: Math.max(320, viewport.w - 16), h: Math.max(240, viewport.h - DOCK_SPACE) }
      : rect;

  return (
    <section
      className={`d-window d-window--float${focused ? " is-focused" : ""}${maximized ? " is-max" : ""}${
        fullscreen ? " is-fullscreen" : ""
      }${dragging ? " is-dragging" : ""}`}
      style={{
        left: geometry.x,
        top: geometry.y,
        width: geometry.w,
        height: geometry.h,
        zIndex: z,
      }}
      aria-label={title}
      onPointerDownCapture={onFocus}
    >
      <header
        className="d-win-bar"
        onPointerDown={startDrag}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={(event) => {
          if ((event.target as HTMLElement).closest("button, a, input")) return;
          onToggleMax();
        }}
      >
        <div className="d-win-id">
          <AppIcon src={icon} alt={title} accent={accent} size={24} />
          <div style={{ minWidth: 0 }}>
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </div>
        </div>
        <div className="d-win-tools">
          {externalHref && (
            <a
              className="d-tool icon-only"
              href={externalHref}
              target="_blank"
              rel="noreferrer noopener"
              aria-label="Abrir fuera"
            >
              <IconExternal />
            </a>
          )}
          <button type="button" className="d-tool icon-only" aria-label="Minimizar" onClick={onMinimize}>
            <IconMinus />
          </button>
          <button
            type="button"
            className="d-tool icon-only"
            aria-label={maximized ? "Restaurar" : "Maximizar"}
            onClick={onToggleMax}
          >
            {maximized ? <IconRestore /> : <IconMaximize />}
          </button>
          {onToggleFullscreen && (
            <button
              type="button"
              className="d-tool icon-only"
              aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              title={fullscreen ? "Salir de pantalla completa (Esc)" : "Pantalla completa"}
              onClick={onToggleFullscreen}
            >
              {fullscreen ? <IconContract /> : <IconExpand />}
            </button>
          )}
          <button type="button" className="d-tool icon-only danger" aria-label="Cerrar" onClick={onClose}>
            <IconClose />
          </button>
        </div>
      </header>

      <div className="d-win-body">{children}</div>

      {!maximized && !fullscreen &&
        HANDLES.map((dir) => (
          <span
            key={dir}
            className={`d-window-handle h-${dir}`}
            onPointerDown={(event) => startResize(event, dir)}
            onPointerMove={onResizeMove}
            onPointerUp={endResize}
            onPointerCancel={endResize}
            aria-hidden="true"
          />
        ))}
    </section>
  );
}

