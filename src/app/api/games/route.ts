import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RawGame {
  Md5?: string;
  Title?: string;
  Url?: string;
  Asset?: string[];
  Category?: string[];
  Description?: string;
}

export interface CatalogGame {
  id: string;
  title: string;
  url: string;
  thumb: string;
  categories: string[];
}

const CACHE_TTL = 10 * 60 * 1000;
const cache = new Map<string, { at: number; games: CatalogGame[] }>();

const ENDPOINT = "https://catalog.api.gamedistribution.com/api/v2.0/rss/All/";

export async function GET(request: NextRequest) {
  const page = Math.max(1, Math.min(Number(request.nextUrl.searchParams.get("page") ?? 1) || 1, 60));
  const amount = Math.max(12, Math.min(Number(request.nextUrl.searchParams.get("amount") ?? 60) || 60, 100));
  const key = `${page}:${amount}`;

  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return Response.json({ page, amount, games: cached.games, totalPages: 40, cached: true });
  }

  const url = `${ENDPOINT}?collection=All&categories=All&amount=${amount}&page=${page}&format=json`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(18_000),
      headers: { accept: "application/json", "user-agent": "DouniaOS/3.0 (+html5 games catalogue)" },
      next: { revalidate: 600 },
    });
    if (!response.ok) throw new Error(`catalog ${response.status}`);
    const raw = (await response.json()) as RawGame[];
    const games: CatalogGame[] = raw
      .filter((game) => game.Md5 && game.Title && game.Url)
      .map((game) => ({
        id: game.Md5 as string,
        title: game.Title as string,
        url: (game.Url as string).replace(/^http:/, "https:"),
        thumb: game.Asset?.[0] ?? `https://img.gamedistribution.com/${game.Md5}-512x512.jpg`,
        categories: Array.isArray(game.Category) ? game.Category.slice(0, 3) : [],
      }));

    cache.set(key, { at: Date.now(), games });
    return Response.json({ page, amount, games, totalPages: 40 });
  } catch (error) {
    return Response.json(
      {
        page,
        games: [],
        error: error instanceof Error ? error.message : "No se pudo cargar el catálogo de juegos.",
      },
      { status: 502 },
    );
  }
}
