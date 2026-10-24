"use client";
import React from 'react';

import { useCallback, useState } from "react";
import { SEARCH_ENGINES, hostOf } from "@/lib/os/data";
import { IconExternal, IconRefresh, IconShield } from "../icons";
import { ScramjetFrame } from "./ScramjetFrame";

interface ScramjetBrowserProps {
  initialUrl?: string;
  onToast: (title: string, body: string) => void;
}

function resolveInput(raw: string, search: (query: string) => string): string {
  const value = raw.trim();
  if (!value) return "";
  const looksLikeUrl =
    /^(https?:\/\/|www\.)/i.test(value) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(value);
  if (!looksLikeUrl) return search(value);
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/**
 * Scramjet — el único motor de Dounia OS.
 *
 * Sustituye a Astra Unblocker: aquí no hay backend de proxy ni selección de
 * motores, todo se carga por Scramjet V2 (service worker + Wisp + libcurl).
 */
export function ScramjetBrowser({ initialUrl = "", onToast }: ScramjetBrowserProps) {
  const [address, setAddress] = useState(initialUrl);
  const [current, setCurrent] = useState(initialUrl);
  const [history, setHistory] = useState<string[]>(initialUrl ? [initialUrl] : []);
  const [forward, setForward] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const [engine] = useState(SEARCH_ENGINES[0]);

  const navigate = useCallback(
    (raw: string) => {
      const target = resolveInput(raw, engine.search);
      if (!target) return;
      setAddress(target);
      setCurrent(target);
      setHistory((previous) => [...previous.slice(-30), target]);
      setForward([]);
      setReloadKey((n) => n + 1);
      onToast("Scramjet", `Cargando ${hostOf(target)} con el motor V2.`);
    },
    [engine.search, onToast],
  );

  const back = useCallback(() => {
    setHistory((previous) => {
      if (previous.length < 2) return previous;
      const trimmed = previous.slice(0, -1);
      const target = trimmed[trimmed.length - 1];
      setForward((next) => [...next, previous[previous.length - 1]]);
      setAddress(target);
      setCurrent(target);
      setReloadKey((n) => n + 1);
      return trimmed;
    });
  }, []);

  const goForward = useCallback(() => {
    setForward((next) => {
      if (next.length === 0) return next;
      const target = next[next.length - 1];
      setHistory((previous) => [...previous, target]);
      setAddress(target);
      setCurrent(target);
      setReloadKey((n) => n + 1);
      return next.slice(0, -1);
    });
  }, []);

  return (
    <>
      <div className="d-proxybar">
        <button
          type="button"
          className="d-tool icon-only"
          aria-label="Atrás"
          onClick={back}
          disabled={history.length < 2}
        >
          ←
        </button>
        <button
          type="button"
          className="d-tool icon-only"
          aria-label="Adelante"
          onClick={goForward}
          disabled={forward.length === 0}
        >
          →
        </button>
        <button
          type="button"
          className="d-tool icon-only"
          aria-label="Recargar"
          onClick={() => setReloadKey((n) => n + 1)}
        >
          <IconRefresh />
        </button>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            navigate(address);
          }}
          style={{ flex: 1, display: "flex", gap: 8 }}
        >
          <IconShield style={{ width: 15, height: 15, color: "#a855f7", flex: "none" }} />
          <input
            className="d-proxy-input"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder={`Busca en ${engine.name} o escribe una URL…`}
            spellCheck={false}
            aria-label="Dirección o búsqueda"
          />
          <button type="submit" className="d-btn primary" style={{ height: 34, padding: "0 16px" }}>
            Ir
          </button>
        </form>

        <span className="d-sj-tag" title="Motor único del sistema">
          Scramjet V2
        </span>

        {current && (
          <a
            className="d-tool icon-only"
            href={current}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Abrir fuera"
          >
            <IconExternal />
          </a>
        )}
      </div>

      {current ? (
        <ScramjetFrame url={current} reloadKey={reloadKey} />
      ) : (
        <div className="d-bhome">
          <div className="d-bhome-inner">
            <span className="d-bhome-mark">
              <IconShield />
            </span>
            <h3>Scramjet V2</h3>
            <p>
              El único motor de Dounia OS. Intercepta cada petición con un service worker y la
              saca por Wisp + libcurl, así que ninguna web puede bloquear el iframe.
            </p>

            <form
              className="d-bhome-search"
              onSubmit={(event) => {
                event.preventDefault();
                navigate(address);
              }}
            >
              <IconShield style={{ width: 16, height: 16, color: "#a855f7" }} />
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder={`Busca en ${engine.name} o escribe una dirección…`}
                spellCheck={false}
                aria-label="Buscar o abrir una dirección"
              />
              <button type="submit" className="d-btn primary" style={{ height: 36, padding: "0 18px" }}>
                Ir
              </button>
            </form>

            <div className="d-bhome-grid">
              {[
                { name: "Google", url: "https://www.google.com/" },
                { name: "YouTube", url: "https://www.youtube.com/" },
                { name: "Wikipedia", url: "https://es.wikipedia.org/" },
                { name: "Twitch", url: "https://www.twitch.tv/" },
                { name: "Reddit", url: "https://www.reddit.com/" },
                { name: "GitHub", url: "https://github.com/" },
              ].map((link) => (
                <button
                  key={link.url}
                  type="button"
                  className="d-bhome-tile"
                  onClick={() => navigate(link.url)}
                  title={link.url}
                >
                  <span>{link.name.charAt(0)}</span>
                  <strong>{link.name.toLowerCase()}</strong>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
