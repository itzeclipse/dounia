import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface AstraGame {
  id: string;
  title: string;
  url: string;
  thumb: string;
  categories: string[];
}

const PS5_RAW =
  "https://raw.githubusercontent.com/cineosweb/cineosweb.github.io/main/script/Apps/Ps5/index.html";
const ZONES =
  "https://cdn.jsdelivr.net/gh/bestsabplayerox/assets@main/zones.json";
const NOAH_COVER = "https://cdn.jsdelivr.net/gh/NoahsAmazingTutoringHelp/Noahs-Calculus-Tutor";
const HTML_ROOT = "https://cdn.jsdelivr.net/gh/bestsabplayerox/html@master";
const COVER_ROOT = "https://cdn.jsdelivr.net/gh/bestsabplayerox/covers@main";

const CACHE_TTL = 30 * 60 * 1000;
let cache: { at: number; games: AstraGame[] } | null = null;

/** Extract the hardcoded `NOAH_GAMES = [ ... ];` array from the PS5 launcher. */
function extractNoahGames(html: string): AstraGame[] {
  const start = html.indexOf("const NOAH_GAMES = [");
  if (start === -1) return [];
  const open = html.indexOf("[", start);
  const close = html.indexOf("];", open);
  if (open === -1 || close === -1) return [];

  const body = html.slice(open + 1, close);
  const out: AstraGame[] = [];
  // Every entry is a one-line object literal: { title: "...", url: "...", image: "..." }
  const objectRe = /\{\s*title:\s*"([^"]*)",\s*url:\s*"([^"]*)",\s*image:\s*"([^"]*)"\s*\}/g;
  let match: RegExpExecArray | null;
  while ((match = objectRe.exec(body)) !== null) {
    const title = match[1].trim();
    const url = match[2].trim();
    const thumb = match[3].trim();
    if (!title || !url) continue;
    out.push({
      id: `noah-${out.length}-${slug(title)}`,
      title,
      url,
      thumb,
      categories: ["CineOS"],
    });
  }
  return out;
}

interface ZoneEntry {
  id?: number;
  name?: string;
  cover?: string;
  url?: string;
  author?: string;
}

function extractZoneGames(raw: string): AstraGame[] {
  let zones: ZoneEntry[];
  try {
    zones = JSON.parse(raw) as ZoneEntry[];
  } catch {
    return [];
  }
  const out: AstraGame[] = [];
  for (const zone of zones) {
    const name = (zone.name ?? "").trim();
    let url = zone.url ?? "";
    let thumb = zone.cover ?? "";
    if (!name || !url) continue;
    // The first entry is a Discord "suggest games" link, not a game.
    if (/discord|suggest/i.test(name) || /discord\.gg/i.test(url)) continue;
    url = url.replace("{HTML_URL}", HTML_ROOT).replace("{COVER_URL}", COVER_ROOT);
    thumb = thumb.replace("{HTML_URL}", HTML_ROOT).replace("{COVER_URL}", COVER_ROOT);
    const categories = zone.author ? [zone.author] : ["CineOS"];
    out.push({
      id: `zone-${zone.id ?? out.length}`,
      title: name,
      url,
      thumb,
      categories: categories.slice(0, 3),
    });
  }
  return out;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export async function GET(_request: NextRequest) {
  if (cache && Date.now() - cache.at < CACHE_TTL) {
    return Response.json({ games: cache.games, source: "astra", cached: true });
  }

  const games: AstraGame[] = [];
  const seen = new Set<string>();

  const push = (list: AstraGame[]) => {
    for (const game of list) {
      const key = `${game.title.toLowerCase()}::${game.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      games.push(game);
    }
  };

  try {
    const ps5 = await fetch(PS5_RAW, {
      signal: AbortSignal.timeout(18_000),
      headers: { accept: "text/plain", "user-agent": "DouniaOS/3.0 (CineOS games)" },
      next: { revalidate: 1800 },
    });
    if (ps5.ok) push(extractNoahGames(await ps5.text()));
  } catch {
    /* keep going with zones only */
  }

  try {
    const zones = await fetch(ZONES, {
      signal: AbortSignal.timeout(18_000),
      headers: { accept: "application/json", "user-agent": "DouniaOS/3.0 (CineOS games)" },
      next: { revalidate: 1800 },
    });
    if (zones.ok) push(extractZoneGames(await zones.text()));
  } catch {
    /* ignored */
  }

  if (games.length === 0) {
    return Response.json(
      { games: [], error: "No se pudo descargar el catálogo de CineOS/Astra." },
      { status: 502 },
    );
  }

  // Fix a handful of noahs repo images that use the master/images vs images path.
  for (const game of games) {
    if (game.thumb.includes("/master/images/")) {
      game.thumb = game.thumb.replace("/master/images/", "/images/");
    }
    if (game.thumb.startsWith(NOAH_COVER + "/images/")) {
      // already canonical
    }
  }

  cache = { at: Date.now(), games };
  return Response.json({ games, source: "astra" });
}
