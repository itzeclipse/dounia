import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy de imágenes y vídeos de los visores sociales.
 * Solo sirve medios de los CDN oficiales (hosts en lista blanca), reenvía
 * Range para que los MP4 se puedan reproducir y busca sin descargarlos enteros.
 */
const ALLOWED = [
  /(^|\.)cdninstagram\.com$/i,
  /(^|\.)fbcdn\.net$/i,
  /(^|\.)pbs\.twimg\.com$/i,
  /(^|\.)video\.twimg\.com$/i,
  /(^|\.)abs\.twimg\.com$/i,
  /(^|\.)tiktokcdn\.com$/i,
  /(^|\.)tiktokcdn-us\.com$/i,
  /(^|\.)tiktokcdn-eu\.com$/i,
  /(^|\.)tiktokv\.com$/i,
  /(^|\.)ibytedtos\.com$/i,
  /(^|\.)tiktokcdn\.net$/i,
];

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("u");
  if (!raw) return new Response("Falta el medio", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return new Response("URL no válida", { status: 400 });
  }

  if (!/^https?:$/.test(target.protocol) || !ALLOWED.some((rule) => rule.test(target.hostname))) {
    return new Response("Host de medios no permitido", { status: 403 });
  }

  const headers: Record<string, string> = {
    "user-agent": UA,
    accept: "image/avif,image/webp,image/png,image/jpeg,video/mp4,video/*,*/*;q=0.8",
    referer: target.origin + "/",
  };
  const range = request.headers.get("range");
  if (range) headers.range = range;

  try {
    let upstream: Response;
    try {
      upstream = await fetch(target.toString(), {
        headers,
        signal: AbortSignal.timeout(45_000),
        cache: "no-store",
      });
    } catch {
      upstream = await fetch(target.toString(), {
        headers,
        signal: AbortSignal.timeout(45_000),
        cache: "no-store",
      });
    }

    const type = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok && upstream.status !== 206) {
      return new Response("Medio no disponible", { status: 502 });
    }
    if (!/^(image|video)\//i.test(type) && type !== "application/octet-stream") {
      return new Response("El recurso no es una imagen o vídeo", { status: 415 });
    }

    const out = new Headers();
    for (const key of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
      const value = upstream.headers.get(key);
      if (value) out.set(key, value);
    }
    out.set("accept-ranges", "bytes");
    out.set("cache-control", "public, max-age=21600, s-maxage=86400, stale-while-revalidate=21600");
    out.set("cross-origin-resource-policy", "cross-origin");

    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch {
    return new Response("No se pudo cargar el medio", { status: 504 });
  }
}
