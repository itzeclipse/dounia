import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cartelera real de cinemitas.org.
 *
 * El sitio es WordPress y no expone sus películas/series por la REST API, así
 * que leemos las portadas de las listas paginadas y extraemos cada ficha:
 * título, año, nota, póster y enlace. Se cachea tres horas y las carátulas se
 * sirven por /api/cm-cover para que el modo cine no dependa del dominio.
 */
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const CACHE_TTL = 6 * 60 * 60 * 1000;
const MOVIE_PAGES = 8;
const SERIES_PAGES = 6;

export interface CinemaItem {
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

let cache: { at: number; items: CinemaItem[] } | null = null;

function decode(value: string): string {
  return value
    .replace(/&#0?39;/g, "'")
    .replace(/&#8217;/g, "’")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&hellip;/g, "…")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function proxied(url: string, large = false): string {
  const tmdb = url.match(/^https?:\/\/image\.tmdb\.org\/t\/p\/(.+)$/i);
  if (tmdb) {
    const path = large ? tmdb[1].replace(/^w\d+\//, "w780/") : tmdb[1];
    return `/api/cm-cover/tmdb/${path}`;
  }

  const path = url.replace(/^https?:\/\/cinemitas\.org\//i, "").replace(/^\/+/, "");
  const asset = large ? path.replace(/-\d+x\d+(\.\w+)$/i, "$1") : path;
  return `/api/cm-cover/${asset}`;
}

function parsePage(html: string, kind: "movie" | "series"): CinemaItem[] {
  const items: CinemaItem[] = [];
  const articles = html.match(/<article[^>]*class="item (?:movies|tvshows)"[\s\S]*?<\/article>/g) ?? [];

  for (const article of articles) {
    const image = article.match(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"/i);
    const link = article.match(/<h3><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h3>/i);
    if (!image || !link) continue;

    const url = link[1];
    const slug = url.replace(/\/+$/, "").split("/").pop() ?? link[2];
    const rating = Number(article.match(/<div class="rating">([^<]*)<\/div>/i)?.[1] ?? 0);
    const year = article.match(/<span>(\d{4})<\/span>/)?.[1] ?? "";

    items.push({
      id: `${kind}-${slug}`,
      title: decode(link[2]),
      url,
      poster: proxied(image[1]),
      backdrop: proxied(image[1], true),
      rating: Number.isFinite(rating) ? rating : 0,
      year,
      kind,
      featured: article.includes('class="featu"'),
    });
  }

  return items;
}

async function readPage(path: string, kind: "movie" | "series"): Promise<CinemaItem[]> {
  try {
    const response = await fetch(`https://cinemitas.org/${path}`, {
      headers: { "user-agent": UA, "accept-language": "es-ES,es;q=0.9,en;q=0.8" },
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!response.ok) return [];
    return parsePage(await response.text(), kind);
  } catch {
    return [];
  }
}

/** Peticiones en grupos para no disparar 18 conexiones al mismo WordPress. */
async function mapLimit<T, R>(values: T[], limit: number, run: (value: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let index = 0; index < values.length; index += limit) {
    const slice = values.slice(index, index + limit);
    out.push(...(await Promise.all(slice.map(run))));
  }
  return out;
}

async function crawl(): Promise<CinemaItem[]> {
  const requests: { path: string; kind: "movie" | "series" }[] = [];
  for (let page = 1; page <= MOVIE_PAGES; page += 1) {
    requests.push({ path: page === 1 ? "movies/" : `movies/page/${page}/`, kind: "movie" });
  }
  for (let page = 1; page <= SERIES_PAGES; page += 1) {
    requests.push({ path: page === 1 ? "tvshows/" : `tvshows/page/${page}/`, kind: "series" });
  }

  // Una sola oleada: 14 portadas en paralelo tardan mucho menos que 3 tandas.
  const pages = await mapLimit(requests, 14, ({ path, kind }) => readPage(path, kind));

  const unique = new Map<string, CinemaItem>();
  for (const list of pages) {
    for (const item of list) {
      if (!unique.has(item.id)) unique.set(item.id, item);
    }
  }

  return Array.from(unique.values());
}

let inflight: Promise<CinemaItem[]> | null = null;
let refreshing: Promise<void> | null = null;

export async function GET(_request: NextRequest) {
  if (cache) {
    const stale = Date.now() - cache.at >= CACHE_TTL;
    if (stale && !refreshing) {
      // Sirve la cartelera anterior al instante y actualiza por detrás.
      refreshing = crawl()
        .then((items) => {
          if (items.length > 0) cache = { at: Date.now(), items };
        })
        .catch(() => {})
        .finally(() => {
          refreshing = null;
        });
    }
    return Response.json({ items: cache.items, total: cache.items.length, cached: true, stale });
  }

  if (!inflight) {
    inflight = crawl().finally(() => {
      inflight = null;
    });
  }
  const items = await inflight;

  if (items.length === 0) {
    return Response.json(
      { items: [], total: 0, error: "Cinemitas no ha devuelto la cartelera." },
      { status: 502 },
    );
  }

  cache = { at: Date.now(), items };
  return Response.json({ items, total: items.length, cached: false });
}
