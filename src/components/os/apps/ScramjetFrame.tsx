"use client";
import React from 'react';

import { useCallback, useEffect, useRef, useState } from "react";
import { hostOf } from "@/lib/os/data";
import {
  createScramjetFrame,
  ensureScramjet,
  type ScramjetFrameHandle,
} from "@/lib/os/scramjet";
import { IconExternal, IconRefresh, IconShield } from "../icons";

interface ScramjetFrameProps {
  url: string;
  /** Cambiar este número recarga la página. */
  reloadKey?: number;
  onNavigate?: (url: string) => void;
}

/**
 * Cualquier web dentro de Dounia OS, servida por Scramjet V2.
 *
 * Reemplaza al viejo ProxyFrame: ya no se pide el HTML a un endpoint y se
 * inyecta con srcDoc, sino que el service worker de Scramjet intercepta las
 * peticiones del propio iframe y las saca por Wisp + libcurl. Esto es lo que
 * hace que las apps y los juegos funcionen aunque el sitio bloquee iframes.
 */
export function ScramjetFrame({ url, reloadKey = 0, onNavigate }: ScramjetFrameProps) {
  const elementRef = useRef<HTMLIFrameElement | null>(null);
  const frameRef = useRef<ScramjetFrameHandle | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("Arrancando Scramjet…");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      setState("loading");
      setMessage("Arrancando Scramjet…");
      try {
        await ensureScramjet();
        if (cancelled || !elementRef.current) return;
        setMessage(`Cargando ${hostOf(url)}…`);
        const frame = await createScramjetFrame(elementRef.current, url);
        if (cancelled) return;
        frameRef.current = frame;
        setState("ready");
      } catch (error) {
        if (cancelled) return;
        setState("error");
        setMessage(error instanceof Error ? error.message : "Scramjet no pudo arrancar.");
      }
    };

    void start();
    return () => {
      cancelled = true;
    };
    // El frame se crea una sola vez; la navegación se controla abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  useEffect(() => {
    if (!frameRef.current || state !== "ready") return;
    frameRef.current.go(url);
  }, [url, reloadKey, state]);

  const reload = useCallback(() => {
    if (frameRef.current && state === "ready") {
      frameRef.current.reload();
      return;
    }
    frameRef.current = null;
    setAttempt((n) => n + 1);
  }, [state]);

  return (
    <div className="d-frame-wrap">
      <iframe
        ref={elementRef}
        className="d-win-frame"
        title={`Scramjet: ${hostOf(url)}`}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture; gamepad; clipboard-read; clipboard-write; microphone; camera; xr-spatial-tracking"
        referrerPolicy="no-referrer"
      />

      {state === "loading" && (
        <div className="d-frame-loading">
          <span className="d-frame-spinner" />
          <p>{message}</p>
        </div>
      )}

      {state === "error" && (
        <div className="d-frame-loading">
          <span className="d-frame-spinner" style={{ background: "#ef4444" }} />
          <p style={{ maxWidth: 460, textAlign: "center", lineHeight: 1.6 }}>
            Scramjet no pudo abrir {hostOf(url)}. {message}
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button type="button" className="d-btn" onClick={reload}>
              <IconRefresh /> Reintentar
            </button>
            <a className="d-btn" href={url} target="_blank" rel="noreferrer noopener">
              <IconExternal /> Abrir fuera
            </a>
          </div>
        </div>
      )}

      {state === "ready" && (
        <div className="d-sj-badge" title={`Motor Scramjet V2 · ${hostOf(url)}`}>
          <IconShield /> Scramjet
        </div>
      )}
      {/* onNavigate se mantiene por compatibilidad con las apps que lo pasan. */}
      <span hidden>{onNavigate ? "" : ""}</span>
    </div>
  );
}
