import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Extrae los servidores de vídeo de una ficha de Cinemitas.
 *
 * La web completa (DooPlay + anuncios) es pesada y se atasca. Aquí leemos la
 * ficha, obtenemos su post ID y consultamos el AJAX oficial del tema para cada
 * servidor (filemoon, vidara, uqload…) y devolvemos solo los embeds limpios.
 * En series se devuelve además la lista de episodios para elegir capítulo.
 */
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const CACHE_TTL = 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: PlayerData }>();

interface Source {
  label: string;
  url: string;
}

interface Episode {
  title: string;
  url: string;
}

interface PlayerData {
  kind: "movie" | "series";
  title: string;
  episodes: Episode[];
  players: Source[];
  pageUrl: string;
  resolvedUrl: string;
}

function validUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    if (url.hostname !== "cinemitas.org") return null;
    if (!/^\/(movies|tvshows|episodes)\//.test(url.pathname)) return null;
    return url;
  } catch {
    return null;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": UA,
      "accept-language": "es-ES,es;q=0.9",
      accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`La ficha devolvió ${response.status}.`);
  return response.text();
}

function titleOf(html: string): string {
  const title = html.match(/<title>([^<]*)/)?.[1] ?? "";
  return title.replace(/\s*[-–|]\s*Cinemitas.*$/i, "").replace(/^Ver\s+|Online.*$/gi, "").trim();
}

function episodesOf(html: string): Episode[] {
  const seen = new Set<string>();
  const episodes: Episode[] = [];
  const re = /<a href='(https:\/\/cinemitas\.org\/episodes\/[^']+)'>([^<]+)<\/a>/g;
  for (const match of html.matchAll(re)) {
    if (seen.has(match[1])) continue;
    seen.add(match[1]);
    episodes.push({ title: match[2].trim(), url: match[1] });
  }
  return episodes;
}

function optionsOf(html: string): { nume: string; post: string; type: string; title: string }[] {
  const options: { nume: string; post: string; type: string; title: string }[] = [];
  const blocks = html.matchAll(/<li id='player-option-([^']+)'[\s\S]*?<\/li>/g);
  for (const block of blocks) {
    const raw = block[0];
    if (raw.includes("player-option-trailer")) continue;
    const nume = raw.match(/data-nume='([^']+)'/)?.[1];
    const post = raw.match(/data-post='([^']+)'/)?.[1];
    const type = raw.match(/data-type='([^']+)'/)?.[1] ?? "movie";
    const title = raw.match(/<span class='title'>([^<]*)<\/span>/)?.[1]?.trim() ?? "";
    if (nume && post) options.push({ nume, post, type, title });
  }
  return options;
}

async function embedFor(post: string, nume: string, type: string, referer: string): Promise<string | null> {
  try {
    const body = new URLSearchParams({
      action: "doo_player_ajax",
      post,
      nume,
      type,
    });
    const response = await fetch("https://cinemitas.org/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: {
        "user-agent": UA,
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "x-requested-with": "XMLHttpRequest",
        referer,
        origin: "https://cinemitas.org",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { embed_url?: string };
    if (!data.embed_url || !/^https?:\/\//i.test(data.embed_url)) return null;
    return data.embed_url;
  } catch {
    return null;
  }
}

async function playersFor(pageUrl: string): Promise<PlayerData> {
  const html = await fetchHtml(pageUrl);
  const post = html.match(/name="postid"\s+value="(\d+)"/)?.[1] ?? html.match(/postid-(\d+)/)?.[1];
  if (!post) throw new Error("La ficha no tiene reproductor.");

  const isSeries = /\/tvshows\//.test(pageUrl);
  let episodes = isSeries ? episodesOf(html) : [];
  let targetUrl = pageUrl;
  let targetHtml = html;

  if (isSeries && episodes.length > 0) {
    targetUrl = episodes[0].url;
    targetHtml = await fetchHtml(targetUrl);
  }

  const targetPost =
    targetHtml.match(/name="postid"\s+value="(\d+)"/)?.[1] ??
    targetHtml.match(/postid-(\d+)/)?.[1] ??
    post;

  const options = optionsOf(targetHtml);
  const fallbackType = /\/episodes\//.test(targetUrl) || isSeries ? "tv" : "movie";
  const list = options.length > 0
    ? options
    : [1, 2, 3].map((nume) => ({
        nume: String(nume),
        post: targetPost,
        type: fallbackType,
        title: `Servidor ${nume}`,
      }));

  const players = (
    await Promise.all(
      list.slice(0, 6).map(async (option, index) => {
        const embed = await embedFor(option.post, option.nume, option.type, targetUrl);
        if (!embed) return null;
        const host = /vidara\.so/i.test(embed)
          ? "Vidara"
          : /filemoon/i.test(embed)
            ? "Filemoon"
            : /uqload/i.test(embed)
              ? "Uqload"
              : "Servidor";
        return {
          label: `${host}${option.title ? ` · ${option.title}` : ` ${index + 1}`}`,
          url: embed,
        } satisfies Source;
      }),
    )
  ).filter((item): item is Source => Boolean(item));

  // Vidara permite reproducir su HLS sin iframe; va primero.
  players.sort((a, b) => {
    const score = (url: string) => (/vidara\.so/i.test(url) ? 0 : /filemoon/i.test(url) ? 1 : 2);
    return score(a.url) - score(b.url);
  });

  return {
    kind: isSeries ? "series" : "movie",
    title: titleOf(html),
    episodes,
    players,
    pageUrl,
    resolvedUrl: targetUrl,
  };
}

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("url") ?? "";
  const url = validUrl(raw);
  if (!url) {
    return Response.json({ error: "Ficha no válida." }, { status: 400 });
  }

  const key = url.toString();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return Response.json({ ...cached.data, cached: true });
  }

  try {
    const data = await playersFor(key);
    if (cache.size > 140) cache.clear();
    cache.set(key, { at: Date.now(), data });
    return Response.json({ ...data, cached: false });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "No se pudieron leer los servidores.",
      },
      { status: 502 },
    );
  }
}
