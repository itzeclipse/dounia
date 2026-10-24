/**
 * Catálogo compartido de Raccoon Game.
 *
 * Lo usan la app "Raccoon Games" y la ventana "Racoon Cloud" para que las dos
 * muestren exactamente los mismos juegos, con su logo real de marca.
 *
 * `deepLink` queda vacío a propósito: raccoongame.com no publica URLs por juego
 * (su catálogo vive detrás de su SPA y de su app). En cuanto haya un patrón,
 * basta con rellenar esa propiedad y las fichas irán directas al juego.
 */

export interface RaccoonGame {
  name: string;
  /** Dominio oficial del juego: de ahí sale su logo real. */
  domain: string;
  accent: string;
  /** Etiqueta corta de género, para el buscador. */
  tag: string;
  /** URL exacta del juego en Raccoon Game, cuando se conozca el patrón. */
  deepLink?: string;
}

export const RACCOON_SITE = "https://www.raccoongame.com/";

/** Logo de marca del juego (servicio de favicons de Google, siempre resuelve). */
export const raccoonLogo = (domain: string) =>
  `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

export const RACCOON_GAMES: RaccoonGame[] = [
  { name: "Fortnite", domain: "fortnite.com", accent: "#7c3aed", tag: "Battle Royale" },
  { name: "Genshin Impact", domain: "genshin.hoyoverse.com", accent: "#38bdf8", tag: "RPG" },
  { name: "PUBG Mobile", domain: "pubgmobile.com", accent: "#f59e0b", tag: "Battle Royale" },
  { name: "Free Fire", domain: "ff.garena.com", accent: "#ef4444", tag: "Battle Royale" },
  { name: "Call of Duty", domain: "callofduty.com", accent: "#22c55e", tag: "FPS" },
  { name: "Minecraft", domain: "minecraft.net", accent: "#4ade80", tag: "Sandbox" },
  { name: "Roblox", domain: "roblox.com", accent: "#e11d48", tag: "Sandbox" },
  { name: "Valorant", domain: "playvalorant.com", accent: "#ff4655", tag: "FPS" },
  { name: "League of Legends", domain: "leagueoflegends.com", accent: "#c8aa6e", tag: "MOBA" },
  { name: "Dota 2", domain: "dota2.com", accent: "#dc2626", tag: "MOBA" },
  { name: "Counter-Strike 2", domain: "counter-strike.net", accent: "#a3e635", tag: "FPS" },
  { name: "Apex Legends", domain: "ea.com", accent: "#f97316", tag: "Battle Royale" },
  { name: "GTA V", domain: "rockstargames.com", accent: "#facc15", tag: "Mundo abierto" },
  { name: "EA SPORTS FC", domain: "ea.com", accent: "#22d3ee", tag: "Deportes" },
  { name: "Rocket League", domain: "rocketleague.com", accent: "#60a5fa", tag: "Deportes" },
  { name: "Clash Royale", domain: "supercell.com", accent: "#f472b6", tag: "Estrategia" },
];

/** Temp Mail en español, para los registros de Raccoon. */
export const TEMP_MAIL_URL = "https://temp-mail.org/es/";
