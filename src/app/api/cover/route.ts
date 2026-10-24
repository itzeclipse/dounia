import { NextRequest, NextResponse } from "next/server";
import { fetchUpstream } from "@/lib/os/curl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Carátula real de un juego, buscándolo en la tienda pública de Steam.
 *
 * Racoon Game no publica imágenes de su catálogo, pero casi todos sus juegos
 * están en Steam. Se pide el `id` a su buscador público y con él se prueban las
 * carátulas oficiales en orden de calidad:
 *
 *   1. library_600x900.jpg  → portada vertical, perfecta para un icono
 *   2. header.jpg           → 460x215
 *   3. tiny_image           → cápsula pequeña que devuelve el buscador
 *
 * Si el juego no está en Steam, se redirige al icono generado de /api/icon con
 * un `Location` relativo (un redirect absoluto apuntaría a 0.0.0.0 dentro del
 * contenedor y el navegador no podría cargar nada).
 */

interface SteamHit {
  id: number | null;
  tiny: string | null;
}

interface CoverCacheEntry {
  at: number;
  hit: SteamHit;
}

const coverCache = new Map<string, CoverCacheEntry>();
const DAY = 24 * 60 * 60 * 1000;

function candidatesFor(hit: SteamHit): string[] {
  const urls: string[] = [];
  if (hit.id) {
    urls.push(
      `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${hit.id}/library_600x900.jpg`,
    );
    urls.push(`https://cdn.cloudflare.steamstatic.com/steam/apps/${hit.id}/header.jpg`);
  }
  if (hit.tiny) urls.push(hit.tiny);
  return urls;
}

async function searchSteam(query: string): Promise<SteamHit> {
  const key = query.toLowerCase();
  const cached = coverCache.get(key);
  if (cached && Date.now() - cached.at < DAY) return cached.hit;

  try {
    const response = await fetchUpstream(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
        query,
      )}&l=spanish&cc=ES`,
      6_000,
    );
    const text = new TextDecoder().decode(response.body);
    const data = JSON.parse(text) as {
      items?: Array<{ id?: number; tiny_image?: string }>;
    };
    const item = data.items?.[0];
    const hit: SteamHit = { id: item?.id ?? null, tiny: item?.tiny_image ?? null };
    coverCache.set(key, { at: Date.now(), hit });
    return hit;
  } catch {
    const empty: SteamHit = { id: null, tiny: null };
    coverCache.set(key, { at: Date.now(), hit: empty });
    return empty;
  }
}

/** Redirección relativa al generador de iconos (nunca al host interno). */
function redirectToIcon(query: string, color: string): NextResponse {
  const params = new URLSearchParams({ n: query, c: color });
  return new NextResponse(null, {
    status: 307,
    headers: { location: `/api/icon?${params.toString()}`, "cache-control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");
  const color = request.nextUrl.searchParams.get("c") ?? "#7c3aed";

  if (!query) return redirectToIcon("Juego", color);

  const hit = await searchSteam(query);
  for (const url of candidatesFor(hit)) {
    try {
      const image = await fetchUpstream(url, 8_000);
      const type = image.headers.get("content-type") ?? "";
      if (image.ok && image.body.byteLength > 1_200 && (type.startsWith("image/") || !type)) {
        return new NextResponse(image.body, {
          headers: {
            "content-type": type.startsWith("image/") ? type : "image/jpeg",
            "cache-control": "public, max-age=604800, immutable",
          },
        });
      }
    } catch {
      /* siguiente candidata */
    }
  }

  return redirectToIcon(query, color);
}
