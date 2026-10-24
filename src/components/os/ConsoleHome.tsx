"use client";
import React from "react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClockValue } from "@/lib/os/hooks";
import { IconExternal, IconRefresh, IconSearch, IconShield } from "./icons";
import { ScramjetFrame } from "./apps/ScramjetFrame";
import { CrazyNativeGame } from "./apps/CrazyNativeGame";

export type ConsoleMode = "playstation" | "xbox" | "nintendo";

interface ConsoleGame {
  id: string;
  title: string;
  url: string;
  thumb: string;
  categories: string[];
}

interface ConsoleHomeProps {
  mode: ConsoleMode;
  clock: ClockValue;
  user: string;
  onModeChange: (mode: ConsoleMode) => void;
  onExit: () => void;
  onOpenApps: () => void;
  onOpenSettings: () => void;
  onOpenWallpapers: () => void;
  onLock: () => void;
  onToast: (title: string, body: string) => void;
  /** Slug de CrazyGames para abrir su ficha directamente. */
  initialGame?: string;
}

const MODES: { id: ConsoleMode; short: string; label: string }[] = [
  { id: "playstation", short: "PS5", label: "PlayStation" },
  { id: "xbox", short: "Xbox", label: "Xbox" },
  { id: "nintendo", short: "Switch", label: "Nintendo" },
];

const BRAND: Record<ConsoleMode, { name: string; tagline: string; eyebrow: string; shapes: string; pad: string }> = {
  playstation: {
    name: "PlayStation 5",
    tagline: "Play has no limits",
    eyebrow: "Bienvenida de nuevo",
    shapes: "△ ○ ✕ □",
    pad: "△ ○ ✕ □",
  },
  xbox: {
    name: "Xbox Series X",
    tagline: "Power your dreams",
    eyebrow: "Jump back in",
    shapes: "X",
    pad: "A B X Y",
  },
  nintendo: {
    name: "Nintendo Switch",
    tagline: "Play anywhere, anytime",
    eyebrow: "Elige un juego",
    shapes: "◉",
    pad: "A B",
  },
};

function initials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

/**
 * Los tres modos consola del sistema. Cada uno convierte el escritorio en una
 * consola de verdad: su propia identidad visual, su barra, su biblioteca de
 * juegos real y un reproductor a pantalla completa con Scramjet.
 */
export function ConsoleHome({
  mode,
  clock,
  user,
  onModeChange,
  onExit,
  onOpenApps,
  onOpenSettings,
  onOpenWallpapers,
  onLock,
  onToast,
  initialGame,
}: ConsoleHomeProps) {
  const brand = BRAND[mode];
  const [games, setGames] = useState<ConsoleGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(120);
  const [heroId, setHeroId] = useState("");
  const [heroFailed, setHeroFailed] = useState(false);
  const [playing, setPlaying] = useState<ConsoleGame | null>(null);
  /* Los juegos Unity se montan directamente con /api/cg-native/<slug>, sin el
   * gameframe de anuncios que se quedaba en «Almost there». «Motor» queda como
   * alternativa para juegos que necesiten pasar por Scramjet. */
  const [direct, setDirect] = useState(true);
  const [nonce, setNonce] = useState(0);
  const rowRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/crazygames");
      const data = (await response.json()) as { games?: ConsoleGame[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "CrazyGames no responde.");
      setGames(data.games ?? []);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "CrazyGames no responde.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /* Al buscar se vuelve a empezar por el principio de la lista. */
  useEffect(() => {
    setVisible(120);
  }, [query]);

  useEffect(() => {
    setHeroFailed(false);
  }, [heroId]);

  /* Esc cierra el juego y devuelve a la consola. */
  useEffect(() => {
    if (!playing) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPlaying(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return games;
    return games.filter(
      (game) =>
        game.title.toLowerCase().includes(term) ||
        game.categories.some((category) => category.toLowerCase().includes(term)),
    );
  }, [games, query]);

  const hero = useMemo(
    () => filtered.find((game) => game.id === heroId) ?? filtered[0] ?? null,
    [filtered, heroId],
  );

  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible]);

  const play = (game: ConsoleGame) => {
    setPlaying(game);
    onToast("CrazyGames", `Abriendo «${game.title}»…`);
    try {
      const next = new URL(window.location.href);
      next.searchParams.set("jugar", game.id);
      window.history.replaceState(null, "", `${next.pathname}${next.search}`);
    } catch {
      /* sin historial: el juego sigue abriéndose igual */
    }
  };

  /* Enlace directo a un juego: /theme/playstation?jugar=<slug> (y &motor=1
   * para abrirlo con Scramjet en lugar del reproductor nativo). */
  const initialApplied = useRef(false);

  useEffect(() => {
    if (initialApplied.current || playing || games.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const slug = initialGame ?? params.get("jugar");
    if (!slug) return;
    const game = games.find((item) => item.id === slug);
    if (!game) return;
    initialApplied.current = true;
    setDirect(params.get("motor") !== "1");
    setPlaying(game);
    onToast("CrazyGames", `Abriendo «${game.title}» desde el enlace.`);
  }, [games, playing, onToast, initialGame]);

  const random = () => {
    if (filtered.length === 0) return;
    const pick = filtered[Math.floor(Math.random() * filtered.length)];
    setHeroId(pick.id);
    rowRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  };

  return (
    <section className={`console console-${mode}`} aria-label={`Modo ${brand.name}`}>
      <div className="console-bg" aria-hidden="true">
        <span className="console-orb console-orb-a" />
        <span className="console-orb console-orb-b" />
        <span className="console-grain" />
        {mode === "playstation" && (
          <div className="console-glyphs">
            {["△", "○", "✕", "□"].map((glyph) => (
              <i key={glyph}>{glyph}</i>
            ))}
          </div>
        )}
        {mode === "xbox" && <span className="console-xring" />}
      </div>

      <header className="console-top">
        <div className="console-brand">
          {mode === "nintendo" ? (
            <span className="console-joycons" aria-hidden="true">
              <i />
              <i />
            </span>
          ) : (
            <span className="console-mark" aria-hidden="true">
              {mode === "playstation" ? "PS" : "X"}
            </span>
          )}
          <div>
            <strong>{brand.name}</strong>
            <small>{brand.tagline}</small>
          </div>
        </div>

        <nav className="console-modes" aria-label="Cambiar de consola">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={item.id === mode ? "on" : ""}
              aria-pressed={item.id === mode}
              onClick={() => onModeChange(item.id)}
            >
              <span className={`console-mode-dot ${item.id}`} aria-hidden="true" />
              {item.short}
            </button>
          ))}
        </nav>

        <div className="console-status">
          <span className="console-user">{user}</span>
          <strong className="console-clock">{clock.time}</strong>
          <div className="console-tools">
            <button type="button" onClick={onOpenApps}>
              Apps
            </button>
            <button type="button" onClick={onOpenWallpapers}>
              Fondos
            </button>
            <button type="button" onClick={onOpenSettings}>
              Ajustes
            </button>
            <button type="button" onClick={onLock} aria-label="Bloquear la sesión">
              Bloquear
            </button>
            <button type="button" className="console-exit" onClick={onExit}>
              Escritorio
            </button>
          </div>
        </div>
      </header>

      {playing ? (
        <div className="console-player">
          {direct ? (
            <CrazyNativeGame key={`${playing.id}-${nonce}`} slug={playing.id} title={playing.title} />
          ) : (
            <ScramjetFrame url={playing.url} reloadKey={nonce} />
          )}
          <div className="console-playbar">
            <button type="button" className="console-back" onClick={() => setPlaying(null)}>
              ‹ Volver
            </button>
            <div className="console-playbar-info">
              <strong>{playing.title}</strong>
              <small>
                {playing.categories.join(" · ") || brand.name} ·{" "}
                {direct ? "juego nativo · sin wrapper de anuncios" : "motor Scramjet"}
              </small>
            </div>
            <button type="button" className="console-ghost" onClick={() => setNonce((value) => value + 1)}>
              <IconRefresh /> Reiniciar
            </button>
            <button
              type="button"
              className="console-ghost"
              title={direct ? "Cargar a través de Scramjet" : "Usar el reproductor nativo"}
              onClick={() => setDirect((value) => !value)}
            >
              <IconShield /> {direct ? "Motor" : "Directo"}
            </button>
            <a
              className="console-ghost"
              href={playing.url}
              target="_blank"
              rel="noreferrer noopener"
            >
              <IconExternal /> Abrir
            </a>
          </div>
        </div>
      ) : (
        <main className="console-main">
          <div className="console-toolbar">
            <label className="console-search">
              <IconSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar en CrazyGames…"
                aria-label="Buscar juegos"
              />
            </label>
            <div className="console-toolbar-actions">
              <button type="button" className="console-ghost" onClick={random} disabled={filtered.length === 0}>
                <IconShield /> Sorpréndeme
              </button>
              <button
                type="button"
                className="console-ghost"
                onClick={() => void load()}
                disabled={loading}
              >
                <IconRefresh /> {loading ? "Cargando…" : "Recargar"}
              </button>
            </div>
          </div>

          {error && (
            <div className="console-error">
              <span>{error}</span>
              <button type="button" className="console-ghost" onClick={() => void load()}>
                <IconRefresh /> Reintentar
              </button>
            </div>
          )}

          {hero && (
            <section className={`console-hero${heroFailed ? " is-fallback" : ""}`}>
              <div className="console-hero-art">
                {heroFailed || !hero.thumb ? (
                  <span className="console-fallback">{initials(hero.title)}</span>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hero.thumb}
                    alt={hero.title}
                    draggable={false}
                    onError={() => setHeroFailed(true)}
                  />
                )}
              </div>
              <div className="console-hero-fade" aria-hidden="true" />
              <div className="console-hero-copy">
                <span className="console-eyebrow">
                  {brand.eyebrow} · {brand.shapes}
                </span>
                <h1>{hero.title}</h1>
                <p>{hero.categories.join(" · ") || "Juego HTML5 · sin instalar nada"}</p>
                <div className="console-actions">
                  <button type="button" className="console-play" onClick={() => play(hero)}>
                    <span aria-hidden="true">▶</span> Jugar
                  </button>
                  <button type="button" className="console-ghost" onClick={random}>
                    Otro juego
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="console-shelf">
            <header className="console-shelf-head">
              <h2>{query ? "Resultados" : mode === "nintendo" ? "Todos los juegos" : "Tu biblioteca"}</h2>
              <span>
                {filtered.length} juegos · crazygames.com
              </span>
            </header>

            <div className="console-row" ref={rowRef}>
              {shown.map((game) => (
                <ConsoleCard
                  key={game.id}
                  game={game}
                  active={hero?.id === game.id}
                  onHover={() => setHeroId(game.id)}
                  onPlay={() => play(game)}
                />
              ))}

              {loading && games.length === 0 &&
                Array.from({ length: 10 }).map((_, index) => (
                  <span className="console-card console-skeleton" key={`skeleton-${index}`} aria-hidden="true" />
                ))}

              {!loading && filtered.length === 0 && (
                <p className="console-empty">
                  {error ? "El catálogo no responde ahora mismo." : "Ningún juego coincide con la búsqueda."}
                </p>
              )}
            </div>

            <footer className="console-shelf-foot">
              {filtered.length > visible ? (
                <button
                  type="button"
                  className="console-ghost"
                  onClick={() => setVisible((value) => Math.min(filtered.length, value + 120))}
                >
                  Ver {Math.min(120, filtered.length - visible)} juegos más
                </button>
              ) : (
                <button type="button" className="console-ghost" onClick={() => void load()} disabled={loading}>
                  {loading ? "Cargando…" : "Recargar catálogo"}
                </button>
              )}
              <span>{filtered.length} juegos extraídos de crazygames.com</span>
            </footer>
          </section>
        </main>
      )}

      <footer className="console-foot" aria-hidden={playing ? true : undefined}>
        <span className="console-pad">{brand.pad}</span>
        <span>Mando / clic para jugar · Esc vuelve a la consola</span>
        <span className="console-foot-status">
          <i /> {brand.name} · {clock.time}
        </span>
      </footer>
    </section>
  );
}

function ConsoleCard({
  game,
  active,
  onHover,
  onPlay,
}: {
  game: ConsoleGame;
  active: boolean;
  onHover: () => void;
  onPlay: () => void;
}) {
  const [failed, setFailed] = useState(!game.thumb);

  return (
    <button
      type="button"
      className={`console-card${active ? " on" : ""}`}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onPlay}
      title={game.title}
    >
      <span className={`console-card-art${failed ? " is-fallback" : ""}`}>
        {failed ? (
          <span className="console-fallback">{initials(game.title)}</span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.thumb}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setFailed(true)}
          />
        )}
        <span className="console-card-play" aria-hidden="true">
          ▶
        </span>
      </span>
      <span className="console-card-name">{game.title}</span>
      <span className="console-card-tag">{game.categories[0] ?? "Juego"}</span>
    </button>
  );
}
