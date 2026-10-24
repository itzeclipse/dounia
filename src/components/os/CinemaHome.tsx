"use client";
import React from "react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClockValue } from "@/lib/os/hooks";
import { IconExternal, IconRefresh, IconSearch, IconShield } from "./icons";
import { ScramjetFrame } from "./apps/ScramjetFrame";

interface CinemaItem {
  id: string;
  title: string;
  url: string;
  poster: string;
  backdrop: string;
  rating: number;
  year: string;
  kind: "movie" | "series";
  featured: boolean;
}

interface CinemaHomeProps {
  clock: ClockValue;
  user: string;
  onExit: () => void;
  onOpenApps: () => void;
  onOpenSettings: () => void;
  onOpenWallpapers: () => void;
  onLock: () => void;
  onToast: (title: string, body: string) => void;
}

type Filter = "all" | "movie" | "series";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Toda la cartelera" },
  { id: "movie", label: "Películas" },
  { id: "series", label: "Series" },
];

/**
 * Modo cine: el escritorio se convierte en un palacio de cine con la cartelera
 * real de cinemitas.org (películas y series) y una sala de proyección.
 */
export function CinemaHome({
  clock,
  user,
  onExit,
  onOpenApps,
  onOpenSettings,
  onOpenWallpapers,
  onLock,
  onToast,
}: CinemaHomeProps) {
  const [items, setItems] = useState<CinemaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(60);
  const [heroId, setHeroId] = useState("");
  const [heroFailed, setHeroFailed] = useState(false);
  const [playing, setPlaying] = useState<CinemaItem | null>(null);
  const [direct, setDirect] = useState(true);
  const [nonce, setNonce] = useState(0);
  const gridRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cinemitas");
      const data = (await response.json()) as { items?: CinemaItem[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "La cartelera no responde.");
      setItems(data.items ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "La cartelera no responde.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setVisible(60);
  }, [filter, query]);

  useEffect(() => {
    setHeroFailed(false);
  }, [heroId, filter]);

  useEffect(() => {
    if (!playing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPlaying(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  const counts = useMemo(
    () => ({
      all: items.length,
      movie: items.filter((item) => item.kind === "movie").length,
      series: items.filter((item) => item.kind === "series").length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      const matchesKind = filter === "all" || item.kind === filter;
      const matchesTerm = !term || item.title.toLowerCase().includes(term);
      return matchesKind && matchesTerm;
    });
  }, [items, filter, query]);

  const hero = useMemo(
    () =>
      filtered.find((item) => item.id === heroId) ??
      filtered.find((item) => item.featured) ??
      filtered[0] ??
      null,
    [filtered, heroId],
  );

  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible]);

  const play = (item: CinemaItem) => {
    setPlaying(item);
    onToast("Cinemitas", `Proyectando «${item.title}» en la sala.`);
  };

  const random = () => {
    if (filtered.length === 0) return;
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    setHeroId(pick.id);
    setHeroFailed(false);
    gridRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section className="cinema" aria-label="Modo cine">
      <div className="cinema-bg" aria-hidden="true">
        <span className="cinema-spot cinema-spot-a" />
        <span className="cinema-spot cinema-spot-b" />
        <span className="cinema-curtain cinema-curtain-l" />
        <span className="cinema-curtain cinema-curtain-r" />
        <span className="cinema-grain" />
        <span className="cinema-seats" />
      </div>

      <header className="cinema-top">
        <div className="cinema-marquee">
          <span className="cinema-bulbs" aria-hidden="true" />
          <div className="cinema-sign">
            <small>Sala 1 · Estrenos</small>
            <h1>CINEMITAS</h1>
            <span>Películas y series</span>
          </div>
        </div>

        <nav className="cinema-tabs" aria-label="Cartelera">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={filter === item.id ? "on" : ""}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
              <span>{counts[item.id]}</span>
            </button>
          ))}
        </nav>

        <div className="cinema-status">
          <span className="cinema-user">{user}</span>
          <strong className="cinema-clock">{clock.time}</strong>
          <div className="cinema-tools">
            <button type="button" onClick={onOpenApps}>
              Apps
            </button>
            <button type="button" onClick={onOpenWallpapers}>
              Fondos
            </button>
            <button type="button" onClick={onOpenSettings}>
              Ajustes
            </button>
            <button type="button" onClick={onLock}>
              Bloquear
            </button>
            <button type="button" className="cinema-exit" onClick={onExit}>
              Escritorio
            </button>
          </div>
        </div>
      </header>

      {playing ? (
        <div className="cinema-player">
          {direct ? (
            <iframe
              className="cinema-direct"
              src={playing.url}
              title={playing.title}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <ScramjetFrame url={playing.url} reloadKey={nonce} />
          )}
          <div className="cinema-playbar">
            <button type="button" className="cinema-back" onClick={() => setPlaying(null)}>
              ‹ Volver
            </button>
            <div className="cinema-playbar-info">
              <strong>{playing.title}</strong>
              <small>
                {playing.kind === "movie" ? "Película" : "Serie"} · {playing.year || "Cinemitas"}
                {playing.rating ? ` · ★ ${playing.rating}` : ""}
              </small>
            </div>
            <button type="button" className="cinema-ghost" onClick={() => setNonce((value) => value + 1)}>
              <IconRefresh /> Reiniciar
            </button>
            <button type="button" className="cinema-ghost" onClick={() => setDirect((value) => !value)}>
              <IconShield /> {direct ? "Motor" : "Directo"}
            </button>
            <a className="cinema-ghost" href={playing.url} target="_blank" rel="noreferrer noopener">
              <IconExternal /> Abrir
            </a>
          </div>
        </div>
      ) : (
        <main className="cinema-main">
          <div className="cinema-toolbar">
            <label className="cinema-search">
              <IconSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar película o serie…"
                aria-label="Buscar en la cartelera"
              />
            </label>
            <div className="cinema-toolbar-actions">
              <button type="button" className="cinema-ghost" onClick={random} disabled={filtered.length === 0}>
                <IconShield /> Sorpréndeme
              </button>
              <button type="button" className="cinema-ghost" onClick={() => void load()} disabled={loading}>
                <IconRefresh /> {loading ? "Abriendo…" : "Actualizar cartelera"}
              </button>
            </div>
          </div>

          {error && (
            <div className="cinema-error">
              <span>{error}</span>
              <button type="button" className="cinema-ghost" onClick={() => void load()}>
                <IconRefresh /> Reintentar
              </button>
            </div>
          )}

          {hero && (
            <section className={`cinema-hero${heroFailed ? " is-fallback" : ""}`}>
              <div className="cinema-hero-screen">
                {heroFailed || !hero.backdrop ? (
                  <span className="cinema-fallback">{hero.title.slice(0, 2).toUpperCase()}</span>
                ) : (
                  <>
                    <span
                      className="cinema-screen-blur"
                      style={{ backgroundImage: `url("${hero.backdrop}")` }}
                      aria-hidden="true"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className="cinema-screen-still"
                      src={hero.backdrop}
                      alt={hero.title}
                      onError={() => setHeroFailed(true)}
                    />
                  </>
                )}
                <span className="cinema-screen-glow" aria-hidden="true" />
              </div>

              <div className="cinema-hero-copy">
                <span className="cinema-kicker">
                  Función destacada · {hero.kind === "movie" ? "Película" : "Serie"}
                </span>
                <h2>{hero.title}</h2>
                <div className="cinema-meta">
                  {hero.rating ? <span className="cinema-star">★ {hero.rating}</span> : null}
                  {hero.year ? <span>{hero.year}</span> : null}
                  <span className="cinema-hd">HD</span>
                  <span>{hero.kind === "movie" ? "Película" : "Serie"}</span>
                </div>
                <p>
                  Proyección dentro del sistema, con el motor del escritorio. Elige butaca y entra:
                  la sala abre cinemitas.org sin salir de aquí.
                </p>
                <div className="cinema-actions">
                  <button type="button" className="cinema-ticket" onClick={() => play(hero)}>
                    <span aria-hidden="true">🎟</span> Entrar a la sala
                  </button>
                  <button type="button" className="cinema-ghost" onClick={random}>
                    Otra función
                  </button>
                </div>
              </div>

              <div className="cinema-hero-poster">
                {heroFailed || !hero.poster ? (
                  <span className="cinema-fallback small">{hero.title.slice(0, 1)}</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={hero.poster} alt="" onError={() => setHeroFailed(true)} />
                )}
              </div>
            </section>
          )}

          <section className="cinema-shelf" ref={gridRef}>
            <header className="cinema-shelf-head">
              <h2>{query ? "Resultados" : filter === "series" ? "Series en cartel" : filter === "movie" ? "Películas en cartel" : "Cartelera completa"}</h2>
              <span>{filtered.length} títulos · cinemitas.org</span>
            </header>

            <div className="cinema-grid">
              {shown.map((item) => (
                <CinemaCard
                  key={item.id}
                  item={item}
                  active={hero?.id === item.id}
                  onHover={() => {
                    setHeroId(item.id);
                  }}
                  onPlay={() => play(item)}
                />
              ))}

              {loading && items.length === 0 &&
                Array.from({ length: 12 }).map((_, index) => (
                  <span className="cinema-card cinema-skeleton" key={`skeleton-${index}`} aria-hidden="true" />
                ))}

              {!loading && filtered.length === 0 && (
                <p className="cinema-empty">
                  {error ? "La cartelera no responde ahora mismo." : "No hay títulos que coincidan."}
                </p>
              )}
            </div>

            <footer className="cinema-shelf-foot">
              {filtered.length > visible ? (
                <button
                  type="button"
                  className="cinema-ghost"
                  onClick={() => setVisible((value) => Math.min(filtered.length, value + 60))}
                >
                  Ver {Math.min(60, filtered.length - visible)} títulos más
                </button>
              ) : (
                <button type="button" className="cinema-ghost" onClick={() => void load()} disabled={loading}>
                  {loading ? "Abriendo…" : "Actualizar cartelera"}
                </button>
              )}
              <span>{items.length} películas y series extraídas de cinemitas.org</span>
            </footer>
          </section>
        </main>
      )}

      <footer className="cinema-foot">
        <span className="cinema-foot-brand">CINE · PALACIO DOUNIA</span>
        <span>Elige una butaca y disfruta · Esc vuelve a la cartelera</span>
        <span className="cinema-foot-status">
          <i /> Sala 1 · {clock.time}
        </span>
      </footer>
    </section>
  );
}

function CinemaCard({
  item,
  active,
  onHover,
  onPlay,
}: {
  item: CinemaItem;
  active: boolean;
  onHover: () => void;
  onPlay: () => void;
}) {
  const [failed, setFailed] = useState(!item.poster);

  return (
    <button
      type="button"
      className={`cinema-card${active ? " on" : ""}`}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onPlay}
      title={item.title}
    >
      <span className={`cinema-poster${failed ? " is-fallback" : ""}`}>
        {failed ? (
          <span className="cinema-fallback small">{item.title.slice(0, 2).toUpperCase()}</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.poster}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setFailed(true)}
          />
        )}
        {item.rating ? <span className="cinema-rating">★ {item.rating}</span> : null}
        <span className="cinema-kind">{item.kind === "movie" ? "Película" : "Serie"}</span>
        <span className="cinema-play" aria-hidden="true">
          ▶
        </span>
      </span>
      <span className="cinema-card-title">{item.title}</span>
      <span className="cinema-card-meta">{item.year || "Cinemitas"}</span>
    </button>
  );
}
