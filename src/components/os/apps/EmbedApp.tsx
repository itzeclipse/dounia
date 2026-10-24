"use client";
import React from 'react';

import { useEffect, useState } from "react";
import { hostOf, type OSApp } from "@/lib/os/data";
import { IconExternal, IconRefresh, IconShield } from "../icons";
import { ScramjetFrame } from "./ScramjetFrame";

interface EmbedAppProps {
  app: OSApp;
  onToast: (title: string, body: string) => void;
}

/**
 * Ventana de app de ocio (streaming, juegos, herramientas).
 *
 * Ya no hay elección de motor: todo se carga con Scramjet V2, que intercepta
 * las peticiones del iframe con el service worker y las saca por Wisp +
 * libcurl. Así el sitio no puede bloquear el marco ni saltar a otra pestaña.
 */
export function EmbedApp({ app, onToast }: EmbedAppProps) {
  const [nonce, setNonce] = useState(0);
  const [view, setView] = useState<"engine" | "direct">(app.direct ? "direct" : "engine");
  const url = app.url ?? "https://example.com";

  useEffect(() => {
    setView(app.direct ? "direct" : "engine");
    setNonce(0);
  }, [app.id, app.direct]);

  return (
    <>
      <div className="d-proxybar">
        <span className="d-status-line" style={{ margin: 0 }}>
          <i style={{ background: view === "direct" ? "#22c55e" : "#a855f7" }} />
          {view === "direct" ? "Directo" : "Scramjet"} · {hostOf(url)}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {app.direct && (
            <button
              type="button"
              className="d-tool"
              onClick={() => {
                setView((value) => (value === "direct" ? "engine" : "direct"));
                setNonce((n) => n + 1);
              }}
              title="Cambiar entre carga directa y Scramjet"
            >
              {view === "direct" ? "Motor" : "Directo"}
            </button>
          )}
          <span className="d-sj-tag" title="Motor del sistema">
            <IconShield /> {view === "direct" ? "Nativo" : "Scramjet V2"}
          </span>
          <button
            type="button"
            className="d-tool icon-only"
            aria-label="Recargar"
            onClick={() => {
              setNonce((n) => n + 1);
              onToast(view === "direct" ? "Carga directa" : "Scramjet", `Recargando ${hostOf(url)}.`);
            }}
          >
            <IconRefresh />
          </button>
          <a className="d-tool" href={url} target="_blank" rel="noreferrer noopener" title="Abrir fuera del sistema">
            <IconExternal />
          </a>
        </div>
      </div>

      <div className="d-win-body" style={{ flex: 1 }}>
        {view === "direct" ? (
          <div className="d-frame-wrap">
            <iframe
              key={nonce}
              className="d-win-frame"
              src={url}
              title={`Directo: ${hostOf(url)}`}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; gamepad; clipboard-read; clipboard-write; microphone; camera"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <ScramjetFrame url={url} reloadKey={nonce} />
        )}
      </div>
    </>
  );
}
