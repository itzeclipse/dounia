"use client";
import React from 'react';

import { useMemo, useState } from "react";
import {
  RACCOON_GAMES,
  RACCOON_SITE,
  raccoonLogo,
} from "@/lib/os/raccoon-games";
import { IconExternal, IconSearch, IconShield } from "../icons";
import { AppIcon } from "../AppIcon";

/**
 * Raccoon Games — el catálogo de juegos cloud de Raccoon Game dentro del
 * sistema. Cada ficha tiene su logo de marca y se abre con Scramjet V2.
 *
 * El catálogo vive en `lib/os/raccoon-games.ts` para que la ventana
 * "Racoon Cloud" muestre exactamente los mismos juegos.
 */
interface RaccoonGamesAppProps {
  onOpenUrl: (url: string) => void;
  onToast: (title: string, body: string) => void;
}

export function RaccoonGamesApp({ onOpenUrl, onToast }: RaccoonGamesAppProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RACCOON_GAMES;
    return RACCOON_GAMES.filter(
      (game) => game.name.toLowerCase().includes(q) || game.tag.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="d-rg">
      <header className="d-rg-head">
        <div>
          <p className="d-rg-eyebrow">
            <IconShield /> Scramjet V2
          </p>
          <h3>Raccoon Games</h3>
          <p className="d-rg-sub">
            Catálogo cloud de Raccoon Game. Cada ficha abre el juego con el motor del sistema.
          </p>
        </div>
        <label className="d-rg-search">
          <IconSearch />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar juego…"
            aria-label="Buscar juego"
            spellCheck={false}
          />
        </label>
      </header>

      <div className="d-rg-grid">
        {filtered.map((game) => (
          <button
            key={`${game.name}-${game.domain}`}
            type="button"
            className="d-rg-card"
            title={game.deepLink ?? RACCOON_SITE}
            onClick={() => {
              const target = game.deepLink ?? RACCOON_SITE;
              onOpenUrl(target);
              onToast(
                "Raccoon Games",
                game.deepLink
                  ? `Abriendo ${game.name}…`
                  : `Buscando ${game.name} en Raccoon Game con Scramjet…`,
              );
            }}
          >
            <span className="d-rg-logo">
              <AppIcon
                src={raccoonLogo(game.domain)}
                alt={game.name}
                accent={game.accent}
                size={38}
              />
            </span>
            <span className="d-rg-name">{game.name}</span>
            <span className="d-rg-tag">{game.tag}</span>
            <span className="d-rg-go">
              <IconExternal />
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="d-rg-empty">Ningún juego coincide con «{query}».</p>
      )}

      <footer className="d-rg-foot">
        <span>
          {RACCOON_GAMES.length} juegos · los logos vienen del CDN y caen a un monograma si faltan
        </span>
        <a className="d-tool" href={RACCOON_SITE} target="_blank" rel="noreferrer noopener">
          Abrir Raccoon Game
        </a>
      </footer>
    </div>
  );
}
