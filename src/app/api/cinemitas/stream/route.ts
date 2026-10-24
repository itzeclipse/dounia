import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resuelve el HLS real de un embed de Vidara.
 *
 * El player de Cinemitas incrusta un iframe con anuncios y su propio reproductor.
 * Vidara expone /api/stream, que devuelve un master.m3u8 firmado para la IP del
 * servidor. Lo proxificamos para reproducirlo en un <video> nativo, sin iframe
 * ni anuncios, y con la misma calidad.
 */
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map<string, { at: number; data: { url: string; poster: string; title: string } }>();

function vidaraCode(embed: string): string | null {
  try {
    const url = new URL(embed);
    if (!/(^|\.)vidara\.so$/i.test(url.hostname)) return null;
    return url.pathname.match(/^\/e\/([A-Za-z0-9]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const embed = request.nextUrl.searchParams.get("embed") ?? "";
  const code = vidaraCode(embed);
  if (!code) {
    return Response.json({ error: "Embed no compatible." }, { status: 400 });
  }

  const cached = cache.get(code);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return Response.json({ ...cached.data, cached: true });
  }

  try {
    const response = await fetch("https://vidara.so/api/stream", {
      method: "POST",
      headers: {
        "user-agent": UA,
        "content-type": "application/json",
        referer: embed,
        origin: "https://vidara.so",
      },
      body: JSON.stringify({ filecode: code, device: "web", codecs: [] }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Vidara devolvió ${response.status}.`);
    const data = (await response.json()) as {
      streaming_url?: string;
      thumbnail?: string;
      title?: string;
    };
    if (!data.streaming_url) throw new Error("Vidara no devolvió un stream.");

    const payload = {
      url: `/api/cinemitas/hls?u=${encodeURIComponent(data.streaming_url)}`,
      poster: data.thumbnail ?? "",
      title: data.title ?? "",
    };
    if (cache.size > 80) cache.clear();
    cache.set(code, { at: Date.now(), data: payload });
    return Response.json({ ...payload, cached: false });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo abrir el stream." },
      { status: 502 },
    );
  }
}
