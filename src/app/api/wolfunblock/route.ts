import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface WolfItem {
  name: string;
  url: string;
  section: string;
}

export interface WolfSection {
  id: string;
  label: string;
  items: WolfItem[];
}

const LABELS: Record<string, string> = {
  home: "Inicio",
  "unblocker-archive": "Archivo de unblockers",
  "website-unblockers": "Unblockers de webs",
  "youtube-unblockers": "Unblockers de YouTube",
  games: "Juegos",
  other: "Otros",
  "wolfunblock-chat": "Chat",
  exploits: "Exploits",
  proxies: "Proxies",
};

const SECTION_ORDER = [
  "home",
  "unblocker-archive",
  "website-unblockers",
  "youtube-unblockers",
  "games",
  "exploits",
  "other",
  "proxies",
  "wolfunblock-chat",
];

const CACHE_TTL = 60 * 60 * 1000;
let cache: { at: number; sections: WolfSection[] } | null = null;

function decode(value: string): string {
  return value
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .trim();
}

/**
 * Reads the live Google Site navigation and turns every WolfUnblock page into a
 * categorised entry. Cached for an hour; the UI falls back to the static list
 * if the site cannot be reached.
 */
export async function GET(_request: NextRequest) {
  if (cache && Date.now() - cache.at < CACHE_TTL) {
    return Response.json({ sections: cache.sections, cached: true });
  }

  try {
    const response = await fetch("https://sites.google.com/view/wolfunblock/home", {
      signal: AbortSignal.timeout(15_000),
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      },
    });
    if (!response.ok) throw new Error(`wolfunblock ${response.status}`);
    const html = await response.text();

    const seen = new Set<string>();
    const items: WolfItem[] = [];
    const anchor = /href="(\/view\/wolfunblock[^"]*)"[^>]*>([^<]*)<\/a>/g;
    let match: RegExpExecArray | null;

    while ((match = anchor.exec(html)) !== null) {
      const path = match[1];
      const name = decode(match[2]);
      if (!name || path === "/view/wolfunblock/home") continue;
      const segments = path.replace(/^\/view\/wolfunblock\/?/, "").split("/").filter(Boolean);
      if (segments.length === 0) continue;
      const section = segments[0];
      const url = `https://sites.google.com${path}`;
      if (seen.has(url)) continue;
      seen.add(url);
      items.push({ name, url, section });
    }

    const grouped = new Map<string, WolfItem[]>();
    for (const item of items) {
      const list = grouped.get(item.section) ?? [];
      list.push(item);
      grouped.set(item.section, list);
    }

    const sections: WolfSection[] = Array.from(grouped.entries())
      .map(([id, list]) => ({
        id,
        label: LABELS[id] ?? id.replace(/-/g, " "),
        items: list.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => {
        const ai = SECTION_ORDER.indexOf(a.id);
        const bi = SECTION_ORDER.indexOf(b.id);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });

    if (sections.length === 0) throw new Error("sin enlaces");
    cache = { at: Date.now(), sections };
    return Response.json({ sections, cached: false });
  } catch (error) {
    return Response.json(
      {
        sections: [],
        error: error instanceof Error ? error.message : "No se pudo leer WolfUnblock.",
      },
      { status: 502 },
    );
  }
}
