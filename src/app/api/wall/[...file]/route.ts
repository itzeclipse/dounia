import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy de los fondos originales de CineOS.
 *
 * Esos vídeos/imágenes viven en jsDelivr y raw.githubusercontent.com: en redes
 * escolares y filtros DNS esos dominios suelen estar bloqueados, así que la
 * mitad de la biblioteca se quedaba en negro. Todo pasa ahora por nuestro
 * dominio, con Range reenviado para que el vídeo pueda buscar y reproducirse.
 *
 * Solo se sirven los archivos de la lista blanca: no es un proxy abierto.
 */
const VIDEOS = [
  "green.mp4",
  "Hunt.mp4",
  "33A56.mp4",
  "45E33.mp4",
  "99Med.mp4",
  "BlackHole.mp4",
  "Brother.mp4",
  "CozyFox.mp4",
  "Desktop.mp4",
  "F-1.mp4",
  "Gojo.mp4",
  "Gojo-Sukuna.mp4",
  "Minecraft01.mp4",
  "Minecraft02.mp4",
  "Minecraft03.mp4",
  "Monkey.mp4",
  "RainyCity.mp4",
  "Skello.MP4",
  "SnowFox.mp4",
  "Yuji52.mp4",
  "Yuta.mp4",
  "sukuna-fire.mp4",
  "92Med.MOV",
  "default.mp4",
] as const;

const STILLS = [
  "55Cine.PNG",
  "Supra.PNG",
  "Monday.png",
  "Tuesday.png",
  "Wednesday.png",
  "Thursday.png",
  "Friday.png",
  "Saturday.png",
  "Sunday.png",
] as const;

const ALLOWED = new Set<string>([...VIDEOS, ...STILLS]);

const CDN = "https://cdn.jsdelivr.net/gh/nathanpikelny6-oss/CineOS@main/Videos/";
const RAW = "https://raw.githubusercontent.com/nathanpikelny6-oss/CineOS/main/Videos/";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

/** default.mp4 pesa 22 MB: jsDelivr lo rechaza, así que se sirve desde raw. */
function baseFor(name: string) {
  return name === "default.mp4" ? RAW : CDN;
}

export async function GET(request: NextRequest, context: { params: Promise<{ file: string[] }> }) {
  const { file } = await context.params;
  const name = file.join("/");

  if (!ALLOWED.has(name)) {
    return new Response("Fondo no permitido", { status: 404 });
  }

  const range = request.headers.get("range");
  const headers: Record<string, string> = { "user-agent": UA, accept: "*/*" };
  if (range) headers.range = range;

  try {
    const upstream = await fetch(baseFor(name) + encodeURIComponent(name), {
      headers,
      signal: AbortSignal.timeout(60_000),
      cache: "no-store",
    });

    if (!upstream.ok && upstream.status !== 206) {
      return new Response("El fondo no está disponible ahora mismo", { status: 502 });
    }

    const out = new Headers();
    for (const key of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
      const value = upstream.headers.get(key);
      if (value) out.set(key, value);
    }
    // raw.githubusercontent sirve los MP4 como octet-stream y algunos
    // navegadores se niegan a reproducirlos así.
    const type = out.get("content-type");
    if (!type || type === "application/octet-stream") {
      if (/\.mp4$/i.test(name)) out.set("content-type", "video/mp4");
      else if (/\.mov$/i.test(name)) out.set("content-type", "video/quicktime");
      else if (/\.png$/i.test(name)) out.set("content-type", "image/png");
    }

    // Los vídeos grandes necesitan saber que se puede pedir por tramos.
    out.set("accept-ranges", "bytes");
    out.set("cache-control", "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400");

    return new Response(upstream.body, { status: upstream.status, headers: out });
  } catch {
    return new Response("No se pudo cargar el fondo", { status: 504 });
  }
}
