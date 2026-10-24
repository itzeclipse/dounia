"use client";
import React, { useEffect, useRef, useState } from "react";

import { IconExternal, IconRefresh } from "../icons";

interface GameInfo {
  slug: string;
  title: string;
  mode: "unity" | "embed";
  loaderUrl?: string;
  config?: Record<string, unknown>;
  embedUrl: string;
}

interface UnityInstance {
  Quit?: () => void;
}

declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: Record<string, unknown>,
      onProgress?: (progress: number) => void,
    ) => Promise<UnityInstance>;
    CrazyGames?: { SDK?: Record<string, unknown> };
  }
}

const SDK_STUB = {
  init: () => Promise.resolve(),
  isInitialized: true,
  environment: "crazygames",
  game: {
    gameplayStart: () => {},
    gameplayStop: () => {},
    happytime: () => {},
    loadingStart: () => {},
    loadingStop: () => {},
    inviteLink: () => Promise.resolve(null),
    showInviteButton: () => {},
    hideInviteButton: () => {},
    getGameSettings: () => ({}),
    settings: {},
  },
  ad: {
    requestAd: () => Promise.resolve(),
    hasAdblock: () => false,
    addAdEventListener: () => {},
  },
  data: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    hasKey: () => false,
  },
  user: {
    getUser: () => null,
    getUserToken: () => Promise.resolve(null),
    addScore: () => {},
    isUserAccountAvailable: false,
    showAuthPrompt: () => Promise.resolve(),
  },
  analytics: {
    trackOrder: () => {},
    trackEvent: () => {},
  },
};

/**
 * Juego de CrazyGames sin el gameframe de anuncios.
 *
 * Los títulos Unity se montan sobre un canvas propio (el build se descarga
 * directo del CDN); el resto usa su embed oficial. Se ejecuta en el documento
 * de la consola, no en un iframe same-origin, para que el CSP del preview no
 * lo bloquee.
 */
export function CrazyNativeGame({ slug, title }: { slug: string; title: string }) {
  const [info, setInfo] = useState<GameInfo | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("Leyendo el juego…");
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const instanceRef = useRef<UnityInstance | null>(null);

  useEffect(() => {
    let alive = true;
    setInfo(null);
    setState("loading");
    setProgress(0);
    setMessage("Leyendo el juego…");

    fetch(`/api/cg-info/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        const data = (await response.json()) as GameInfo & { error?: string };
        if (!alive) return;
        if (!response.ok || data.error) throw new Error(data.error ?? "No se pudo leer el juego.");
        setInfo(data);
        if (data.mode === "embed") setState("ready");
      })
      .catch((error) => {
        if (!alive) return;
        setState("error");
        setMessage(error instanceof Error ? error.message : "No se pudo leer el juego.");
      });

    return () => {
      alive = false;
    };
  }, [slug, attempt]);

  useEffect(() => {
    if (!info || info.mode !== "unity" || !info.loaderUrl) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    window.CrazyGames = { SDK: SDK_STUB as unknown as Record<string, unknown> };

    const script = document.createElement("script");
    script.src = info.loaderUrl;
    script.async = true;
    script.dataset.cgNative = slug;
    script.onload = () => {
      if (cancelled) return;
      const create = window.createUnityInstance;
      if (typeof create !== "function") {
        setState("error");
        setMessage("El build de Unity no expuso createUnityInstance.");
        return;
      }
      setMessage("Descargando el juego…");
      create(canvas, info.config ?? {}, (value) => setProgress(value))
        .then((instance) => {
          if (cancelled) {
            instance.Quit?.();
            return;
          }
          instanceRef.current = instance;
          setState("ready");
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setState("error");
          setMessage(error instanceof Error ? error.message : "Unity no pudo arrancar el juego.");
        });
    };
    script.onerror = () => {
      if (cancelled) return;
      setState("error");
      setMessage("No se pudo cargar el loader del juego.");
    };
    document.body.appendChild(script);

    return () => {
      cancelled = true;
      instanceRef.current?.Quit?.();
      instanceRef.current = null;
      script.remove();
    };
  }, [info, slug]);

  return (
    <div className="cg-native">
      {info?.mode === "unity" && (
        <canvas
          ref={canvasRef}
          id="unity-canvas"
          tabIndex={0}
          className="cg-native-canvas"
          aria-label={title}
        />
      )}
      {info?.mode === "embed" && (
        <iframe
          className="cg-native-embed"
          src={info.embedUrl}
          title={title}
          allow="autoplay; fullscreen; gamepad; clipboard-write; encrypted-media"
        />
      )}

      {state === "loading" && (
        <div className="cg-native-load">
          <strong>{title}</strong>
          <small>{message}</small>
          <div className="cg-native-bar">
            <i style={{ width: `${Math.max(2, Math.round(progress * 100))}%` }} />
          </div>
          <small>{Math.round(progress * 100)}%</small>
        </div>
      )}

      {state === "error" && (
        <div className="cg-native-load">
          <strong>No se pudo abrir «{title}»</strong>
          <small className="cg-native-err">{message}</small>
          <div className="cg-native-actions">
            <button
              type="button"
              onClick={() => {
                setAttempt((value) => value + 1);
              }}
            >
              <IconRefresh /> Reintentar
            </button>
            {info?.embedUrl && (
              <a href={info.embedUrl} target="_blank" rel="noreferrer noopener">
                <IconExternal /> Abrir embed
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
