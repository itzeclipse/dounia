import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Logo oficial de WolfUnblock.
 *
 * El sitio es un Google Site: su logo real vive detrás de un hash de
 * sitesv-images-rt. Lo leemos de la propia página (icon + og:image), lo
 * cacheamos en memoria y lo servimos desde nuestro dominio para que la app
 * nunca dependa de que el hash siga siendo público en el navegador.
 * Si el sitio no responde, redirigimos al Wolf local de siempre.
 */
const CACHE_TTL = 12 * 60 * 60 * 1000;

let cache: { at: number; type: string; body: ArrayBuffer } | null = null;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

function pick(html: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  if (cache && Date.now() - cache.at < CACHE_TTL) {
    return new Response(cache.body, {
      headers: {
        "content-type": cache.type,
        "cache-control": "public, max-age=86400, s-maxage=604800",
      },
    });
  }

  try {
    const page = await fetch("https://sites.google.com/view/wolfunblock/home", {
      signal: AbortSignal.timeout(15_000),
      headers: { "user-agent": UA },
    });
    if (!page.ok) throw new Error(`wolfunblock ${page.status}`);
    const html = await page.text();

    const target =
      pick(html, [
        /<link[^>]+rel="icon"[^>]+href="([^"]+)"/i,
        /<link[^>]+href="([^"]+)"[^>]+rel="icon"/i,
        /property="og:image"\s+content="([^"]+)"/i,
      ]) ?? "/os/icons/wolf.svg";

    if (target.startsWith("/")) return Response.redirect(new URL(target, request.url), 302);

    const image = await fetch(target, { signal: AbortSignal.timeout(15_000), headers: { "user-agent": UA } });
    if (!image.ok) throw new Error(`logo ${image.status}`);
    const type = image.headers.get("content-type") ?? "image/png";
    const body = await image.arrayBuffer();
    if (body.byteLength === 0) throw new Error("logo vacío");

    cache = { at: Date.now(), type, body };
    return new Response(body, {
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch {
    return Response.redirect(new URL("/os/icons/wolf.svg", request.url), 302);
  }
}
