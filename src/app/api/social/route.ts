import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lector nativo de perfiles sociales.
 *
 * TikTok, Instagram y X bloquean iframes, el login y buena parte del tráfico
 * desde IPs de servidor. En vez de incrustar su web, pedimos el perfil a un
 * lector (r.jina.ai) que sí obtiene el HTML público, lo parseamos y devolvemos
 * datos normalizados: perfil, estadísticas y publicaciones. El cliente pinta
 * su propia interfaz y reproduce los vídeos con /api/media.
 */
const NETWORKS = ["tiktok", "instagram", "x"] as const;
type Network = (typeof NETWORKS)[number];

interface SocialItem {
  id: string;
  kind: "video" | "image" | "post";
  text?: string;
  image?: string;
  video?: string;
  url?: string;
  date?: string;
  likes?: string;
}

interface SocialProfile {
  network: Network;
  handle: string;
  name: string;
  avatar: string;
  bio: string;
  followers: string;
  posts: string;
  likes: string;
  profileUrl: string;
  items: SocialItem[];
}

const CACHE_TTL = 10 * 60 * 1000;
const cache = new Map<string, { at: number; profile: SocialProfile }>();

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const HANDLE = /^[A-Za-z0-9._-]{1,40}$/;

function media(url: string): string {
  return `/api/media?u=${encodeURIComponent(url)}`;
}

function clean(value: string): string {
  return value
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/[\u200b-\u200d\u2060\u2063]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function targetFor(network: Network, handle: string): string {
  if (network === "tiktok") return `https://www.tiktok.com/embed/@${handle}`;
  if (network === "instagram") return `https://www.instagram.com/${handle}/embed/`;
  return `https://x.com/${handle}`;
}

function profileUrlFor(network: Network, handle: string): string {
  if (network === "tiktok") return `https://www.tiktok.com/@${handle}`;
  if (network === "instagram") return `https://www.instagram.com/${handle}/`;
  return `https://x.com/${handle}`;
}

function stat(md: string, words: string): string {
  const inline = md.match(new RegExp(`\\[([\\d.,]+\\s*[KMB]?)\\]\\([^)]*\\)\\s*(?:${words})`, "i"));
  if (inline) return inline[1].replace(/\s+/g, " ").trim();
  const match = md.match(new RegExp(`([\\d.,]+\\s*[KMB]?)\\s*(?:${words})`, "i"));
  return match?.[1]?.replace(/\s+/g, " ").trim() ?? "";
}

function imagesOf(md: string): { alt: string; url: string }[] {
  return [...md.matchAll(/!\[([^\]]*)\]\((https:\/\/[^)\s]+)\)/g)].map((match) => ({
    alt: clean(match[1]),
    url: match[2],
  }));
}

function pickAvatar(md: string, network: Network): string {
  const images = imagesOf(md);
  const avatar =
    images.find((image) => {
      if (network === "x") return image.url.includes("/profile_images/");
      if (network === "instagram") return /s100x100|_s100x100_|profile_pic/i.test(image.url + image.alt);
      return /100:100|cropcenter:100/i.test(image.url);
    }) ?? images[0];
  return avatar ? media(avatar.url) : "";
}

function parseInstagram(md: string, handle: string): SocialItem[] {
  const items: SocialItem[] = [];
  const matches = md.matchAll(/!\[Image \d+: (.*?)\]\((https:\/\/scontent[^)]+)\)/g);
  for (const match of matches) {
    const caption = clean(match[1]);
    const url = match[2];
    if (/profile picture/i.test(caption)) continue;
    items.push({
      id: `ig-${items.length}`,
      kind: "image",
      image: media(url),
      text: caption,
      url: profileUrlFor("instagram", handle),
    });
    if (items.length >= 18) break;
  }
  return items;
}

function parseTikTok(md: string, handle: string): SocialItem[] {
  const items: SocialItem[] = [];
  const re =
    /\[!\[Image \d+: play-button\]\([^)]+\)\s*([\d.,]+\s*[KMB]?)\s*\[Video \d+\]\(([^)]+)\)\]\(([^)]+)\)/g;
  for (const match of md.matchAll(re)) {
    const likes = match[1].replace(/\s+/g, " ").trim();
    const video = match[2];
    const page = match[3];
    const id = page.match(/\/video\/(\d+)/)?.[1] ?? `tt-${items.length}`;
    items.push({
      id,
      kind: "video",
      video: media(video),
      likes,
      url: `https://www.tiktok.com/@${handle}/video/${id}`,
    });
    if (items.length >= 12) break;
  }
  return items;
}

function parseX(md: string, handle: string): SocialItem[] {
  const items: SocialItem[] = [];
  const re = /\[([A-Z][a-z]{2} \d{1,2})\]\((https:\/\/x\.com\/[^/]+\/status\/(\d+))\)/g;
  const matches = [...md.matchAll(re)];

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    const start = (match.index ?? 0) + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? md.length : md.length;
    const block = md.slice(start, end);

    const text = clean(
      block
        .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
        .replace(/\[[^\]]*\]\([^)]+\)/g, " ")
        .replace(/https?:\/\/\S+/g, " "),
    )
      .replace(/\b\d+(\.\d+)?[KMB]?\s*(Reply|Replies|Repost|Reposts|Like|Likes)\b/gi, "")
      .replace(/^\*+\s*|\s*\*+$/g, "")
      .slice(0, 480)
      .trim();

    const mediaMatch = block.match(
      /!\[[^\]]*\]\((https:\/\/pbs\.twimg\.com\/(?:media|amplify_video_thumb|ext_tw_video_thumb|tweet_video_thumb)[^)]+)\)/,
    );
    const likes = block.match(
      /\[([\d.,]+\s*[KMB]?)\]\(https:\/\/x\.com\/compose\/post\?in_reply_to=/i,
    )?.[1];

    items.push({
      id: match[3],
      kind: "post",
      text: text || "Publicación en X",
      image: mediaMatch ? media(mediaMatch[1]) : undefined,
      date: match[1],
      likes: likes?.replace(/\s+/g, " ").trim(),
      url: `https://x.com/${handle}/status/${match[3]}`,
    });

    if (items.length >= 15) break;
  }

  return items;
}

function profileName(md: string, network: Network, handle: string): string {
  if (network === "x") {
    const title = md.match(/Title:\s*(.+?)\s*\(@/i)?.[1];
    return title ? clean(title) : handle;
  }
  if (network === "tiktok") {
    const name = md.match(/\[([^\]]+)\]\(https:\/\/www\.tiktok\.com\/@/i)?.[1];
    return name ? clean(name) : handle;
  }
  const name = md.match(/\[([^\]]+)\]\(https:\/\/www\.instagram\.com\/[^)]*\/embed\/#\)/i)?.[1];
  return name ? clean(name) : handle;
}

function xBio(md: string, handle: string): string {
  const line = md.match(new RegExp(`^@${handle}$`, "m"));
  if (!line || line.index === undefined) return "";
  const lines = md.slice(line.index).split("\n").slice(1, 8);
  return lines
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !line.startsWith("[") &&
        !/^(Joined|Following|Followers|Posts|Replies|Media|Articles)\b/i.test(line) &&
        !/^https?:\/\//.test(line),
    )
    .slice(0, 2)
    .map(clean)
    .join(" ")
    .slice(0, 220);
}

async function loadProfile(network: Network, handle: string): Promise<SocialProfile> {
  const target = targetFor(network, handle);
  const response = await fetch(`https://r.jina.ai/${target}`, {
    headers: { "user-agent": UA, accept: "text/plain" },
    signal: AbortSignal.timeout(30_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`El lector devolvió ${response.status}.`);
  const md = await response.text();
  if (md.trim().length < 60) throw new Error("El perfil no devolvió contenido.");

  const items =
    network === "instagram"
      ? parseInstagram(md, handle)
      : network === "tiktok"
        ? parseTikTok(md, handle)
        : parseX(md, handle);

  return {
    network,
    handle,
    name: profileName(md, network, handle),
    avatar: pickAvatar(md, network),
    bio: network === "x" ? xBio(md, handle) : "",
    followers: stat(md, "followers|seguidores"),
    posts: stat(md, "posts|publicaciones|inlägg"),
    likes: stat(md, "likes|me gusta"),
    profileUrl: profileUrlFor(network, handle),
    items,
  };
}

export async function GET(request: NextRequest) {
  const network = request.nextUrl.searchParams.get("network") as Network | null;
  const rawHandle = request.nextUrl.searchParams.get("handle") ?? "";
  const handle = rawHandle.replace(/^@+/, "").trim();

  if (!network || !NETWORKS.includes(network)) {
    return Response.json({ error: "Red no válida." }, { status: 400 });
  }
  if (!HANDLE.test(handle)) {
    return Response.json({ error: "Nombre de usuario no válido." }, { status: 400 });
  }

  const key = `${network}:${handle.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    return Response.json({ profile: cached.profile, cached: true });
  }

  try {
    const profile = await loadProfile(network, handle);
    if (cache.size > 90) cache.clear();
    cache.set(key, { at: Date.now(), profile });
    return Response.json({ profile, cached: false });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "No se pudo leer el perfil.",
      },
      { status: 502 },
    );
  }
}
