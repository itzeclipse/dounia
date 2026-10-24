import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxy HLS de Cinemitas: descarga el master/variantes y reescribe cada URI al
 * propio proxy, de modo que el <video> del navegador solo habla con DouniaOS.
 * Así el token de Vidara (firmado para la IP del servidor) sigue siendo válido.
 */
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const ALLOWED_HOSTS = [
  /\.97bf1\.com$/i,
  /(^|\.)vidara\.so$/i,
  /(^|\.)gasobni\.com$/i,
  /(^|\.)filemoon\.to$/i,
  /(^|\.)uqload\./i,
];

function allowed(url: URL): boolean {
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  return ALLOWED_HOSTS.some((pattern) => pattern.test(url.hostname));
}

function proxyUrl(absolute: string): string {
  return `/api/cinemitas/hls?u=${encodeURIComponent(absolute)}`;
}

function rewritePlaylist(text: string, base: URL): string {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
          try {
            return `URI="${proxyUrl(new URL(uri, base).toString())}"`;
          } catch {
            return _match;
          }
        });
      }
      try {
        return proxyUrl(new URL(trimmed, base).toString());
      } catch {
        return line;
      }
    })
    .join("\n");
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("u") ?? "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new Response("URL no válida", { status: 400 });
  }
  if (!allowed(url)) {
    return new Response("Host no permitido", { status: 403 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": UA,
        referer: "https://vidara.so/",
        accept: "*/*",
      },
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
      redirect: "follow",
    });
    if (!response.ok) {
      return new Response(`El CDN devolvió ${response.status}`, { status: 502 });
    }

    const contentType = response.headers.get("content-type") ?? "";
    const looksPlaylist =
      contentType.includes("mpegurl") || url.pathname.endsWith(".m3u8");

    if (looksPlaylist) {
      const text = await response.text();
      return new Response(rewritePlaylist(text, url), {
        headers: {
          "content-type": "application/vnd.apple.mpegurl; charset=utf-8",
          "cache-control": "no-store",
          "access-control-allow-origin": "*",
        },
      });
    }

    // Los segmentos llegan disfrazados de .woff; para el <video> son MPEG-TS.
    // Se reenvían en streaming para que el reproductor empiece antes.
    const isSegment = /font|woff/i.test(contentType) || /\.woff$/i.test(url.pathname);
    if (isSegment && response.body) {
      const headers: Record<string, string> = {
        "content-type": "video/mp2t",
        "cache-control": "public, max-age=3600",
        "access-control-allow-origin": "*",
      };
      const length = response.headers.get("content-length");
      if (length) headers["content-length"] = length;
      return new Response(response.body, { headers });
    }

    const buffer = await response.arrayBuffer();
    const head = new TextDecoder().decode(buffer.slice(0, 16)).trimStart();
    if (head.startsWith("#EXTM3U")) {
      const text = new TextDecoder().decode(buffer);
      return new Response(rewritePlaylist(text, url), {
        headers: {
          "content-type": "application/vnd.apple.mpegurl; charset=utf-8",
          "cache-control": "no-store",
          "access-control-allow-origin": "*",
        },
      });
    }

    return new Response(buffer, {
      headers: {
        "content-type": contentType || "application/octet-stream",
        "content-length": String(buffer.byteLength),
        "cache-control": "public, max-age=3600",
        "access-control-allow-origin": "*",
      },
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "No se pudo cargar el stream.",
      { status: 502 },
    );
  }
}
