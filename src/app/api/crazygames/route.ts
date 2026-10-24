import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Catálogo real de CrazyGames para los modos consola.
 *
 * CrazyGames no publica un endpoint de catálogo, así que leemos sus páginas de
 * categoría (que traen 60 juegos cada una en el JSON de Next.js) y la página de
 * novedades. Se deduplica por slug, se ordena por popularidad y se cachea dos
 * horas en memoria. El juego se abre en su embed oficial dentro del sistema.
 */
const CATEGORIES = [
  "action",
  "adventure",
  "arcade",
  "board",
  "card",
  "clicker",
  "driving",
  "io",
  "puzzle",
  "shooting",
  "sim",
  "sports",
  "strategy",
  "trivia",
  "word",
];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const CACHE_TTL = 2 * 60 * 60 * 1000;
const MAX_GAMES = 720;

interface CrazyItem {
  id?: string;
  name?: string;
  slug?: string;
  cover?: string;
  categoryName?: string;
  totalPlays?: number;
  totalLikes?: number;
}

export interface ConsoleGame {
  id: string;
  title: string;
  url: string;
  thumb: string;
  categories: string[];
  plays: number;
}

let cache: { at: number; games: ConsoleGame[] } | null = null;

async function readGames(path: string): Promise<CrazyItem[]> {
  try {
    const response = await fetch(`https://www.crazygames.com${path}`, {
      headers: {
        "user-agent": UA,
        "accept-language": "en-US,en;q=0.9",
        accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!response.ok) return [];
    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return [];
    const data = JSON.parse(match[1]) as {
      props?: { pageProps?: { games?: { items?: CrazyItem[] } } };
    };
    const items = data.props?.pageProps?.games?.items;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function toGame(item: CrazyItem): ConsoleGame | null {
  if (!item.slug || !item.name) return null;
  return {
    id: item.slug,
    title: item.name,
    url: `https://www.crazygames.com/embed/${item.slug}`,
    // El CDN de carátulas pasa por nuestro proxy para que un filtro escolar
    // contra crazygames.com no deje todas las tarjetas en blanco.
    thumb: item.cover ? `/api/cg-cover/${item.cover.replace(/^\/+/, "")}` : "",
    categories: [item.categoryName ?? "CrazyGames"],
    plays: Number(item.totalPlays ?? 0),
  };
}

export async function GET(_request: NextRequest) {
  if (cache && Date.now() - cache.at < CACHE_TTL) {
    return Response.json({ games: cache.games, total: cache.games.length, cached: true });
  }

  const lists = await Promise.all([readGames("/new"), ...CATEGORIES.map((category) => readGames(`/c/${category}`))]);

  const unique = new Map<string, ConsoleGame>();
  for (const list of lists) {
    for (const item of list) {
      const game = toGame(item);
      if (!game || unique.has(game.id)) continue;
      unique.set(game.id, game);
    }
  }

  const games = Array.from(unique.values())
    .sort((a, b) => b.plays - a.plays)
    .slice(0, MAX_GAMES);

  if (games.length === 0) {
    return Response.json(
      { games: [], total: 0, error: "CrazyGames no ha devuelto el catálogo." },
      { status: 502 },
    );
  }

  cache = { at: Date.now(), games };
  return Response.json({ games, total: games.length, cached: false });
}
