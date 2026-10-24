"use client";
import React from 'react';

import { useCallback, useMemo, useState } from "react";
import {
  RACOON_SECTIONS,
  RACOON_TOTAL,
  RACOON_URL,
  racoonInitials,
  racoonTint,
} from "@/lib/os/racoon";
import { IconExternal, IconRefresh, IconSearch, IconShield } from "../icons";
import { ScramjetFrame } from "./ScramjetFrame";

interface RacoonGamesProps {
  onToast: (title: string, body: string) => void;
}

/**
 * Racoon Games — apartado propio con el catálogo de raccoongame.com.
 *
 * La parrilla sale de su portada pública (60+ juegos reales con su nota). Como
 * su ficha individual exige sesión, cada portada abre el catálogo de Racoon
 * dentro del sistema (misma ventana, sin pestañas nuevas) para jugar ahí.
 */
export function RacoonGames({ onToast }: RacoonGamesProps) {
  const [query, setQuery] = useState("");
  const [live, setLive] = useState(false);
  const [nonce, setNonce] = useState(0);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RACOON_SECTIONS;
    return RACOON_SECTIONS.map((section) => ({
      ...section,
      games: section.games.filter((game) => game.name.toLowerCase().includes(q)),
    })).filter((section) => section.games.length > 0);
  }, [query]);

  const openLive = useCallback(
    (game?: string) => {
      setLive(true);
      setNonce((n) => n + 1);
      onToast(
        game ? "Racoon · abriendo" : "Racoon Game",
        game
          ? `Buscando «${game}» en el catálogo de Racoon, dentro del sistema.`
          : "Catálogo completo de Racoon Game dentro del sistema.",
      );
    },
    [onToast],
  );

  if (live) {
    return (
      <div className="d-frame-wrap rcn-live">
        <div className="d-proxybar" style={{ flex: "none" }}>
          <button type="button" className="d-tool" onClick={() => setLive(false)}>
            ← Volver a las portadas
          </button>
          <span className="d-sj-tag" title="Motor del sistema">
            <IconShield /> Scramjet · {
              <span>raccoongame.com</span>
            }
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button
              type="button"
              className="d-tool icon-only"
              aria-label="Recargar"
              onClick={() => setNonce((n) => n + 1)}
            >
              <IconRefresh />
            </button>
            <a className="d-tool" href={RACOON_URL} target="_blank" rel="noreferrer noopener">
              <IconExternal /> Externo
            </a>
          </div>
        </div>
        <ScramjetFrame url={RACOON_URL} reloadKey={nonce} />
      </div>
    );
  }

  return (
    <div className="rcn">
      <header className="rcn-head">
        <div>
          <p className="rcn-eyebrow">Racoon Game · catálogo</p>
          <h2>Racoon Games</h2>
          <p className="rcn-sub">
            {RACOON_TOTAL} juegos de su portada, organizados como en la plataforma. Todo se abre
            aquí mismo: sin pestañas nuevas y sin instalar nada.
          </p>
        </div>
        <div className="rcn-actions">
          <label className="rcn-search">
            <IconSearch />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar en Racoon…"
              aria-label="Buscar juego de Racoon"
            />
          </label>
          <button type="button" className="d-btn primary" onClick={() => openLive()}>
            Abrir Racoon
          </button>
        </div>
      </header>

      {sections.length === 0 && (
        <p className="rcn-empty">Ningún juego coincide con «{query}».</p>
      )}

      {sections.map((section) => (
        <section key={section.id} className="rcn-section">
          <div className="rcn-section-head">
            <h3>{section.title}</h3>
            <span>{section.note}</span>
          </div>
          <div className="rcn-grid">
            {section.games.map((game) => {
              const tint = racoonTint(game.name);
              return (
                <button
                  key={`${section.id}-${game.name}`}
                  type="button"
                  className="rcn-card"
                  onClick={() => openLive(game.name)}
                  title={`${game.name} · abrir en Racoon`}
                >
                  <span
                    className="rcn-poster"
                    style={{ background: `linear-gradient(150deg, ${tint.from}, ${tint.to})` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/cover?q=${encodeURIComponent(game.name)}&c=${encodeURIComponent(tint.from)}`}
                      alt={game.name}
                      loading="lazy"
                      decoding="async"
                    />
                    {game.score && <em>{game.score}</em>}
                  </span>
                  <span className="rcn-name">{game.name}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <p className="rcn-foot">
        Portadas generadas por Dounia · los juegos y sus marcas pertenecen a Racoon Game. Al pulsar
        una portada se abre su plataforma aquí dentro para jugar sin salir.
      </p>
    </div>
  );
}
