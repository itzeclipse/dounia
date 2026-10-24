import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy de pósters de cinemitas.org: solo /wp-content/uploads/, mismo host,
 * cache larga. Así el modo cine conserva sus carátulas aunque el dominio esté
 * filtrado en la red del usuario.
 */
const HOST = "https://cinemitas.org/";
const PREFIX = "wp-content/uploads/";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const CACHE_TTL = 24 * 60 * 60 * 1000;
const CACHE_MAX = 180;
const cache = new Map<string, { at: number; type: string; body: ArrayBuffer }>();

function remember(key: string, type: string, body: ArrayBuffer): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), type, body });
}

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;

  let target: string;

  if (path[0] === "tmdb") {
    /* Algunas fichas de Cinemitas usan pósters de TMDB. */
    const rest = path.slice(1).join("/");
    if (!/^(w\d+|h\d+|original)\//.test(rest) || rest.includes("..")) {
      return new Response("Póster no válido", { status: 404 });
    }
    target = `https://image.tmdb.org/t/p/${rest}`;
  } else {
    const asset = path.join("/");
    if (!asset.startsWith(PREFIX) || asset.includes("..")) {
      return new Response("Póster no válido", { status: 404 });
    }
    target = HOST + asset;
  }

  const cached = cache.get(target);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return new Response(cached.body, {
      headers: {
        "content-type": cached.type,
        "content-length": String(cached.body.byteLength),
        "cache-control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=604800",
      },
    });
  }

  try {
    const upstream = await fetch(target, {
      headers: { "user-agent": UA, accept: "image/avif,image/webp,image/png,image/jpeg,*/*;q=0.8" },
      signal: AbortSignal.timeout(20_000),
    });

    const type = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !type.startsWith("image/")) {
      return new Response("Póster no disponible", { status: 404 });
    }

    const body = await upstream.arrayBuffer();
    remember(target, type, body);
    return new Response(body, {
      headers: {
        "content-type": type,
        "content-length": String(body.byteLength),
        "cache-control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Póster no disponible", { status: 504 });
  }
}
