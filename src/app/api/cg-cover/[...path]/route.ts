import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy de las carátulas de CrazyGames.
 *
 * Solo sirve imágenes del CDN oficial (host fijo, sin rutas arbitrarias): así
 * las tarjetas de los modos consola siguen viéndose aunque el dominio de
 * CrazyGames esté bloqueado en la red del usuario.
 */
const HOST = "https://imgs.crazygames.com/";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

export async function GET(_request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const asset = path.join("/");

  if (!asset || asset.includes("..") || asset.startsWith("/")) {
    return new Response("Carátula no válida", { status: 404 });
  }

  try {
    const upstream = await fetch(HOST + asset, {
      headers: { "user-agent": UA, accept: "image/avif,image/webp,image/png,image/*,*/*;q=0.8" },
      signal: AbortSignal.timeout(20_000),
    });

    const type = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || !type.startsWith("image/")) {
      return new Response("Carátula no disponible", { status: 404 });
    }

    return new Response(upstream.body, {
      headers: {
        "content-type": type,
        "cache-control": "public, max-age=604800, s-maxage=2592000, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("Carátula no disponible", { status: 504 });
  }
}
