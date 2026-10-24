"use client";
import React from 'react';

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconRefresh, IconSearch, IconShield } from "../icons";
import { ScramjetFrame } from "./ScramjetFrame";

interface CatalogGame {
  id: string;
  title: string;
  url: string;
  thumb: string;
  categories: string[];
}

interface GamesAppProps {
  onToast: (title: string, body: string) => void;
}

type Source = "catalog" | "astra" | "racoon";

const SHAPES = ["△", "○", "✕", "□"];

/**
 * HTML Games with a PlayStation 5 style interface, with two real catalogues:
 * the GameDistribution HTML5 feed ("Catálogo") and the full CineOS/Astra
 * library ("CineOS", 300+ games extracted from the launcher's own registry).
 */
export function GamesApp({ onToast }: GamesAppProps) {
  const [source, setSource] = useState<Source>("catalog");
  const [games, setGames] = useState<CatalogGame[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hero, setHero] = useState<CatalogGame | null>(null);
  const [playing, setPlaying] = useState<CatalogGame | null>(null);
  const [direct, setDirect] = useState(true);
  const [nonce, setNonce] = useState(0);


  const loadCatalog = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/games?page=${nextPage}&amount=60`);
      const data = (await response.json()) as { games?: CatalogGame[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el catálogo.");
      setGames((previous) => {
        const seen = new Set(previous.map((game) => game.id));
        return [...previous, ...(data.games ?? []).filter((game) => !seen.has(game.id))];
      });
      setPage(nextPage);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar el catálogo.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAstra = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/astra-games");
      const data = (await response.json()) as { games?: CatalogGame[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el catálogo de CineOS.");
      setGames(data.games ?? []);
      setHero(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo cargar el catálogo de CineOS.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setGames([]);
    setHero(null);
    setError(null);
    setPage(0);
    if (source === "astra") {
      void loadAstra();
    } else if (source === "catalog") {
      void loadCatalog(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  useEffect(() => {
    if (!hero && games.length > 0) setHero(games[0]);
  }, [games, hero]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter(
      (game) =>
        game.title.toLowerCase().includes(q) ||
        game.categories.some((category) => category.toLowerCase().includes(q)),
    );
  }, [games, query]);

  const sourceLabel = source === "astra" ? "Biblioteca CineOS" : "HTML5";
  const isRacoon = source === "racoon";

  if (source === "racoon") {
    return (
      <div className="ps5-player">
        <ScramjetFrame url="https://www.raccoongame.com" reloadKey={nonce} />
        <div className="ps5-osd">
          <button
            type="button"
            className="ps5-ps"
            onClick={() => setSource("catalog")}
            aria-label="Volver al catálogo"
          >
            PS
          </button>
          <div className="ps5-osd-info">
            <strong>Racoon Game</strong>
            <small>Catálogo en vivo · se juega dentro del sistema</small>
          </div>
          <button type="button" className="ps5-ghost" onClick={() => setNonce((n) => n + 1)}>
            <IconRefresh /> Reiniciar
          </button>
          <a className="ps5-ghost" href="https://www.raccoongame.com" target="_blank" rel="noreferrer noopener">
            <IconShield /> Externo
          </a>
        </div>
      </div>
    );
  }

  if (playing) {
    return (
      <div className="ps5-player">
        {direct ? (
          <iframe
            key={`${playing.id}-${nonce}-direct`}
            className="ps5-direct"
            src={playing.url}
            title={playing.title}
            allow="autoplay; fullscreen; gamepad; clipboard-write; encrypted-media; picture-in-picture"
          />
        ) : (
          <ScramjetFrame url={playing.url} reloadKey={nonce} />
        )}
        <div className="ps5-osd">
          <button type="button" className="ps5-ps" onClick={() => setPlaying(null)} aria-label="Volver al catálogo">
            PS
          </button>
          <div className="ps5-osd-info">
            <strong>{playing.title}</strong>
            <small>
              {playing.categories.join(" · ") || sourceLabel} ·{" "}
              {direct ? "embed oficial · si no carga, pulsa Motor" : "motor Scramjet"}
            </small>
          </div>
          <button
            type="button"
            className="ps5-ghost"
            title={direct ? "Cargar a través de Scramjet" : "Volver al embed oficial"}
            onClick={() => {
              setDirect((value) => !value);
              setNonce((n) => n + 1);
            }}
          >
            <IconShield /> {direct ? "Motor" : "Directo"}
          </button>
          <button type="button" className="ps5-ghost" onClick={() => setNonce((n) => n + 1)}>
            <IconRefresh /> Reiniciar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ps5-app">
      <aside className="ps5-rail" aria-label="Navegación PS5">
        <span className="ps5-shapes" aria-hidden="true">
          {SHAPES.map((shape) => (
            <i key={shape}>{shape}</i>
          ))}
        </span>
        <button type="button" className="ps5-nav on" title="Juegos">
          ▦
        </button>
        <button type="button" className="ps5-nav" title="Buscar" onClick={() => document.getElementById("ps5-search")?.focus()}>
          ⌕
        </button>
        <button
          type="button"
          className="ps5-nav"
          title={source === "astra" ? "Recargar CineOS" : "Cargar más"}
          onClick={() => (source === "astra" ? void loadAstra() : void loadCatalog(page + 1))}
        >
          ＋
        </button>
      </aside>

      <main className="ps5-main">
        <header className="ps5-top">
          <div>
            <h1>PS5</h1>
            <p>{games.length > 0 ? `${games.length} juegos cargados` : "Conectando con el catálogo…"}</p>
          </div>
          <div className="ps5-source" role="tablist" aria-label="Catálogo de juegos">
            <button
              type="button"
              role="tab"
              aria-selected={source === "catalog"}
              className={`ps5-tab${source === "catalog" ? " on" : ""}`}
              onClick={() => setSource("catalog")}
            >
              Catálogo
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={source === "astra"}
              className={`ps5-tab${source === "astra" ? " on" : ""}`}
              onClick={() => setSource("astra")}
            >
              Biblioteca CineOS
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRacoon}
              className={`ps5-tab${isRacoon ? " on" : ""}`}
              onClick={() => setSource("racoon")}
            >
              Racoon Games
            </button>
          </div>
          <label className="ps5-search">
            <IconSearch />
            <input
              id="ps5-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar juego o género…"
              aria-label="Buscar juegos"
            />
          </label>
        </header>

        {error && (
          <div className="ps5-error">
            <span>{error}</span>
            <button
              type="button"
              className="ps5-ghost"
              onClick={() => (source === "astra" ? void loadAstra() : void loadCatalog(Math.max(1, page)))}
            >
              <IconRefresh /> Reintentar
            </button>
          </div>
        )}

        {hero && (
          <section className="ps5-hero">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero.thumb} alt={hero.title} />
            <div className="ps5-hero-fade" />
            <div className="ps5-hero-copy">
              <span className="ps5-eyebrow">Juego destacado</span>
              <h2>{hero.title}</h2>
              <p>{hero.categories.join(" · ") || `${sourceLabel} · juega aquí mismo`}</p>
              <div className="ps5-actions">
                <button
                  type="button"
                  className="ps5-play"
                  onClick={() => {
                    setDirect(true);
                    setPlaying(hero);
                    onToast("Juegos", `Abriendo «${hero.title}»…`);
                  }}
                >
                  <span aria-hidden="true">▶</span> Jugar
                </button>
              </div>
            </div>
          </section>
        )}

        <div className="ps5-rowhead">
          <h3>{source === "astra" ? "Biblioteca de CineOS" : "Todos los juegos"}</h3>
          <span>
            {filtered.length} en pantalla · {source === "astra" ? "extraído del launcher CineOS/Astra" : "catálogo GameDistribution"}
          </span>
        </div>

        <div className="ps5-row">
          {filtered.map((game) => (
            <button
              key={game.id}
              type="button"
              className={`ps5-card${hero?.id === game.id ? " on" : ""}`}
              onMouseEnter={() => setHero(game)}
              onFocus={() => setHero(game)}
              onClick={() => {
                setHero(game);
                setDirect(true);
                setPlaying(game);
                onToast("Juegos", `Abriendo «${game.title}»…`);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={game.thumb} alt={game.title} loading="lazy" decoding="async" />
              <span className="ps5-card-name">{game.title}</span>
              <span className="ps5-card-tag">{game.categories[0] ?? "Juego"}</span>
            </button>
          ))}
          {filtered.length === 0 && !loading && (
            <p className="ps5-empty">{error ? "El catálogo no responde ahora mismo." : "Ningún juego coincide."}</p>
          )}
        </div>

        <footer className="ps5-foot">
          {source === "catalog" ? (
            <button type="button" className="ps5-play small" disabled={loading} onClick={() => void loadCatalog(page + 1)}>
              {loading ? "Cargando…" : `Cargar 60 juegos más (página ${page + 1})`}
            </button>
          ) : (
            <button type="button" className="ps5-play small" disabled={loading} onClick={() => void loadAstra()}>
              {loading ? "Cargando…" : "Recargar biblioteca de CineOS"}
            </button>
          )}
          <span>{games.length} juegos · {sourceLabel} real</span>
        </footer>
      </main>
    </div>
  );
}
