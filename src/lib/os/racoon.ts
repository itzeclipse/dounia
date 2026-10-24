/**
 * Catálogo de Racoon Game extraído de su portada pública (raccoongame.com).
 *
 * Son los juegos que su web muestra sin iniciar sesión: "New & Trending",
 * "VIP Exclusive", "Popular", "Sports", "GTA" y "Limited-Time".
 * Su API de detalle requiere sesión, así que aquí solo se guarda lo que su
 * propia portada publica: título y nota.
 */

export interface RacoonGame {
  name: string;
  score?: string;
}

export interface RacoonSection {
  id: string;
  title: string;
  note: string;
  games: RacoonGame[];
}

export const RACOON_SECTIONS: RacoonSection[] = [
  {
    id: "trending",
    title: "New & Trending",
    note: "Lo último que ha entrado en Racoon",
    games: [
      { name: "Marvel's Spider-Man 2 - Digital Deluxe Edition", score: "9.5" },
      { name: "REANIMAL" },
      { name: "Heroes of Might and Magic: Olden Era" },
      { name: "Sengoku Dynasty" },
      { name: "Deer & Boy" },
      { name: "Warhammer 40,000: Mechanicus II" },
      { name: "TerraTech Legion" },
      { name: "Hell is Us" },
      { name: "Palworld", score: "9.0" },
      { name: "Elemental: Reforged" },
      { name: "Copa City" },
      { name: "Sledders" },
      { name: "FIFA 23", score: "8.9" },
      { name: "Alchemist: Journey of the Soul" },
      { name: "Nioh 3", score: "10.0" },
      { name: "LEGO® The Incredibles" },
      { name: "Dark Pals: The 1st Floor" },
      { name: "MechWarrior 5: Mercenaries" },
      { name: "Hot Rod Mayhem" },
      { name: "DARK SOULS™ III", score: "10.0" },
      { name: "DEATH STRANDING 2: ON THE BEACH" },
      { name: "Stellar Blade" },
      { name: "Urban Jungle" },
      { name: "PRAGMATA" },
      { name: "DRAGON BALL: Sparking! ZERO" },
    ],
  },
  {
    id: "vip",
    title: "VIP Exclusive",
    note: "Los pesos pesados de la plataforma",
    games: [
      { name: "Ghost of Tsushima", score: "9.3" },
      { name: "Forza Horizon 6", score: "10.0" },
      { name: "Resident Evil Requiem", score: "10.0" },
      { name: "Red Dead Redemption 2", score: "9.5" },
      { name: "Marvel's Spider-Man: Miles Morales" },
    ],
  },
  {
    id: "popular",
    title: "Popular Games",
    note: "Lo que más se juega ahora mismo",
    games: [
      { name: "Choo-Choo Charles", score: "9.9" },
      { name: "Subnautica Zero", score: "10.0" },
      { name: "God of War: Ragnarök", score: "9.7" },
      { name: "Hogwarts Legacy", score: "9.7" },
      { name: "Forza Horizon 5" },
    ],
  },
  {
    id: "sports",
    title: "Sports",
    note: "Deporte en la nube",
    games: [
      { name: "NBA 2K23", score: "8.9" },
      { name: "Forza Horizon 6", score: "10.0" },
      { name: "Cricket 26", score: "9.2" },
      { name: "Sim Racing Telemetry - F1 22", score: "10.0" },
      { name: "FIFA 23" },
    ],
  },
  {
    id: "gta",
    title: "GTA",
    note: "Toda la saga en Racoon",
    games: [
      { name: "Grand Theft Auto III", score: "10.0" },
      { name: "Grand Theft Auto V", score: "9.5" },
      { name: "Grand Theft Auto: San Andreas", score: "9.5" },
      { name: "Grand Theft Auto: Vice City", score: "9.5" },
      { name: "GTA V MOD version" },
    ],
  },
  {
    id: "limited",
    title: "Limited-Time",
    note: "Rotación limitada · aquí está Yandere Simulator",
    games: [
      { name: "Yandere Simulator" },
      { name: "Neon Abyss" },
      { name: "inZOI" },
      { name: "Ranch Simulator22" },
      { name: "The Past Room" },
      { name: "Five Hearts Under One Roof" },
      { name: "Cooking Simulator" },
      { name: "Slime Rancher" },
      { name: "Wobbly Life" },
      { name: "Builder Simulator" },
      { name: "Untitled Goose Game" },
      { name: "Minecraft: Dungeons" },
      { name: "Hollow Knight" },
      { name: "Brotato" },
      { name: "Super Bunny Man" },
      { name: "Hades" },
      { name: "Overcooked 2" },
      { name: "The Long Drive" },
      { name: "TCG Card Shop" },
      { name: "MiSide" },
      { name: "Poppy Playtime: Chapter 1" },
      { name: "Poppy Playtime: Chapter 2" },
      { name: "Poppy Playtime: Chapter 3" },
      { name: "Poppy Playtime: Chapter 4" },
    ],
  },
];

export const RACOON_URL = "https://www.raccoongame.com/";

/** Total de juegos publicados en la portada de Racoon que mostramos. */
export const RACOON_TOTAL = RACOON_SECTIONS.reduce(
  (total, section) => total + section.games.length,
  0,
);

/** Color estable por título: la misma portada siempre con el mismo tono. */
export function racoonTint(name: string): { from: string; to: string } {
  const palettes = [
    { from: "#7c3aed", to: "#22d3ee" },
    { from: "#e11d48", to: "#f59e0b" },
    { from: "#0ea5e9", to: "#6366f1" },
    { from: "#10b981", to: "#84cc16" },
    { from: "#f472b6", to: "#7c3aed" },
    { from: "#f97316", to: "#ef4444" },
    { from: "#14b8a6", to: "#0ea5e9" },
    { from: "#a855f7", to: "#ec4899" },
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return palettes[hash % palettes.length];
}

/** Iniciales para la portada generada. */
export function racoonInitials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "RG";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}
