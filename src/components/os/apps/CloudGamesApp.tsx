"use client";
import React from 'react';

import { useMemo, useState } from "react";
import { CLOUD_GAMES, CLOUD_PLATFORMS, cloudGameUrl } from "@/lib/os/data";
import {
  RACCOON_GAMES,
  RACCOON_SITE,
  TEMP_MAIL_URL,
  raccoonLogo,
} from "@/lib/os/raccoon-games";
import { IconRefresh, IconSearch, IconShield } from "../icons";
import { AppIcon } from "../AppIcon";
import { ScramjetFrame } from "./ScramjetFrame";

interface CloudGamesAppProps {
  onToast: (title: string, body: string) => void;
  onOpenProxy: (url: string) => void;
}

const RACCOON = "https://www.raccoongame.com";

/**
 * Racoon Cloud — every game opens through the system proxy (Astra), so a
 * school filter like Blocksi can't block it and nothing jumps to a new tab.
 */
export function CloudGamesApp({ onToast, onOpenProxy }: CloudGamesAppProps) {
  const [tab, setTab] = useState<"raccoon" | "split" | "xbox" | "platforms">("split");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(CLOUD_GAMES[0]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CLOUD_GAMES;
    return CLOUD_GAMES.filter(
      (game) => game.name.toLowerCase().includes(q) || game.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [query]);

  const openGame = (url: string, name: string) => {
    onOpenProxy(url);
    onToast("Racoon Cloud", `Abriendo ${name} a través del proxy.`);
  };

  return (
    <div className="x-app">
      <header className="x-head">
        <div className="x-brand">
          <span className="x-logo" aria-hidden="true">
            ✕
          </span>
          <div>
            <strong>RACOON CLOUD</strong>
            <small>{CLOUD_GAMES.length} juegos cloud · raccoongame.com + Xbox</small>
          </div>
        </div>
        <label className="x-search">
          <IconSearch />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar juego o género…"
            aria-label="Buscar juego cloud"
          />
        </label>
        <div className="x-head-actions">
          <button type="button" className="x-btn primary" onClick={() => openGame(RACCOON, "Raccoon Game")}>
            <IconShield /> Abrir Raccoon
          </button>
        </div>
      </header>

      <div className="x-tabs" role="tablist">
        <button type="button" className={`x-tab${tab === "raccoon" ? " on" : ""}`} onClick={() => setTab("raccoon")}>
          Raccoon · catálogo completo
        </button>
        <button type="button" className={`x-tab${tab === "split" ? " on" : ""}`} onClick={() => setTab("split")}>
          Juegos + Temp Mail
        </button>
        <button type="button" className={`x-tab${tab === "xbox" ? " on" : ""}`} onClick={() => setTab("xbox")}>
          Xbox Cloud ({CLOUD_GAMES.length})
        </button>
        <button type="button" className={`x-tab${tab === "platforms" ? " on" : ""}`} onClick={() => setTab("platforms")}>
          Cloud gratis y legal
        </button>
      </div>

      {tab === "raccoon" && (
        <div className="x-body">
          <section className="x-hero x-hero-raccoon">
            <div className="x-hero-copy">
              <span className="x-eyebrow">raccoongame.com</span>
              <h2>Todo el catálogo de Raccoon, en vivo</h2>
              <p>
                Raccoon Game publica un catálogo dinámico (sin API pública), así que aquí se carga su web real a través
                del proxy del sistema: todos sus juegos, con su buscador y sus categorías.
              </p>
              <div className="x-hero-actions">
                <button type="button" className="x-btn primary big" onClick={() => openGame(RACCOON, "el catálogo de Raccoon")}>
                  ▶ Abrir catálogo completo
                </button>
              </div>
              <p className="x-note">
                Si el reproductor exige origin propio, el proxy reescribe el HTML y carga los recursos; el sistema te
                avisará si un juego en concreto no puede reproducirse.
              </p>
            </div>
          </section>

          <>
            <div className="x-rowhead">
              <h3>Acceso directo a juegos conocidos</h3>
              <span>enlaces reales a Xbox Cloud Gaming, por el proxy</span>
            </div>
            <div className="x-grid">
              {CLOUD_GAMES.slice(0, 12).map((game) => (
                <button
                  key={game.name}
                  type="button"
                  className="x-tile"
                  onClick={() => openGame(cloudGameUrl(game.name), game.name)}
                >
                  <span
                    className="x-tile-art"
                    style={{ background: `radial-gradient(80% 80% at 70% 20%, ${game.accent}, #070a0d 78%)` }}
                  >
                    {game.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="x-tile-name">{game.name}</span>
                  <span className="x-tile-tag">{game.tags[0]}</span>
                </button>
              ))}
            </div>
          </>
        </div>
      )}

      {tab === "split" && (
        <div className="x-split">
          <section className="x-split-col">
            <header className="x-split-head">
              <h3>Juegos de raccoongames.com</h3>
              <span>{RACCOON_GAMES.length} fichas · Scramjet</span>
            </header>
            <div className="x-split-grid">
              {RACCOON_GAMES.map((game) => (
                <button
                  key={`${game.name}-${game.domain}`}
                  type="button"
                  className="x-split-card"
                  title={game.deepLink ?? RACCOON_SITE}
                  onClick={() => openGame(game.deepLink ?? RACCOON_SITE, game.name)}
                >
                  <AppIcon
                    src={raccoonLogo(game.domain)}
                    alt={game.name}
                    accent={game.accent}
                    size={30}
                  />
                  <span className="x-split-name">{game.name}</span>
                  <span className="x-split-tag">{game.tag}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="x-split-col x-split-mail">
            <header className="x-split-head">
              <h3>Temp Mail</h3>
              <div className="x-split-actions">
                <button
                  type="button"
                  className="x-btn"
                  onClick={() => openGame(TEMP_MAIL_URL, "Temp Mail")}
                >
                  <IconShield /> En ventana
                </button>
                <a className="x-btn" href={TEMP_MAIL_URL} target="_blank" rel="noreferrer noopener">
                  ↗
                </a>
              </div>
            </header>
            <div className="x-split-frame">
              <ScramjetFrame url={TEMP_MAIL_URL} />
            </div>
          </section>
        </div>
      )}

      {tab === "xbox" && (
        <div className="x-body">
          <section
            className="x-hero"
            style={{ backgroundImage: `linear-gradient(120deg, ${selected.accent}55, #05070a 60%)` }}
          >
            <div className="x-hero-copy">
              <span className="x-eyebrow">Seleccionado</span>
              <h2>{selected.name}</h2>
              <div className="x-tags">
                {selected.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <div className="x-hero-actions">
                <button
                  type="button"
                  className="x-btn primary big"
                  onClick={() => openGame(cloudGameUrl(selected.name), selected.name)}
                >
                  ▶ Jugar en la nube
                </button>
              </div>
            </div>
            <div
              className="x-hero-art"
              style={{ background: `radial-gradient(90% 90% at 70% 30%, ${selected.accent}, #06090d 75%)` }}
            >
              <span>{selected.name.slice(0, 2).toUpperCase()}</span>
            </div>
          </section>

          <div className="x-rowhead">
            <h3>Catálogo cloud</h3>
            <span>{filtered.length} juegos · acceso directo por juego</span>
          </div>

          <div className="x-grid">
            {filtered.map((game) => (
              <button
                key={game.name}
                type="button"
                className={`x-tile${selected.name === game.name ? " on" : ""}`}
                onClick={() => {
                  setSelected(game);
                  onToast(game.name, "Pulsa «Jugar en la nube» para abrirlo por el proxy.");
                }}
                onDoubleClick={() => openGame(cloudGameUrl(game.name), game.name)}
              >
                <span
                  className="x-tile-art"
                  style={{ background: `radial-gradient(80% 80% at 70% 20%, ${game.accent}, #070a0d 78%)` }}
                >
                  {game.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="x-tile-name">{game.name}</span>
                <span className="x-tile-tag">{game.tags[0]}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="d-empty">Ningún juego coincide con «{query}».</p>}
          </div>
        </div>
      )}

      {tab === "platforms" && (
        <div className="x-body">
          <div className="x-rowhead">
            <h3>Cloud gaming gratis y legal</h3>
            <span>{CLOUD_PLATFORMS.length} plataformas · cada una abre su servicio oficial por el proxy</span>
          </div>
          <div className="x-platforms">
            {CLOUD_PLATFORMS.map((platform) => (
              <article key={platform.id} className="x-platform">
                <div className="x-platform-head">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={platform.icon} alt={platform.name} />
                  <div>
                    <strong>{platform.name}</strong>
                    <small>{platform.sub}</small>
                  </div>
                  <span className={`x-free${platform.free ? "" : " paid"}`}>{platform.free ? "Gratis" : "De pago"}</span>
                </div>
                <p>{platform.note}</p>
                <div className="x-platform-actions">
                  <button type="button" className="x-btn primary" onClick={() => openGame(platform.url, platform.name)}>
                    <IconShield /> Abrir
                  </button>
                </div>
              </article>
            ))}
          </div>
          <p className="x-note">
            Solo servicios oficiales: los planes gratuitos tienen límites de sesión y catálogo; algunos juegos requieren
            suscripción. No se incluye ningún servicio pirata.
          </p>
        </div>
      )}

      <footer className="x-foot">
        <button type="button" className="x-btn" onClick={() => onOpenProxy(RACCOON)}>
          <IconRefresh /> Recargar Raccoon
        </button>
        <span>{CLOUD_GAMES.length} juegos directos · {CLOUD_PLATFORMS.length} plataformas</span>
      </footer>
    </div>
  );
}
