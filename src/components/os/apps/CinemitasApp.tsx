"use client";
import React from "react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconExternal, IconRefresh, IconSearch, IconShield } from "../icons";
import { ScramjetFrame } from "./ScramjetFrame";

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

type Filter = "all" | "movie" | "series";

/**
 * La app Cinemitas, servida desde el catálogo propio.
 *
 * cinemitas.org no se deja incrustar de forma fiable (y en muchas redes está
 * filtrado), así que la app carga la cartelera desde /api/cinemitas, con
 * pósters por /api/cm-cover, y extrae los servidores de cada ficha para
 * reproducir el HLS nativo, sin la web llena de anuncios ni iframes pesados.
 */
export function CinemitasApp({
  app,
  onToast,
  initialCine,
}: {
  app: { url?: string };
  onToast: (title: string, body: string) => void;
  initialCine?: string;
}) {
  const [items, setItems] = useState<CinemaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState<CinemaItem | null>(null);
  const [sources, setSources] = useState<{ label: string; url: string }[]>([]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [episodes, setEpisodes] = useState<{ title: string; url: string }[]>([]);
  const [episodeUrl, setEpisodeUrl] = useState("");
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [fallbackDirect, setFallbackDirect] = useState(true);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamPoster, setStreamPoster] = useState("");
  const [streamLoading, setStreamLoading] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [visible, setVisible] = useState(24);
  const videoRef = useRef<HTMLVideoElement>(null);
  const aliveRef = useRef(true);
  const original = app.url ?? "https://cinemitas.org/";

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cinemitas");
      const data = (await response.json()) as { items?: CinemaItem[]; error?: string };
      if (!aliveRef.current) return;
      if (!response.ok) throw new Error(data.error ?? "La cartelera no responde.");
      setItems(data.items ?? []);
    } catch (caught) {
      if (aliveRef.current) {
        setError(caught instanceof Error ? caught.message : "La cartelera no responde.");
      }
    } finally {
      if (aliveRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setVisible(24);
  }, [filter, query]);

  const loadSources = useCallback(async (target: string) => {
    setSourceLoading(true);
    setSourceError(null);
    setSources([]);
    setSourceIndex(0);
    try {
      const response = await fetch(`/api/cinemitas/players?url=${encodeURIComponent(target)}`);
      const data = (await response.json()) as {
        players?: { label: string; url: string }[];
        episodes?: { title: string; url: string }[];
        resolvedUrl?: string;
        error?: string;
      };
      if (!aliveRef.current) return;
      if (!response.ok) throw new Error(data.error ?? "No se pudieron leer los servidores.");
      setSources(data.players ?? []);
      if (data.episodes && data.episodes.length > 0) setEpisodes(data.episodes);
      setEpisodeUrl(data.resolvedUrl ?? target);
      if (!data.players || data.players.length === 0) {
        setSourceError("No hay servidores limpios para este título; abriendo la ficha original.");
      }
    } catch (caught) {
      if (aliveRef.current) {
        setSourceError(caught instanceof Error ? caught.message : "No se pudieron leer los servidores.");
      }
    } finally {
      if (aliveRef.current) setSourceLoading(false);
    }
  }, []);

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
      const byKind = filter === "all" || item.kind === filter;
      const byTerm = !term || item.title.toLowerCase().includes(term);
      return byKind && byTerm;
    });
  }, [items, filter, query]);

  const hero = filtered.find((item) => item.featured) ?? filtered[0] ?? null;
  const shown = filtered.slice(0, visible);

  const play = (item: CinemaItem) => {
    setPlaying(item);
    setSources([]);
    setEpisodes([]);
    setEpisodeUrl(item.url);
    setSourceIndex(0);
    setSourceError(null);
    setStreamUrl(null);
    setStreamPoster("");
    setNonce(0);
    setFallbackDirect(true);
    void loadSources(item.url);
  };

  const changeEpisode = (url: string) => {
    setEpisodeUrl(url);
    setSourceIndex(0);
    setStreamUrl(null);
    setStreamPoster("");
    setNonce(0);
    void loadSources(url);
  };

  const selectedEpisode = episodes.find((episode) => episode.url === episodeUrl);
  const server = sources[sourceIndex];

  const playRef = useRef(play);
  playRef.current = play;
  const initialApplied = useRef(false);

  useEffect(() => {
    if (initialApplied.current || playing || items.length === 0) return;
    const id = initialCine ?? new URLSearchParams(window.location.search).get("cine");
    if (!id) return;
    const match = items.find((item) => item.id === id || item.id.endsWith(id));
    if (match) {
      initialApplied.current = true;
      playRef.current(match);
    }
  }, [items, playing, initialCine]);

  useEffect(() => {
    setStreamUrl(null);
    setStreamPoster("");
    if (!playing || !server || !/vidara\.so\/e\//i.test(server.url)) {
      setStreamLoading(false);
      return;
    }

    let alive = true;
    setStreamLoading(true);
    fetch(`/api/cinemitas/stream?embed=${encodeURIComponent(server.url)}`)
      .then(async (response) => {
        const data = (await response.json()) as { url?: string; poster?: string };
        if (!alive || !response.ok || !data.url) return;
        setStreamUrl(data.url);
        setStreamPoster(data.poster ?? "");
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setStreamLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [playing, server]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    let destroyed = false;
    let hls: { destroy: () => void } | null = null;

    void (async () => {
      const { default: Hls } = await import("hls.js");
      if (destroyed) return;
      if (Hls.isSupported()) {
        const instance = new Hls({ enableWorker: true, backBufferLength: 30 });
        hls = instance;
        instance.loadSource(streamUrl);
        instance.attachMedia(video);
        instance.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;
          instance.destroy();
          hls = null;
          setStreamUrl(null);
          onToast("Cinemitas", "El stream directo se cortó; usando el reproductor del servidor.");
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
      } else {
        setStreamUrl(null);
      }
    })();

    return () => {
      destroyed = true;
      hls?.destroy();
      video.removeAttribute("src");
    };
  }, [streamUrl]);

  return (
    <div className="cineapp">
      <header className="cineapp-top">
        <div className="cineapp-brand">
          <span className="cineapp-mark" aria-hidden="true">
            🎬
          </span>
          <div>
            <strong>Cinemitas</strong>
            <small>Cartelera · cinemitas.org</small>
          </div>
        </div>

        <nav className="cineapp-tabs" aria-label="Filtrar cartelera">
          {(
            [
              ["all", "Todas", counts.all],
              ["movie", "Películas", counts.movie],
              ["series", "Series", counts.series],
            ] as const
          ).map(([id, label, count]) => (
            <button
              key={id}
              type="button"
              className={filter === id ? "on" : ""}
              onClick={() => setFilter(id)}
            >
              {label} <span>{count}</span>
            </button>
          ))}
        </nav>

        <label className="cineapp-search">
          <IconSearch />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar película o serie…"
            aria-label="Buscar en Cinemitas"
          />
        </label>

        <div className="cineapp-actions">
          <button type="button" className="cineapp-ghost" onClick={() => void load()} disabled={loading}>
            <IconRefresh /> {loading ? "Cargando…" : "Actualizar"}
          </button>
          <a className="cineapp-ghost" href={original} target="_blank" rel="noreferrer noopener">
            <IconExternal /> Abrir web
          </a>
        </div>
      </header>

      {playing ? (
        <div className="cinema-player cineapp-player">
          {streamUrl ? (
            <video
              ref={videoRef}
              className="cineapp-video"
              controls
              autoPlay
              playsInline
              poster={playing.backdrop || playing.poster || streamPoster || undefined}
            />
          ) : server ? (
            <iframe
              key={`${server.url}-${nonce}`}
              className="cinema-direct"
              src={server.url}
              title={`${playing.title} · ${server.label}`}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            />
          ) : fallbackDirect ? (
            <iframe
              key={`${playing.id}-${nonce}`}
              className="cinema-direct"
              src={playing.url}
              title={playing.title}
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            />
          ) : (
            <ScramjetFrame url={playing.url} reloadKey={nonce} />
          )}

          {(sourceLoading || streamLoading) && (
            <div className="cineapp-playerstate">
              <span className="cineapp-spin" aria-hidden="true" />
              <strong>{streamLoading ? "Preparando el vídeo…" : "Buscando servidores limpios…"}</strong>
              <small>Sin cargar la web llena de anuncios.</small>
            </div>
          )}

          <div className="cinema-playbar cineapp-playbar">
            <button
              type="button"
              className="cinema-back"
              onClick={() => {
                setPlaying(null);
                setSources([]);
                setEpisodes([]);
                setSourceError(null);
              }}
            >
              ‹ Volver
            </button>
            <div className="cinema-playbar-info">
              <strong>{playing.title}</strong>
              <small>
                {playing.kind === "series" && selectedEpisode
                  ? `Serie · ${selectedEpisode.title}`
                  : `${playing.kind === "movie" ? "Película" : "Serie"} · ${playing.year || "Cinemitas"}${
                      playing.rating ? ` · ★ ${playing.rating}` : ""
                    }`}
              </small>
            </div>

            {episodes.length > 1 && (
              <label className="cineapp-episodes">
                <span>Episodio</span>
                <select value={episodeUrl} onChange={(event) => changeEpisode(event.target.value)}>
                  {episodes.map((episode, index) => (
                    <option key={episode.url} value={episode.url}>
                      {index + 1}. {episode.title}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {sources.length > 1 && (
              <div className="cineapp-servers" role="tablist" aria-label="Servidores de vídeo">
                {sources.map((source, index) => (
                  <button
                    key={source.url}
                    type="button"
                    role="tab"
                    aria-selected={index === sourceIndex}
                    className={index === sourceIndex ? "on" : ""}
                    onClick={() => {
                      setSourceIndex(index);
                      setNonce((value) => value + 1);
                    }}
                  >
                    {source.label}
                  </button>
                ))}
              </div>
            )}

            <button type="button" className="cinema-ghost" onClick={() => setNonce((value) => value + 1)}>
              <IconRefresh /> Reiniciar
            </button>
            {server ? (
              <a className="cinema-ghost" href={server.url} target="_blank" rel="noreferrer noopener">
                <IconExternal /> Abrir servidor
              </a>
            ) : (
              <button type="button" className="cinema-ghost" onClick={() => setFallbackDirect((value) => !value)}>
                <IconShield /> {fallbackDirect ? "Motor" : "Directo"}
              </button>
            )}
          </div>

          {sourceError && (
            <div className="cineapp-playererror">
              <p>{sourceError}</p>
              <div>
                <button type="button" className="cineapp-ghost" onClick={() => void loadSources(episodeUrl || playing.url)}>
                  <IconRefresh /> Reintentar
                </button>
                <a className="cineapp-ghost" href={playing.url} target="_blank" rel="noreferrer noopener">
                  <IconExternal /> Abrir ficha
                </a>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="cineapp-scroll">
          {error && (
            <div className="cineapp-error">
              <span>{error}</span>
              <div>
                <button type="button" className="cineapp-ghost" onClick={() => void load()}>
                  <IconRefresh /> Reintentar
                </button>
                <a className="cineapp-ghost" href={original} target="_blank" rel="noreferrer noopener">
                  <IconExternal /> Abrir Cinemitas
                </a>
              </div>
            </div>
          )}

          {hero && (
            <section className="cineapp-hero">
              <div className="cineapp-hero-art">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hero.backdrop || hero.poster} alt={hero.title} />
                <span className="cineapp-hero-fade" />
              </div>
              <div className="cineapp-hero-copy">
                <span className="cineapp-kicker">
                  Destacado · {hero.kind === "movie" ? "Película" : "Serie"}
                </span>
                <h2>{hero.title}</h2>
                <div className="cineapp-meta">
                  {hero.rating ? <span>★ {hero.rating}</span> : null}
                  {hero.year ? <span>{hero.year}</span> : null}
                  <span className="hd">HD</span>
                </div>
                <p>Cartelera propia y reproductor limpio: sin la web de anuncios, con servidores y episodios.</p>
                <div className="cineapp-hero-actions">
                  <button type="button" className="cineapp-play" onClick={() => play(hero)}>
                    ▶ Ver ahora
                  </button>
                  <a className="cineapp-ghost" href={hero.url} target="_blank" rel="noreferrer noopener">
                    <IconExternal /> Abrir ficha
                  </a>
                </div>
              </div>
            </section>
          )}

          <div className="cineapp-shelfhead">
            <h3>{query ? "Resultados" : "Cartelera"}</h3>
            <span>{filtered.length} títulos · pósters reales</span>
          </div>

          <div className="cineapp-grid">
            {shown.map((item) => (
              <CineCard key={item.id} item={item} onPlay={() => play(item)} />
            ))}

            {loading && items.length === 0 &&
              Array.from({ length: 12 }).map((_, index) => (
                <span className="cinema-skeleton" key={`cine-sk-${index}`} aria-hidden="true" />
              ))}

            {!loading && filtered.length === 0 && (
              <p className="cineapp-empty">
                {error ? "No se pudo cargar la cartelera." : "No hay títulos que coincidan."}
              </p>
            )}
          </div>

          {filtered.length > visible && (
            <button
              type="button"
              className="cineapp-ghost cineapp-more"
              onClick={() => setVisible((value) => Math.min(filtered.length, value + 36))}
            >
              Ver {Math.min(36, filtered.length - visible)} títulos más
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CineCard({ item, onPlay }: { item: CinemaItem; onPlay: () => void }) {
  const [failed, setFailed] = useState(!item.poster);

  return (
    <button type="button" className="cinema-card" onClick={onPlay} title={item.title}>
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
