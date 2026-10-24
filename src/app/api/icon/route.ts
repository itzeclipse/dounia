import { NextRequest, NextResponse } from "next/server";
import { fetchUpstream } from "@/lib/os/curl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Iconos de todas las apps del sistema.
 *
 * Muchas apps se quedaban sin logo porque el favicon remoto fallaba (bloqueos,
 * 404, dominios caídos). Esta ruta lo resuelve de forma definitiva:
 *
 *   1. intenta el logo real (Google s2 → DuckDuckGo → /favicon.ico del dominio)
 *      usando libcurl, el mismo motor que el resto del proxy;
 *   2. cachea la respuesta una semana;
 *   3. si nada funciona, genera un icono SVG con las iniciales y el color de la
 *      app, así NUNCA queda un hueco vacío.
 */

function initials(text: string): string {
  const clean = text.replace(/[^\p{L}\p{N} ]/gu, " ").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char] ?? char),
  );
}

function generatedIcon(label: string, color: string): NextResponse {
  const text = escapeXml(initials(label));
  const safeColor = /^#?[0-9a-f]{3,8}$/i.test(color.replace("#", "")) ? color : "#a855f7";
  const tint = safeColor.startsWith("#") ? safeColor : `#${safeColor}`;

  // Dos líneas del título: así las portadas de Racoon parecen carátulas.
  const words = label.replace(/\s+/g, " ").trim().split(" ");
  const line1 = escapeXml(words.slice(0, 2).join(" ").slice(0, 16)).toUpperCase();
  const line2 = escapeXml(words.slice(2, 5).join(" ").slice(0, 18)).toUpperCase();

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${tint}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="#0b0b12"/>
    </linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity="0.55"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="28" fill="url(#g)"/>
  <rect width="128" height="128" rx="28" fill="url(#fade)"/>
  <rect x="0.5" y="0.5" width="127" height="127" rx="27.5" fill="none" stroke="${tint}" stroke-opacity="0.5"/>
  <g font-family="Verdana, DejaVu Sans, sans-serif" font-weight="700" fill="#ffffff" text-anchor="middle">
    <text x="64" y="52" font-size="17" opacity="0.96">${line1 || text}</text>
    <text x="64" y="74" font-size="13" opacity="0.82">${line2}</text>
  </g>
  <text x="64" y="104" text-anchor="middle" font-family="Verdana, sans-serif" font-size="11"
        font-weight="700" letter-spacing="2" fill="${tint}" opacity="0.9">RACOON</text>
</svg>`;

  return new NextResponse(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=604800, immutable",
    },
  });
}

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("d");
  const slug = request.nextUrl.searchParams.get("s");
  const color = request.nextUrl.searchParams.get("c") ?? "#a855f7";
  const label = request.nextUrl.searchParams.get("n") ?? domain ?? slug ?? "?";

  const candidates: string[] = [];

  if (slug) {
    candidates.push(`https://cdn.simpleicons.org/${encodeURIComponent(slug)}/${color.replace("#", "")}`);
  }
  if (domain) {
    const host = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    candidates.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`);
    candidates.push(`https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`);
    candidates.push(`https://${host}/favicon.ico`);
  }

  for (const url of candidates) {
    try {
      const upstream = await fetchUpstream(url, 5_000);
      const type = upstream.headers.get("content-type") ?? "";
      const bytes = upstream.body.byteLength;
      if (upstream.ok && bytes > 120 && (type.startsWith("image/") || bytes > 400)) {
        return new NextResponse(upstream.body, {
          headers: {
            "content-type": type.startsWith("image/") ? type : "image/png",
            "cache-control": "public, max-age=604800, immutable",
          },
        });
      }
    } catch {
      /* probamos el siguiente origen */
    }
  }

  return generatedIcon(label, color);
}
