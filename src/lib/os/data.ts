/**
 * Dounia OS v3 — real data layer.
 *
 * Everything here is real: app targets were taken from the original CineOS
 * registry (github.com/nathanpikelny6-oss/CineOS), wallpapers from CineOS's own
 * Videos/ folder (served over jsDelivr) plus newly generated art, and every URL
 * marked `verified` returned HTTP 200/206 when checked from the runtime.
 */

import { EXTRA_APPS } from "./apps-catalog";
import { SYSTEM_APPS } from "./system-apps";
import { RACOON_SECTIONS, RACOON_URL, racoonInitials, racoonTint } from "./racoon";

export const CDN = "https://cdn.jsdelivr.net/gh/nathanpikelny6-oss/CineOS@main";
export const RAW = "https://raw.githubusercontent.com/nathanpikelny6-oss/CineOS/main";

/* Todos los logos pasan por /api/icon: logo real si se puede descargar y, si
 * no, icono generado al instante. Ninguna app se queda sin imagen. */
const SI = (slug: string, color: string) => `/api/icon?s=${encodeURIComponent(slug)}&c=${color}`;
const FAV = (domain: string) => `/api/icon?d=${encodeURIComponent(domain)}`;
const ICO = (domain: string) => `/api/icon?d=${encodeURIComponent(domain)}`;

/* Logo oficial de WolfUnblock, leído del propio sitio y cacheado por el
 * servidor en /api/wolfunblock/logo (con el icono local como respaldo). */
const WOLF_LOGO = "/api/wolfunblock/logo";

/* ------------------------------------------------------------------ *
 * Apps
 * ------------------------------------------------------------------ */

export type AppKind =
  | "embed"
  | "browser"
  | "racoon"
  | "scramjet"
  | "proxy"
  | "links"
  | "movies"
  | "settings"
  | "assistant"
  | "games"
  | "vms"
  | "wolf"
  | "proxies"
  | "xbox"
  | "raccoon"
  | "browsers"
  | "feed"
  | "cinemitas"
  | "terminal"
  | "files"
  | "notes"
  | "calc"
  | "tasks";

export interface FeedSource {
  label: string;
  /** URL del iframe; `{handle}` se sustituye por el usuario. */
  embed: string;
  /** Página real que se abre en una pestaña. */
  open: string;
}

export interface FeedConfig {
  label: string;
  placeholder: string;
  defaultHandle: string;
  sources: FeedSource[];
  note?: string;
}
export type AppCategory =
  | "system"
  | "unblock"
  | "streaming"
  | "games"
  | "tools"
  | "social"
  | "ai"
  | "dev"
  | "design"
  | "learn"
  | "news"
  | "music"
  | "shop"
  | "sport"
  | "finance"
  | "travel"
  | "food"
  | "health"
  | "fun";

export interface OSApp {
  id: string;
  name: string;
  sub: string;
  icon: string;
  /** Brand color used by the icon fallback tile. */
  accent: string;
  kind: AppKind;
  category: AppCategory;
  url?: string;
  /** Site is known to refuse framing (X-Frame-Options / CSP frame-ancestors). */
  blocked?: boolean;
  /** For kind "wolf": which WolfUnblock section this app opens. */
  section?: string;
  note?: string;
  pinned?: boolean;
  /** Para kind "feed": visor de perfiles públicos. */
  feed?: FeedConfig;
  /** Si el sitio permite iframes, se carga directamente. */
  direct?: boolean;
}

const ALL_APPS: OSApp[] = [
  {
    id: "tiktok",
    name: "TikTok",
    sub: "Perfiles · vista nativa",
    icon: ICO("tiktok.com"),
    accent: "#fe2c55",
    kind: "feed",
    category: "social",
    feed: {
      label: "Perfil público de TikTok",
      placeholder: "@usuario de TikTok",
      defaultHandle: "tiktok",
      sources: [
        {
          label: "TikTok",
          embed: "https://www.tiktok.com/embed/@{handle}",
          open: "https://www.tiktok.com/@{handle}",
        },
      ],
      note: "TikTok bloquea iframes y login; este visor lee perfiles públicos y reproduce sus vídeos dentro del sistema. Para el feed personal, abre la app.",
    },
  },
  {
    id: "instagram",
    name: "Instagram",
    sub: "Perfiles · vista nativa",
    icon: ICO("instagram.com"),
    accent: "#e1306c",
    kind: "feed",
    category: "social",
    feed: {
      label: "Perfil público de Instagram",
      placeholder: "@usuario de Instagram",
      defaultHandle: "instagram",
      sources: [
        {
          label: "Instagram",
          embed: "https://www.instagram.com/{handle}/embed/",
          open: "https://www.instagram.com/{handle}/",
        },
        {
          label: "Vista ligera",
          embed: "https://imginn.com/{handle}/",
          open: "https://www.instagram.com/{handle}/",
        },
      ],
      note: "Instagram bloquea iframes y login; este visor lee perfiles públicos y muestra sus fotos y publicaciones dentro del sistema.",
    },
  },
  {
    id: "x",
    name: "X (Twitter)",
    sub: "Timeline · vista nativa",
    icon: ICO("x.com"),
    accent: "#e7e9ea",
    kind: "feed",
    category: "social",
    feed: {
      label: "Timeline pública de X",
      placeholder: "@usuario de X",
      defaultHandle: "X",
      sources: [
        {
          label: "Timeline X",
          embed: "https://syndication.twitter.com/srv/timeline-profile/screen-name/{handle}",
          open: "https://x.com/{handle}",
        },
      ],
      note: "X bloquea su web y el proxy recibe 403; este visor lee el perfil y sus publicaciones públicas. El botón «Abrir app» lleva a la cuenta real.",
    },
  },
  {
    id: "movies",
    name: "Cine Hub",
    sub: "Películas y series",
    icon: ICO("cineby.tech"),
    accent: "#e11d48",
    kind: "movies",
    category: "system",
    note: "Reproductor integrado con los enlaces de GhostCloud.",
    pinned: true,
  },
  {
    id: "scramjet",
    name: "Scramjet",
    sub: "Motor V2 · único",
    icon: "/os/icons/scramjet.svg",
    accent: "#a855f7",
    kind: "scramjet",
    category: "unblock",
    note: "El único motor del sistema: Scramjet V2 con service worker, transporte Wisp y libcurl. Todas las apps y juegos cargan por aquí.",
    pinned: true,
  },
  {
    id: "racoongames",
    name: "Racoon Games",
    sub: "Catálogo completo",
    icon: ICO("raccoongame.com"),
    accent: "#7c3aed",
    kind: "racoon",
    category: "games",
    note: "Apartado propio con los 60+ juegos de la portada de raccoongame.com: portadas, notas y secciones, todo abierto dentro del sistema.",
    pinned: true,
  },
  {
    id: "yandere",
    name: "Yandere Simulator",
    sub: "Port web (fan)",
    icon: FAV("itch.io"),
    accent: "#f472b6",
    kind: "embed",
    category: "games",
    url: "https://genizymath.github.io/games/yandere-simulator/",
    note: "Port fan jugable en el navegador (GitHub Pages, se deja incrustar). No existe versión web oficial.",
    pinned: true,
  },
  {
    id: "cinemitas",
    name: "Cinemitas",
    sub: "Cine y series",
    icon: FAV("cinemitas.org"),
    accent: "#ef4444",
    kind: "cinemitas",
    category: "streaming",
    url: "https://cinemitas.org/",
    direct: true,
    note: "Cartelera nativa extraída de cinemitas.org: películas y series con sus pósters, buscador y sala de proyección.",
    pinned: true,
  },
  {
    id: "cinera",
    name: "Cinera",
    sub: "Streaming",
    icon: ICO("cinera.cfd"),
    accent: "#f43f5e",
    kind: "embed",
    category: "streaming",
    url: "https://cinera.cfd/",
    note: "Cinera con su logo original, cargada por el motor del sistema.",
    pinned: true,
  },
  {
    id: "proxyhub",
    name: "Proxy Hub",
    sub: "27 proxies",
    icon: "/os/icons/proxy.svg",
    accent: "#22d3ee",
    kind: "proxies",
    category: "unblock",
    note: "9 tipos de proxy: propio, universal, frontends UV/Rammerhead, web clásico, traducción, buscador anónimo, red Tor, túneles DNS/SNI y emergencia.",
    pinned: true,
  },
  {
    id: "ghostcloud",
    name: "GhostCloud",
    sub: "Main links",
    icon: ICO("ghost-mathmulti.zeoghost.workers.dev"),
    accent: "#38bdf8",
    kind: "links",
    category: "unblock",
    note: "Los cuatro enlaces principales, comprobados uno a uno.",
    pinned: true,
  },
  {
    id: "wolfunblock",
    name: "WolfUnblock",
    sub: "Directorio en vivo",
    icon: WOLF_LOGO,
    accent: "#22c55e",
    kind: "wolf",
    category: "unblock",
    note: "Todas las secciones del sitio leídas en vivo, con el logo real de WolfUnblock.",
    pinned: true,
  },
  {
    id: "pluto",
    name: "Pluto TV",
    sub: "TV gratis",
    icon: FAV("pluto.tv"),
    accent: "#facc15",
    kind: "embed",
    category: "streaming",
    url: "https://pluto.tv/",
    pinned: true,
  },
  {
    id: "youtube",
    name: "YouTube",
    sub: "Vídeo",
    icon: SI("youtube", "FF0000"),
    accent: "#ff0000",
    kind: "embed",
    category: "streaming",
    url: "https://www.youtube.com/",
    pinned: true,
  },
  {
    id: "twitch",
    name: "Twitch",
    sub: "Directos",
    icon: SI("twitch", "9146FF"),
    accent: "#9146ff",
    kind: "embed",
    category: "streaming",
    url: "https://www.twitch.tv/",
    pinned: true,
  },
  {
    id: "spotify",
    name: "Spotify",
    sub: "Música",
    icon: SI("spotify", "1DB954"),
    accent: "#1db954",
    kind: "embed",
    category: "streaming",
    url: "https://open.spotify.com/",
    pinned: true,
  },
  {
    id: "netflix",
    name: "Netflix",
    sub: "Series y cine",
    icon: SI("netflix", "E50914"),
    accent: "#e50914",
    kind: "embed",
    category: "streaming",
    url: "https://www.netflix.com/",
    blocked: true,
    note: "Netflix bloquea la incrustación (X-Frame-Options). Usa el enlace externo o el proxy.",
  },
  {
    id: "plex",
    name: "Plex",
    sub: "Tu biblioteca",
    icon: SI("plex", "E5A00D"),
    accent: "#e5a00d",
    kind: "embed",
    category: "streaming",
    url: "https://watch.plex.tv/",
  },
  {
    id: "crunchyroll",
    name: "Crunchyroll",
    sub: "Anime",
    icon: SI("crunchyroll", "F47521"),
    accent: "#f47521",
    kind: "embed",
    category: "streaming",
    url: "https://www.crunchyroll.com/",
    blocked: true,
    note: "Crunchyroll bloquea la incrustación. En CineOS abría senshi.live; está disponible en Enlaces.",
  },
  {
    id: "prime",
    name: "Prime Video",
    sub: "Amazon",
    icon: FAV("primevideo.com"),
    accent: "#00a8e1",
    kind: "embed",
    category: "streaming",
    url: "https://www.primevideo.com/",
    blocked: true,
  },
  {
    id: "disney",
    name: "Disney+",
    sub: "Películas",
    icon: FAV("disneyplus.com"),
    accent: "#113ccf",
    kind: "embed",
    category: "streaming",
    url: "https://www.disneyplus.com/",
    blocked: true,
  },
  {
    id: "tubi",
    name: "Tubi",
    sub: "Cine gratis",
    icon: FAV("tubitv.com"),
    accent: "#fa382f",
    kind: "embed",
    category: "streaming",
    url: "https://tubitv.com/",
  },
  {
    id: "appletv",
    name: "Apple TV",
    sub: "Apple",
    icon: SI("appletv", "FFFFFF"),
    accent: "#ffffff",
    kind: "embed",
    category: "streaming",
    url: "https://tv.apple.com/",
    blocked: true,
  },
  {
    id: "soundcloud",
    name: "SoundCloud",
    sub: "Audio",
    icon: SI("soundcloud", "FF5500"),
    accent: "#ff5500",
    kind: "embed",
    category: "streaming",
    url: "https://soundcloud.com/",
  },
  {
    id: "vimeo",
    name: "Vimeo",
    sub: "Vídeo",
    icon: SI("vimeo", "1AB7EA"),
    accent: "#1ab7ea",
    kind: "embed",
    category: "streaming",
    url: "https://vimeo.com/",
  },
  {
    id: "steam",
    name: "Steam",
    sub: "Tienda de juegos",
    icon: FAV("store.steampowered.com"),
    accent: "#66c0f4",
    kind: "embed",
    category: "games",
    url: "https://store.steampowered.com/",
    blocked: true,
  },
  {
    id: "roblox",
    name: "Roblox",
    sub: "now.gg",
    icon: FAV("roblox.com"),
    accent: "#e2231a",
    kind: "embed",
    category: "games",
    url: "https://nowgg.fun/apps/a/19900/b.html",
    blocked: true,
    note: "CineOS abría Roblox a través de now.gg.",
  },
  {
    id: "geforce",
    name: "GeForce NOW",
    sub: "Cloud gaming",
    icon: FAV("nvidia.com"),
    accent: "#76b900",
    kind: "embed",
    category: "games",
    url: "https://play.geforcenow.com/",
    blocked: true,
  },
  {
    id: "fortnite",
    name: "Fortnite",
    sub: "Cloud",
    icon: FAV("fortnite.com"),
    accent: "#5b6cf9",
    kind: "embed",
    category: "games",
    url: "https://play.geforcenow.com/games?game-id=46bfab06-d864-465d-9e56-0dd2b2a7a2f0",
    blocked: true,
  },
  {
    id: "rocketleague",
    name: "Rocket League",
    sub: "Cloud",
    icon: ICO("rocketleague.com"),
    accent: "#1f6fff",
    kind: "embed",
    category: "games",
    url: "https://www.rocketleague.com/",
    blocked: true,
  },
  {
    id: "xbox",
    name: "Xbox Cloud",
    sub: "xCloud",
    icon: FAV("xbox.com"),
    accent: "#107c10",
    kind: "embed",
    category: "games",
    url: "https://www.xbox.com/play",
    blocked: true,
  },
  {
    id: "discord",
    name: "Discord",
    sub: "Comunidad",
    icon: SI("discord", "5865F2"),
    accent: "#5865f2",
    kind: "embed",
    category: "tools",
    url: "https://discord.com/app",
    blocked: true,
    note: "CineOS invitaba a discord.gg/YE6ZrFC6y — también está en Enlaces.",
  },
  {
    id: "android",
    name: "Android",
    sub: "now.gg",
    icon: FAV("android.com"),
    accent: "#3ddc84",
    kind: "embed",
    category: "tools",
    url: "https://nowgg.fun/",
    blocked: true,
  },
  {
    id: "vm",
    name: "Windows VM",
    sub: "AppOnFly",
    icon: ICO("apponfly.com"),
    accent: "#00adef",
    kind: "embed",
    category: "tools",
    url: "https://app.apponfly.com/trial",
    blocked: true,
  },
  {
    id: "ciri",
    name: "Dounia AI",
    sub: "Asistente IA",
    icon: "/os/icons/ciri.svg",
    accent: "#22d3ee",
    kind: "assistant",
    category: "system",
    note: "Asistente IA del sistema: abre apps, cambia fondos, temas y ajustes, y busca por el proxy. Todo en local.",
    pinned: true,
  },
  {
    id: "htmlgames",
    name: "PS5",
    sub: "+3000 juegos",
    icon: SI("playstation", "0070D1"),
    accent: "#0070d1",
    kind: "games",
    category: "games",
    note: "Interfaz PS5 con catálogo real de juegos HTML5 y biblioteca CineOS: se juegan dentro de la ventana, sin instalar nada.",
    pinned: true,
  },
  {
    id: "raccoongames",
    name: "Raccoon Games",
    sub: "16 juegos cloud",
    icon: "/os/icons/raccoon.svg",
    accent: "#7c3aed",
    kind: "raccoon",
    category: "games",
    note: "Catálogo de Raccoon Game con el logo de cada juego. Cada ficha abre el juego con Scramjet V2.",
    pinned: true,
  },
  {
    id: "cloudgames",
    name: "Racoon Cloud",
    sub: "Xbox Cloud",
    icon: FAV("xbox.com"),
    accent: "#107c10",
    kind: "xbox",
    category: "games",
    url: "https://www.xbox.com/play",
    note: "Acceso directo a cada juego del catálogo cloud; cada ficha abre su página real en Xbox Cloud Gaming.",
    pinned: true,
  },
  {
    id: "raccoon",
    name: "Raccoon Game",
    sub: "Cloud gaming",
    icon: ICO("raccoongame.com"),
    accent: "#7c3aed",
    kind: "embed",
    category: "games",
    url: "https://www.raccoongame.com",
    blocked: true,
    note: "Su catálogo es una app JavaScript con reproductor propio: ábrela en pestaña (dentro del proxy se queda en blanco).",
    pinned: true,
  },
  {
    id: "luna",
    name: "Amazon Luna",
    sub: "Cloud gratis",
    icon: ICO("amazon.com"),
    accent: "#ff9900",
    kind: "embed",
    category: "games",
    url: "https://luna.amazon.com",
    blocked: true,
    note: "Juegos gratis con Prime y canales opcionales.",
  },
  {
    id: "nowgg",
    name: "now.gg",
    sub: "Android cloud",
    icon: ICO("now.gg"),
    accent: "#5b8def",
    kind: "embed",
    category: "games",
    url: "https://now.gg",
    blocked: true,
    note: "Juegos Android en la nube, con opción gratuita.",
  },
  {
    id: "bluestacksx",
    name: "BlueStacks X",
    sub: "Android cloud",
    icon: ICO("bluestacks.com"),
    accent: "#00a3e0",
    kind: "embed",
    category: "games",
    url: "https://www.bluestacks.com/bluestacks-x.html",
    blocked: true,
    note: "Android en streaming, gratis.",
  },
  {
    id: "antstream",
    name: "Antstream",
    sub: "Retro cloud",
    icon: ICO("antstream.com"),
    accent: "#f59e0b",
    kind: "embed",
    category: "games",
    url: "https://www.antstream.com",
    blocked: true,
    note: "Miles de juegos retro en la nube; prueba gratuita.",
  },
  {
    id: "virtualpc",
    name: "Virtual PC",
    sub: "Ordenador virtual",
    icon: FAV("onworks.net"),
    accent: "#0ea5e9",
    kind: "vms",
    category: "tools",
    note: "Varios proveedores de escritorio remoto real dentro del sistema.",
    pinned: true,
  },
  {
    id: "snack",
    name: "Snack Expo",
    sub: "Móvil virtual",
    icon: FAV("expo.dev"),
    accent: "#4630eb",
    kind: "embed",
    category: "tools",
    url: "https://snack.expo.dev/",
    pinned: true,
  },
  {
    id: "photopea",
    name: "Photopea",
    sub: "Editor de imagen",
    icon: FAV("photopea.com"),
    accent: "#31a8ff",
    kind: "embed",
    category: "tools",
    url: "https://www.photopea.com/",
  },
  {
    id: "excalidraw",
    name: "Excalidraw",
    sub: "Pizarra",
    icon: SI("excalidraw", "6965DB"),
    accent: "#6965db",
    kind: "embed",
    category: "tools",
    url: "https://excalidraw.com/",
  },
  {
    id: "wikipedia",
    name: "Wikipedia",
    sub: "Enciclopedia",
    icon: SI("wikipedia", "FFFFFF"),
    accent: "#e5e7eb",
    kind: "embed",
    category: "tools",
    url: "https://es.wikipedia.org/",
  },
  {
    id: "archive",
    name: "Internet Archive",
    sub: "Archivo web",
    icon: SI("internetarchive", "FFFFFF"),
    accent: "#a1a1aa",
    kind: "embed",
    category: "tools",
    url: "https://archive.org/",
  },
  {
    id: "itchio",
    name: "itch.io",
    sub: "Juegos indie",
    icon: SI("itchdotio", "FA5C5C"),
    accent: "#fa5c5c",
    kind: "embed",
    category: "games",
    url: "https://itch.io/games/free",
  },
  {
    id: "wolf-archive",
    name: "Wolf · Archivo",
    sub: "Unblocker archive",
    icon: WOLF_LOGO,
    accent: "#22c55e",
    kind: "wolf",
    category: "unblock",
    section: "unblocker-archive",
    pinned: true,
  },
  {
    id: "wolf-web",
    name: "Wolf · Webs",
    sub: "Website unblockers",
    icon: WOLF_LOGO,
    accent: "#38bdf8",
    kind: "wolf",
    category: "unblock",
    section: "website-unblockers",
  },
  {
    id: "wolf-youtube",
    name: "Wolf · YouTube",
    sub: "YouTube unblockers",
    icon: WOLF_LOGO,
    accent: "#ef4444",
    kind: "wolf",
    category: "unblock",
    section: "youtube-unblockers",
  },
  {
    id: "wolf-games",
    name: "Wolf · Juegos",
    sub: "Games unblocked",
    icon: WOLF_LOGO,
    accent: "#f59e0b",
    kind: "wolf",
    category: "unblock",
    section: "games",
  },
  {
    id: "wolf-exploits",
    name: "Wolf · Exploits",
    sub: "Exploits y VMs",
    icon: WOLF_LOGO,
    accent: "#a855f7",
    kind: "wolf",
    category: "unblock",
    section: "exploits",
  },
  {
    id: "wolf-other",
    name: "Wolf · Otros",
    sub: "Más enlaces",
    icon: WOLF_LOGO,
    accent: "#94a3b8",
    kind: "wolf",
    category: "unblock",
    section: "other",
  },
  {
    id: "wolf-chat",
    name: "Wolf · Chat",
    sub: "Comunidad",
    icon: WOLF_LOGO,
    accent: "#5865f2",
    kind: "wolf",
    category: "unblock",
    section: "wolfunblock-chat",
  },
  {
    id: "settings",
    name: "Config",
    sub: "Sistema",
    icon: "/os/icons/config.svg",
    accent: "#94a3b8",
    kind: "settings",
    category: "system",
    pinned: true,
  },
  ...EXTRA_APPS,
  ...SYSTEM_APPS,
];

/**
 * Navegadores web que se abren dentro del sistema, todos con el motor Scramjet
 * (nada se instala, nada se descarga).
 */
export const BROWSER_APPS: OSApp[] = [
  {
    id: "bravebrowser",
    name: "Brave",
    sub: "Navegador",
    icon: SI("brave", "FB542B"),
    accent: "#fb542b",
    kind: "embed",
    category: "unblock",
    url: "https://search.brave.com/",
    note: "Buscador y navegador Brave dentro de Dounia, servido por Scramjet.",
    pinned: true,
  },
  {
    id: "firefoxweb",
    name: "Firefox",
    sub: "Navegador",
    icon: SI("firefoxbrowser", "FF7139"),
    accent: "#ff7139",
    kind: "embed",
    category: "unblock",
    url: "https://www.mozilla.org/firefox/new/",
    note: "Web oficial de Firefox: extensiones, temas y descargas de referencia.",
    pinned: true,
  },
  {
    id: "operabrowser",
    name: "Opera",
    sub: "Navegador",
    icon: SI("opera", "FF1B2D"),
    accent: "#ff1b2d",
    kind: "embed",
    category: "unblock",
    url: "https://www.opera.com/",
    note: "Navegador Opera y sus herramientas web, dentro del escritorio.",
    pinned: true,
  },
  {
    id: "vivaldiweb",
    name: "Vivaldi",
    sub: "Navegador",
    icon: SI("vivaldi", "EF3939"),
    accent: "#ef3939",
    kind: "embed",
    category: "unblock",
    url: "https://vivaldi.com/",
    note: "Vivaldi: navegador configurable, aquí en versión web.",
  },
  {
    id: "ddgbrowser",
    name: "DuckDuckGo",
    sub: "Privacidad",
    icon: SI("duckduckgo", "DE5833"),
    accent: "#de5833",
    kind: "embed",
    category: "unblock",
    url: "https://duckduckgo.com/",
    note: "Búsqueda privada sin seguimiento, con el motor del sistema.",
    pinned: true,
  },
  {
    id: "startpageweb",
    name: "Startpage",
    sub: "Búsqueda anónima",
    icon: ICO("startpage.com"),
    accent: "#657ab7",
    kind: "embed",
    category: "unblock",
    url: "https://www.startpage.com/",
    note: "Resultados de Google sin perfilarte, abiertos en la ventana.",
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Cada juego de Racoon Game como app propia del sistema, para poder fijarlo en
 * el escritorio como cualquier otra. Su logo es un SVG generado con las
 * iniciales y el color del juego (su API no publica carátulas).
 */
export const RACOON_APPS: OSApp[] = (() => {
  const seen = new Set<string>();
  const apps: OSApp[] = [];

  for (const section of RACOON_SECTIONS) {
    for (const game of section.games) {
      const id = `rcn-${slugify(game.name)}`;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const tint = racoonTint(game.name);
      apps.push({
        id,
        name: game.name,
        sub: `Racoon · ${section.title}`,
        icon: `/api/cover?q=${encodeURIComponent(game.name)}&c=${encodeURIComponent(tint.from)}`,
        accent: tint.from,
        kind: "embed",
        category: "games",
        url: RACOON_URL,
        note: `Juego de Racoon Game${game.score ? ` (nota ${game.score})` : ""}: se abre en su plataforma, dentro del sistema.`,
      });
    }
  }

  return apps;
})();

/** Apps que solo funcionan instalando o descargando un cliente: fuera. */
const INSTALL_ONLY = new Set(["android", "bluestacksx", "virtualpc", "snack"]);

/**
 * Catálogo final del sistema: solo apps que se abren directamente en el
 * navegador (más de 230), sin instaladores ni descargas.
 */
export const APPS: OSApp[] = [...ALL_APPS, ...BROWSER_APPS, ...RACOON_APPS].filter(
  (app) => !INSTALL_ONLY.has(app.id) && app.kind !== "vms",
);

export const APP_MAP: Record<string, OSApp> = Object.fromEntries(APPS.map((a) => [a.id, a]));

export type ThemeId =
  | "windows11"
  | "macos"
  | "linux"
  | "gamer"
  | "playstation"
  | "xbox"
  | "nintendo"
  | "cinema"
  | "samsung"
  | "iphone";

export interface OSTheme {
  id: ThemeId;
  name: string;
  desc: string;
  accent: string;
}

export const THEMES: OSTheme[] = [
  { id: "windows11", name: "Windows 11", desc: "Barra centrada, cristal suave y esquinas redondeadas", accent: "#2563eb" },
  { id: "macos", name: "macOS", desc: "Barra de menú arriba y dock flotante abajo", accent: "#e5e7eb" },
  { id: "linux", name: "Linux", desc: "Dock lateral y barra de estado superior", accent: "#f97316" },
  { id: "gamer", name: "PC Gamer", desc: "Neón morado, bordes angulares y brillo", accent: "#a855f7" },
  {
    id: "playstation",
    name: "PlayStation 5",
    desc: "El escritorio se convierte en una PS5: biblioteca de juegos y mando",
    accent: "#0070d1",
  },
  {
    id: "xbox",
    name: "Xbox Series X",
    desc: "Interfaz Xbox con sus verdes, panel destacado y juegos",
    accent: "#107c10",
  },
  {
    id: "nintendo",
    name: "Nintendo Switch",
    desc: "Modo Switch en blanco y rojo, con juegos en cuadrícula",
    accent: "#e60012",
  },
  {
    id: "cinema",
    name: "Modo Cine",
    desc: "El escritorio se vuelve un cine con la cartelera de cinemitas.org",
    accent: "#e8c878",
  },
  {
    id: "samsung",
    name: "Samsung Galaxy",
    desc: "El sistema se ejecuta como un móvil Samsung con One UI",
    accent: "#3b82f6",
  },
  {
    id: "iphone",
    name: "iPhone",
    desc: "El sistema se ejecuta como un iPhone con iOS y Dynamic Island",
    accent: "#a1a1aa",
  },
];

export interface SearchEngine {
  id: string;
  name: string;
  home: string;
  search: (query: string) => string;
}

export const SEARCH_ENGINES: SearchEngine[] = [
  {
    id: "ddg",
    name: "DuckDuckGo",
    home: "https://html.duckduckgo.com/html/",
    search: (q) => `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`,
  },
  {
    id: "brave",
    name: "Brave",
    home: "https://search.brave.com/",
    search: (q) => `https://search.brave.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "bing",
    name: "Bing",
    home: "https://www.bing.com/",
    search: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "google",
    name: "Google",
    home: "https://www.google.com/",
    search: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: "ecosia",
    name: "Ecosia",
    home: "https://www.ecosia.org/",
    search: (q) => `https://www.ecosia.org/search?q=${encodeURIComponent(q)}`,
  },
];

export interface VMProvider {
  id: string;
  name: string;
  sub: string;
  url: string;
  embeddable: boolean;
}

export const VM_PROVIDERS: VMProvider[] = [
  { id: "onworks", name: "OnWorks", sub: "Escritorio Linux online", url: "https://www.onworks.net/", embeddable: true },
  {
    id: "apponfly",
    name: "AppOnFly",
    sub: "Windows virtual · el original de CineOS",
    url: "https://app.apponfly.com/trial",
    embeddable: false,
  },
  { id: "hyperbeam", name: "Hyperbeam", sub: "Navegador remoto compartido", url: "https://hyperbeam.com/", embeddable: true },
  { id: "kasm", name: "Kasm", sub: "Contenedores de escritorio", url: "https://kasmweb.com/", embeddable: false },
  { id: "neverinstall", name: "Neverinstall", sub: "Apps de escritorio en la nube", url: "https://neverinstall.com/", embeddable: false },
  { id: "browserling", name: "Browserling", sub: "Navegador remoto real", url: "https://www.browserling.com/", embeddable: false },
  { id: "replit", name: "Replit", sub: "IDE y terminal en la nube", url: "https://replit.com/", embeddable: false },
];

export type ProxyType =
  | "propio"
  | "universal"
  | "frontend"
  | "clasico"
  | "traductor"
  | "buscador"
  | "tor"
  | "dns"
  | "emergencia";

export interface ProxyProvider {
  id: string;
  name: string;
  sub: string;
  url: string;
  type: ProxyType;
  engine: string;
  note?: string;
}

export const PROXY_TYPE_LABEL: Record<ProxyType, string> = {
  propio: "Proxy propio (Dounia)",
  universal: "Proxies universales",
  frontend: "Frontends Ultraviolet / Rammerhead",
  clasico: "Proxies web clásicos",
  traductor: "Proxies de traducción",
  buscador: "Buscadores anónimos",
  tor: "Red Tor / onion",
  dns: "Túneles DNS / SNI",
  emergencia: "Proxies de emergencia",
};

/** Accent colour per proxy type, used by the Proxy Hub dashboard. */
export const PROXY_TYPE_COLOR: Record<ProxyType, string> = {
  propio: "#22d3ee",
  universal: "#a855f7",
  frontend: "#8b5cf6",
  clasico: "#f472b6",
  traductor: "#34d399",
  buscador: "#fbbf24",
  tor: "#4ade80",
  dns: "#38bdf8",
  emergencia: "#fb7185",
};

/** Every entry answered HTTP 200 from the runtime when checked. */
export const PROXY_PROVIDERS: ProxyProvider[] = [
  {
    id: "dounia",
    name: "Dounia Proxy",
    sub: "Reescritor propio",
    url: "https://cineby.tech",
    type: "propio",
    engine: "Next.js fetch + reescritura de HTML + srcdoc",
    note: "El único proxy que se ejecuta dentro de este proyecto. Ningún bloqueo de iframe le afecta.",
  },
  {
    id: "drfrost",
    name: "drfrost.site",
    sub: "Universal proxy",
    url: "https://drfrost.site",
    type: "universal",
    engine: "Universal proxy",
    note: "Es el proxy que enlaza Tung Tung Sahur Lab en su sección de websites.",
  },
  {
    id: "tungtung",
    name: "Tung Tung Lab",
    sub: "Hub de proxies",
    url: "https://tungtunglab.nekoweb.org",
    type: "universal",
    engine: "Hub de enlaces (drfrost y más)",
    note: "El sitio de Tung Tung Sahur: enlaza varios proxies en vez de ejecutar uno propio.",
  },
  {
    id: "holy",
    name: "Holy Unblocker",
    sub: "Holy UB",
    url: "https://holyubofficial.net",
    type: "frontend",
    engine: "Ultraviolet + Bare / Rammerhead",
  },
  {
    id: "rammerhead",
    name: "Rammerhead",
    sub: "Proxy de sesión",
    url: "https://rammerhead.org",
    type: "frontend",
    engine: "Rammerhead (sesión por servidor)",
  },
  {
    id: "aliyah",
    name: "Aliyah",
    sub: "Frontend UV",
    url: "https://aliyah.pages.dev",
    type: "frontend",
    engine: "Ultraviolet",
  },
  {
    id: "titanium",
    name: "Titanium Network",
    sub: "Comunidad",
    url: "https://titaniumnetwork.org",
    type: "frontend",
    engine: "Proyectos Ultraviolet / Bare",
  },
  {
    id: "scramjet",
    name: "Scramjet",
    sub: "Sucesor de UV",
    url: "https://mercurywork.shop/project/Scramjet",
    type: "frontend",
    engine: "Scramjet (MercuryWorkshop)",
    note: "El proxy moderno por intercepción que sustituye a Ultraviolet. Es un framework: se autohospeda en instancias (Holy Unblocker LTS, entre otras).",
  },
  {
    id: "ultraviolet",
    name: "Ultraviolet",
    sub: "UV (legacy)",
    url: "https://github.com/titaniumnetwork-dev/Ultraviolet",
    type: "frontend",
    engine: "Ultraviolet (Titanium Network)",
    note: "El clásico UV. Ya no se mantiene (lo reemplazó Scramjet); varias instancias públicas siguen usándolo bajo sus propios dominios.",
  },
  {
    id: "croxy",
    name: "CroxyProxy",
    sub: "Proxy web",
    url: "https://www.croxyproxy.com",
    type: "clasico",
    engine: "Proxy web con servidor propio",
  },
  {
    id: "blockaway",
    name: "BlockAway",
    sub: "Proxy web",
    url: "https://www.blockaway.net",
    type: "clasico",
    engine: "Proxy web clásico",
  },
  {
    id: "hideme",
    name: "hide.me",
    sub: "Proxy web",
    url: "https://hide.me/en/proxy",
    type: "clasico",
    engine: "Proxy web de hide.me",
  },
  {
    id: "4everproxy",
    name: "4everproxy",
    sub: "Proxy web",
    url: "https://www.4everproxy.com",
    type: "clasico",
    engine: "Proxy web clásico",
  },
  {
    id: "proxfree",
    name: "ProxFree",
    sub: "Proxy web",
    url: "https://www.proxfree.com",
    type: "clasico",
    engine: "Proxy web clásico",
  },
  {
    id: "gtranslate",
    name: "Google Translate",
    sub: "Traductor-proxy",
    url: "https://translate.google.com/",
    type: "traductor",
    engine: "Traducción + renderizado vía Google",
    note: "Abre cualquier página traducida a través de translate.google.com/translate?u=.",
  },
  {
    id: "twelveft",
    name: "12ft Ladder",
    sub: "Sin paywall",
    url: "https://12ft.io/",
    type: "traductor",
    engine: "Despajar artículos de pago",
    note: "Lee artículos detrás de muros de pago.",
  },
  {
    id: "deepl",
    name: "DeepL",
    sub: "Traductor",
    url: "https://www.deepl.com/translator",
    type: "traductor",
    engine: "Traducción de alta calidad",
  },
  {
    id: "startpage",
    name: "Startpage",
    sub: "Google privado",
    url: "https://www.startpage.com/",
    type: "buscador",
    engine: "Resultados de Google sin rastreo",
  },
  {
    id: "searx",
    name: "SearXNG",
    sub: "Metabuscador",
    url: "https://searx.be/",
    type: "buscador",
    engine: "Instancia pública autoalojada",
  },
  {
    id: "mojeek",
    name: "Mojeek",
    sub: "Índice propio",
    url: "https://www.mojeek.com/",
    type: "buscador",
    engine: "Índice web independiente",
  },
  {
    id: "torproject",
    name: "Tor Project",
    sub: "Red onion",
    url: "https://www.torproject.org/",
    type: "tor",
    engine: "La red onion oficial · Tor Browser",
    note: "Para navegar por la red .onion usa Tor Browser; esta es la fuente oficial.",
  },
  {
    id: "snowflake",
    name: "Snowflake",
    sub: "Proxy WebRTC",
    url: "https://snowflake.torproject.org/",
    type: "tor",
    engine: "Transporte enchufable para la red Tor",
    note: "Un proxy real en el navegador que ayuda a los usuarios de Tor a salir.",
  },
  {
    id: "goodbyedpi",
    name: "GoodByeDPI",
    sub: "Anti-DPI",
    url: "https://github.com/ValdikSS/GoodbyeDPI",
    type: "dns",
    engine: "Esquiva el bloqueo/DPI del operador",
    note: "Utilidad local que burla la inspección profunda de paquetes.",
  },
  {
    id: "zapret",
    name: "zapret",
    sub: "Anti-DPI Linux",
    url: "https://github.com/bol-van/zapret",
    type: "dns",
    engine: "Bypass de DPI (Linux/router)",
  },
  {
    id: "tungalto",
    name: "Tung Altolospilos",
    sub: "Portal de respaldo",
    url: "https://tung.altolospilos.cl",
    type: "emergencia",
    engine: "Portal de estudios / enlaces Tung Tung",
    note: "Instancia alternativa del ecosistema Tung Tung Sahur para cuando caen las demás.",
  },
  {
    id: "s3us",
    name: "Amazon S3 (us-east-1)",
    sub: "CDN directo",
    url: "https://s3.us-east1.amazonaws.com",
    type: "emergencia",
    engine: "Almacenamiento S3 de AWS",
    note: "Punto de salida de objetos S3: sirve recursos y juegos alojados en buckets sin pasar por filtros de dominio.",
  },
  {
    id: "chanka",
    name: "Chanka (sixseven)",
    sub: "Nodo seis/siete",
    url: "https://sixseven.chanka.com",
    type: "emergencia",
    engine: "Nodo Chanka 6·7",
    note: "Nodo de respaldo del pool Chanka para conmutar cuando el principal no responde.",
  },
];

export interface CloudBrowser {
  id: string;
  name: string;
  sub: string;
  url: string;
  accent: string;
}

/**
 * The three cloud-browser endpoints used by CineOS/Astra (cine-browser-1/2/3).
 * They are interchangeable streaming-browser servers; the browser app pings
 * them in order and switches automatically to the first one that responds.
 */
export const CLOUD_BROWSERS: CloudBrowser[] = [
  { id: "cb1", name: "Astra Browser 1", sub: "cine-browser-1", url: "https://cine-browser-1.b-cdn.net", accent: "#a855f7" },
  { id: "cb2", name: "Astra Browser 2", sub: "cine-browser-2", url: "https://cine-browser-2.b-cdn.net", accent: "#22d3ee" },
  { id: "cb3", name: "Astra Browser 3", sub: "cine-browser-3", url: "https://cine-browser-3.b-cdn.net", accent: "#34d399" },
];

export interface CloudGame {
  name: string;
  tags: string[];
  /** Brand colour used by the art tile. */
  accent: string;
}

/**
 * Catalogue of real Xbox Cloud Gaming titles. RacoonGames does not publish an
 * open catalogue (racoongames.com is a parked domain), so every tile links
 * straight to that game's Xbox Cloud page/search — a working deep link.
 */
export const CLOUD_GAMES: CloudGame[] = [
  { name: "Fortnite", tags: ["Battle Royale", "Free"], accent: "#5b6cf9" },
  { name: "Halo Infinite", tags: ["Shooter", "Multiplayer"], accent: "#3b82f6" },
  { name: "Forza Horizon 5", tags: ["Cars", "Open world"], accent: "#e11d48" },
  { name: "Minecraft Java & Bedrock", tags: ["Sandbox"], accent: "#22c55e" },
  { name: "Sea of Thieves", tags: ["Adventure"], accent: "#0ea5e9" },
  { name: "Starfield", tags: ["RPG", "Space"], accent: "#64748b" },
  { name: "Grand Theft Auto V", tags: ["Open world"], accent: "#f59e0b" },
  { name: "Halo: The Master Chief Collection", tags: ["Shooter"], accent: "#38bdf8" },
  { name: "Gears 5", tags: ["Shooter"], accent: "#ef4444" },
  { name: "Microsoft Flight Simulator", tags: ["Simulation"], accent: "#60a5fa" },
  { name: "Age of Empires IV", tags: ["Estrategia"], accent: "#ca8a04" },
  { name: "Doom Eternal", tags: ["FPS"], accent: "#dc2626" },
  { name: "Fallout 76", tags: ["RPG"], accent: "#84cc16" },
  { name: "The Elder Scrolls Online", tags: ["MMO"], accent: "#a3a3a3" },
  { name: "No Man's Sky", tags: ["Espacio"], accent: "#f472b6" },
  { name: "Dead by Daylight", tags: ["Horror"], accent: "#b91c1c" },
  { name: "It Takes Two", tags: ["Cooperativo"], accent: "#8b5cf6" },
  { name: "EA Sports FC 25", tags: ["Fútbol"], accent: "#16a34a" },
  { name: "Battlefield 2042", tags: ["FPS"], accent: "#f97316" },
  { name: "Hellblade II", tags: ["Aventura"], accent: "#7c3aed" },
  { name: "Indiana Jones and the Great Circle", tags: ["Aventura"], accent: "#d97706" },
  { name: "Avowed", tags: ["RPG"], accent: "#14b8a6" },
  { name: "Persona 3 Reload", tags: ["JRPG"], accent: "#0ea5e9" },
  { name: "Yakuza: Like a Dragon", tags: ["JRPG"], accent: "#e11d48" },
  { name: "Control", tags: ["Acción"], accent: "#c026d3" },
  { name: "Quantum Break", tags: ["Acción"], accent: "#2563eb" },
  { name: "State of Decay 2", tags: ["Zombies"], accent: "#65a30d" },
  { name: "Ori and the Will of the Wisps", tags: ["Plataformas"], accent: "#38bdf8" },
  { name: "Hollow Knight", tags: ["Metroidvania"], accent: "#818cf8" },
  { name: "MLB The Show 25", tags: ["Deportes"], accent: "#1d4ed8" },
  { name: "Overwatch 2", tags: ["Hero shooter"], accent: "#f59e0b" },
  { name: "Roblox", tags: ["Sandbox"], accent: "#e2231a" },
  { name: "Grounded", tags: ["Supervivencia"], accent: "#84cc16" },
  { name: "Hi-Fi Rush", tags: ["Ritmo"], accent: "#f43f5e" },
  { name: "Psychonauts 2", tags: ["Plataformas"], accent: "#a855f7" },
  { name: "Pentiment", tags: ["Narrativo"], accent: "#b45309" },
  { name: "Forza Motorsport", tags: ["Carreras"], accent: "#0ea5e9" },
  { name: "Killer Instinct", tags: ["Lucha"], accent: "#ef4444" },
  { name: "Sunset Overdrive", tags: ["Acción"], accent: "#f97316" },
  { name: "Crackdown 3", tags: ["Acción"], accent: "#38bdf8" },
  { name: "Dead Space", tags: ["Horror"], accent: "#0f766e" },
  { name: "Star Wars Jedi: Survivor", tags: ["Aventura"], accent: "#2563eb" },
  { name: "Mass Effect Legendary Edition", tags: ["RPG"], accent: "#7c3aed" },
  { name: "Dragon Age: The Veilguard", tags: ["RPG"], accent: "#9333ea" },
  { name: "Assassin's Creed Origins", tags: ["Mundo abierto"], accent: "#ca8a04" },
  { name: "Far Cry 6", tags: ["FPS"], accent: "#dc2626" },
  { name: "Resident Evil 2", tags: ["Horror"], accent: "#b91c1c" },
  { name: "Monster Hunter Rise", tags: ["Acción"], accent: "#16a34a" },
  { name: "Street Fighter 6", tags: ["Lucha"], accent: "#f59e0b" },
  { name: "Tekken 8", tags: ["Lucha"], accent: "#e11d48" },
  { name: "Mortal Kombat 1", tags: ["Lucha"], accent: "#f97316" },
  { name: "Diablo IV", tags: ["ARPG"], accent: "#7f1d1d" },
  { name: "Call of Duty: Black Ops 6", tags: ["FPS"], accent: "#3f3f46" },
  { name: "NBA 2K25", tags: ["Deportes"], accent: "#ea580c" },
  { name: "Madden NFL 25", tags: ["Deportes"], accent: "#1d4ed8" },
  { name: "WWE 2K24", tags: ["Deportes"], accent: "#dc2626" },
  { name: "Sniper Elite 5", tags: ["Shooter"], accent: "#65a30d" },
  { name: "Deep Rock Galactic", tags: ["Cooperativo"], accent: "#f59e0b" },
  { name: "Hades", tags: ["Roguelike"], accent: "#dc2626" },
  { name: "Vampire Survivors", tags: ["Roguelike"], accent: "#7c3aed" },
  { name: "Dead Cells", tags: ["Roguelike"], accent: "#22d3ee" },
  { name: "Cuphead", tags: ["Plataformas"], accent: "#facc15" },
  { name: "Celeste", tags: ["Plataformas"], accent: "#38bdf8" },
];

export interface CloudPlatform {
  id: string;
  name: string;
  sub: string;
  url: string;
  icon: string;
  accent: string;
  free: boolean;
  note: string;
}

/** Legal cloud-gaming platforms; each URL answered 200 when checked. */
export const CLOUD_PLATFORMS: CloudPlatform[] = [
  {
    id: "raccoon",
    name: "Raccoon Game",
    sub: "raccoongame.com",
    url: "https://www.raccoongame.com",
    icon: "https://icons.duckduckgo.com/ip3/raccoongame.com.ico",
    accent: "#7c3aed",
    free: true,
    note: "La plataforma real: su catálogo completo se ve en el hub en vivo.",
  },
  {
    id: "xbox",
    name: "Xbox Cloud Gaming",
    sub: "xCloud",
    url: "https://www.xbox.com/play",
    icon: "https://icons.duckduckgo.com/ip3/xbox.com.ico",
    accent: "#107c10",
    free: true,
    note: "Gratis con juegos free-to-play (Fortnite, Rocket League…); el resto requiere Game Pass Ultimate.",
  },
  {
    id: "gfn",
    name: "GeForce NOW",
    sub: "NVIDIA",
    url: "https://play.geforcenow.com",
    icon: "https://icons.duckduckgo.com/ip3/nvidia.com.ico",
    accent: "#76b900",
    free: true,
    note: "Plan gratuito con sesiones de 1 hora; juegas tus juegos de Steam/Epic.",
  },
  {
    id: "luna",
    name: "Amazon Luna",
    sub: "Amazon",
    url: "https://luna.amazon.com",
    icon: "https://icons.duckduckgo.com/ip3/amazon.com.ico",
    accent: "#ff9900",
    free: true,
    note: "Juegos gratis con Prime y canales de pago opcionales.",
  },
  {
    id: "nowgg",
    name: "now.gg",
    sub: "Android en la nube",
    url: "https://now.gg",
    icon: "https://icons.duckduckgo.com/ip3/now.gg.ico",
    accent: "#5b8def",
    free: true,
    note: "Juegos móviles Android en el navegador, con opción gratuita.",
  },
  {
    id: "bluestacksx",
    name: "BlueStacks X",
    sub: "Android cloud",
    url: "https://www.bluestacks.com/bluestacks-x.html",
    icon: "https://icons.duckduckgo.com/ip3/bluestacks.com.ico",
    accent: "#00a3e0",
    free: true,
    note: "Android en streaming desde el navegador, gratis.",
  },
  {
    id: "antstream",
    name: "Antstream Arcade",
    sub: "Retro",
    url: "https://www.antstream.com",
    icon: "https://icons.duckduckgo.com/ip3/antstream.com.ico",
    accent: "#f59e0b",
    free: true,
    note: "Miles de juegos retro en la nube; tiene prueba gratuita.",
  },
  {
    id: "shadow",
    name: "Shadow",
    sub: "PC en la nube",
    url: "https://shadow.tech",
    icon: "https://icons.duckduckgo.com/ip3/shadow.tech.ico",
    accent: "#5b21b6",
    free: false,
    note: "PC completo en la nube, de pago (sin plan gratuito).",
  },
];

export function cloudGameUrl(name: string): string {
  return `https://www.xbox.com/play/search?q=${encodeURIComponent(name)}`;
}

export const CATEGORY_LABEL: Record<AppCategory, string> = {
  system: "Sistema",
  unblock: "Unblockers",
  streaming: "Streaming",
  games: "Juegos",
  tools: "Herramientas",
  social: "Redes sociales",
  ai: "Inteligencia artificial",
  dev: "Desarrollo",
  design: "Diseño",
  learn: "Aprender",
  news: "Noticias",
  music: "Música",
  shop: "Compras",
  sport: "Deporte",
  finance: "Finanzas",
  travel: "Viajes",
  food: "Comida",
  health: "Salud",
  fun: "Cultura y memes",
};

/* ------------------------------------------------------------------ *
 * Wallpapers
 * ------------------------------------------------------------------ */

export type WallCategory =
  | "cine"
  | "gaming"
  | "galaxias"
  | "neon"
  | "paisajes"
  | "anime"
  | "tecnologia"
  | "noir"
  | "cineos"
  | "gradientes"
  | "live";

export interface Wallpaper {
  id: string;
  name: string;
  category: WallCategory;
  /** "live" = animated with pure CSS (no video file). */
  type: "video" | "image" | "gradient" | "live";
  src: string;
  /** Ken Burns style motion for still images. */
  motion?: boolean;
  /** Optional still frame for cards. */
  poster?: string;
}

export const WALL_CATEGORY_LABEL: Record<WallCategory, string> = {
  cine: "Cine",
  gaming: "Gaming",
  galaxias: "Galaxias",
  neon: "Neón",
  paisajes: "Paisajes",
  anime: "Anime",
  tecnologia: "Tecnología",
  noir: "Negro & Morado",
  cineos: "CineOS Originales",
  gradientes: "Gradientes",
  live: "En movimiento",
};

const generated: Wallpaper[] = [
  {
    id: "aura-tokyo",
    name: "Aura Tokyo · coche",
    category: "live",
    type: "image",
    src: "/wallpapers/aura-tokyo-race.webp",
    motion: true,
  },
  { id: "cine-noir", name: "Sala de cine", category: "cine", type: "image", src: "/wallpapers/cine-noir.webp" },
  { id: "gaming-neon-arena", name: "Arena esports", category: "gaming", type: "image", src: "/wallpapers/gaming-neon-arena.webp" },
  { id: "galaxy-drift", name: "Galaxia violeta", category: "galaxias", type: "image", src: "/wallpapers/galaxy-drift.webp" },
  { id: "neon-alley", name: "Callejón neón", category: "neon", type: "image", src: "/wallpapers/neon-alley.webp" },
  { id: "landscape-purple-dusk", name: "Crepúsculo morado", category: "paisajes", type: "image", src: "/wallpapers/landscape-purple-dusk.webp" },
  { id: "anime-city-night", name: "Ciudad anime", category: "anime", type: "image", src: "/wallpapers/anime-city-night.webp" },
  { id: "tech-circuit", name: "Circuito", category: "tecnologia", type: "image", src: "/wallpapers/tech-circuit.webp" },
  { id: "black-purple-abstract", name: "Metal morado", category: "noir", type: "image", src: "/wallpapers/black-purple-abstract.webp", motion: true },
  { id: "v3-aurora-city", name: "Ciudad aurora", category: "neon", type: "image", src: "/wallpapers/v3-aurora-city.webp", motion: true },
  { id: "v3-violet-silk", name: "Seda violeta", category: "noir", type: "image", src: "/wallpapers/v3-violet-silk.webp", motion: true },
  { id: "v3-space-orbs", name: "Orbes profundos", category: "galaxias", type: "image", src: "/wallpapers/v3-space-orbs.webp", motion: true },
  { id: "v3-neon-rain", name: "Lluvia neón", category: "neon", type: "image", src: "/wallpapers/v3-neon-rain.webp", motion: true },
  { id: "v3-molten-chrome", name: "Cromo fundido", category: "tecnologia", type: "image", src: "/wallpapers/v3-molten-chrome.webp", motion: true },
  { id: "v3-crystal-cave", name: "Cueva de cristal", category: "paisajes", type: "image", src: "/wallpapers/v3-crystal-cave.webp", motion: true },
];

/** Pure-CSS animated wallpapers: instant, weightless and endlessly moving. */
const liveWalls: Wallpaper[] = [
  { id: "live-aurora", name: "Aurora viva", category: "live", type: "live", src: "aurora" },
  { id: "live-mesh", name: "Malla morada", category: "live", type: "live", src: "mesh" },
  { id: "live-stars", name: "Viaje estelar", category: "live", type: "live", src: "stars" },
  { id: "live-pulse", name: "Pulso neón", category: "live", type: "live", src: "pulse" },
  { id: "live-waves", name: "Olas de luz", category: "live", type: "live", src: "waves" },
  { id: "live-grid", name: "Rejilla retro", category: "live", type: "live", src: "grid" },
  { id: "live-smoke", name: "Humo violeta", category: "live", type: "live", src: "smoke" },
  { id: "live-plasma", name: "Plasma", category: "live", type: "live", src: "plasma" },
];

/** CineOS's own wallpaper engine — original Videos/ assets, served over jsDelivr. */
const cineosVideos: Array<[string, string, string]> = [
  ["green", "Green Anime", "green.mp4"],
  ["Hunt", "Hunt Showdown", "Hunt.mp4"],
  ["33A56", "Hunt Trait", "33A56.mp4"],
  ["45E33", "45E33", "45E33.mp4"],
  ["99Med", "99 Med", "99Med.mp4"],
  ["BlackHole", "Black Hole", "BlackHole.mp4"],
  ["Brother", "Brother", "Brother.mp4"],
  ["CozyFox", "Cozy Fox", "CozyFox.mp4"],
  ["Desktop", "Desktop Lines", "Desktop.mp4"],
  ["F-1", "F1", "F-1.mp4"],
  ["Gojo", "Gojo", "Gojo.mp4"],
  ["Gojo-Sukuna", "Gojo vs Sukuna", "Gojo-Sukuna.mp4"],
  ["Minecraft01", "Minecraft 01", "Minecraft01.mp4"],
  ["Minecraft02", "Minecraft 02", "Minecraft02.mp4"],
  ["Minecraft03", "Minecraft 03", "Minecraft03.mp4"],
  ["Monkey", "Monkey", "Monkey.mp4"],
  ["RainyCity", "Rainy City", "RainyCity.mp4"],
  ["Skello", "Skello", "Skello.MP4"],
  ["SnowFox", "Snow Fox", "SnowFox.mp4"],
  ["Yuji52", "Yuji 52", "Yuji52.mp4"],
  ["Yuta", "Yuta", "Yuta.mp4"],
  ["sukuna-fire", "Sukuna Fire", "sukuna-fire.mp4"],
  ["92Med", "92 Med", "92Med.MOV"],
];

/* Todos los fondos remotos pasan por /api/wall: mismo origen, con Range y
 * cache, para que un filtro escolar contra jsDelivr no deje el fondo en negro. */
const WALL_PROXY = "/api/wall";

const cineosStills: Array<[string, string, string]> = [
  ["55Cine", "Cine 55", "55Cine.PNG"],
  ["Supra", "Supra Drift", "Supra.PNG"],
  ["Monday", "Lunes", "Monday.png"],
  ["Tuesday", "Martes", "Tuesday.png"],
  ["Wednesday", "Miércoles", "Wednesday.png"],
  ["Thursday", "Jueves", "Thursday.png"],
  ["Friday", "Viernes", "Friday.png"],
  ["Saturday", "Sábado", "Saturday.png"],
  ["Sunday", "Domingo", "Sunday.png"],
];

const cineos: Wallpaper[] = [
  ...cineosVideos.map(([id, name, file]) => ({
    id: `cineos-${id}`,
    name,
    category: "cineos" as WallCategory,
    type: "video" as const,
    src: `${WALL_PROXY}/${file}`,
  })),
  ...cineosStills.map(([id, name, file]) => ({
    id: `cineos-${id}`,
    name,
    category: "cineos" as WallCategory,
    type: "image" as const,
    src: `${WALL_PROXY}/${file}`,
  })),
];

const gradients: Wallpaper[] = [
  ["Negro morado profundo", "radial-gradient(130% 120% at 78% 8%, #2a1140 0%, #150a22 32%, #07050b 62%, #010102 100%)"],
  ["Grafito", "radial-gradient(120% 120% at 12% 0%, #2b2b33 0%, #121216 45%, #050506 100%)"],
  ["Ultravioleta", "radial-gradient(110% 110% at 85% 10%, #7c3aed 0%, #2a0f4d 42%, #05040a 100%)"],
  ["Magenta frío", "radial-gradient(90% 90% at 70% 20%, #e879f9 0%, #4c1d95 45%, #08060f 100%)"],
  ["Cian profundo", "radial-gradient(100% 100% at 20% 80%, #06b6d4 0%, #0e2a3d 40%, #04060a 100%)"],
  ["Carbón morado", "linear-gradient(135deg, #0b0713 0%, #241040 50%, #060409 100%)"],
  ["Neón doble", "conic-gradient(from 210deg at 70% 30%, #7c3aed, #06b6d4, #0b0713, #7c3aed)"],
  ["Atardecer", "linear-gradient(180deg, #f97316 0%, #7c2d12 35%, #180a10 70%, #050306 100%)"],
  ["Hielo", "radial-gradient(120% 100% at 50% 0%, #cbd5e1 0%, #1e293b 45%, #05070c 100%)"],
  ["Oro viejo", "radial-gradient(110% 110% at 80% 85%, #f59e0b 0%, #3b2506 40%, #060503 100%)"],
  ["Vacío", "radial-gradient(100% 100% at 50% 50%, #14141a 0%, #09090c 55%, #000 100%)"],
].map(([name, css], i) => ({
  id: `grad-${i}`,
  name,
  category: "gradientes" as WallCategory,
  type: "gradient" as const,
  src: css,
}));

export const WALLPAPERS: Wallpaper[] = [...liveWalls, ...generated, ...cineos, ...gradients];

/** CineOS shipped with the "Snake Skeleton" loop as its factory background. */
export const ORIGINAL_WALLPAPER: Wallpaper = {
  id: "cineos-default",
  name: "Snake Skeleton (original)",
  category: "cineos",
  type: "video",
  src: `${WALL_PROXY}/default.mp4`,
};

export const DEFAULT_WALLPAPER: Wallpaper =
  WALLPAPERS.find((w) => w.id === "aura-tokyo") ??
  WALLPAPERS.find((w) => w.id === "live-aurora") ??
  WALLPAPERS[0];

/* ------------------------------------------------------------------ *
 * Aura accents — the whole shell reads --d-accent, so one tap repaints
 * every glow, ring and gradient in the OS.
 * ------------------------------------------------------------------ */

export type AccentId = "violeta" | "cian" | "rosa" | "esmeralda" | "ambar";

export interface Accent {
  id: AccentId;
  name: string;
  hex: string;
  soft: string;
  glow: string;
}

export const ACCENTS: Accent[] = [
  { id: "violeta", name: "Violeta OD", hex: "#a855f7", soft: "rgba(168, 85, 247, 0.18)", glow: "rgba(168, 85, 247, 0.55)" },
  { id: "cian", name: "Cian neón", hex: "#22d3ee", soft: "rgba(34, 211, 238, 0.18)", glow: "rgba(34, 211, 238, 0.5)" },
  { id: "rosa", name: "Rosa plasma", hex: "#f472b6", soft: "rgba(244, 114, 182, 0.18)", glow: "rgba(244, 114, 182, 0.5)" },
  { id: "esmeralda", name: "Verde reactor", hex: "#34d399", soft: "rgba(52, 211, 153, 0.18)", glow: "rgba(52, 211, 153, 0.5)" },
  { id: "ambar", name: "Ámbar Tokyo", hex: "#fbbf24", soft: "rgba(251, 191, 36, 0.18)", glow: "rgba(251, 191, 36, 0.5)" },
];

export function accentById(id: AccentId | undefined): Accent {
  return ACCENTS.find((accent) => accent.id === id) ?? ACCENTS[0];
}

export function wallpaperById(id: string | undefined): Wallpaper {
  if (!id) return DEFAULT_WALLPAPER;
  if (id === ORIGINAL_WALLPAPER.id) return ORIGINAL_WALLPAPER;
  return WALLPAPERS.find((w) => w.id === id) ?? DEFAULT_WALLPAPER;
}

/* ------------------------------------------------------------------ *
 * Links (every entry returned 200 when checked)
 * ------------------------------------------------------------------ */

export interface LinkItem {
  name: string;
  url: string;
  note?: string;
}

export interface LinkGroup {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  items: LinkItem[];
}

export const GHOSTCLOUD_GROUP: LinkGroup = {
  id: "ghostcloud",
  title: "GhostCloud",
  subtitle: "Main links verificados · HTTP 200",
  accent: "#38bdf8",
  items: [
    { name: "GhostCloud Main Link", url: "https://ghost-mathmulti.zeoghost.workers.dev", note: "El principal" },
    { name: "Cineby", url: "https://cineby.tech", note: "Películas y series" },
    { name: "Solidarity Safaris", url: "https://animals.solidaritysafaris.com/start", note: "Proxy de arranque" },
    { name: "Cinera", url: "https://cinera.cfd", note: "Streaming alternativo" },
  ],
};

export const LINK_GROUPS: LinkGroup[] = [
  GHOSTCLOUD_GROUP,
  {
    id: "wolfunblock",
    title: "WolfUnblock",
    subtitle: "sites.google.com/view/wolfunblock · todas las secciones",
    accent: "#22c55e",
    items: [
      { name: "Home", url: "https://sites.google.com/view/wolfunblock/home" },
      { name: "Unblocker Archive", url: "https://sites.google.com/view/wolfunblock/unblocker-archive", note: "Archivo completo" },
      { name: "Website Unblockers", url: "https://sites.google.com/view/wolfunblock/website-unblockers", note: "Proxies web" },
      { name: "YouTube Unblockers", url: "https://sites.google.com/view/wolfunblock/youtube-unblockers" },
      { name: "Games", url: "https://sites.google.com/view/wolfunblock/games", note: "Juegos sin bloqueo" },
      { name: "Other", url: "https://sites.google.com/view/wolfunblock/other" },
      { name: "WolfUnblock Chat", url: "https://sites.google.com/view/wolfunblock/wolfunblock-chat" },
      { name: "300 Abyss", url: "https://sites.google.com/view/wolfunblock/unblocker-archive/300-abyss" },
      { name: "300 Math Is Fun", url: "https://sites.google.com/view/wolfunblock/unblocker-archive/200-math-is-fun" },
      { name: "300 Interstellar", url: "https://sites.google.com/view/wolfunblock/unblocker-archive/200-interstellar" },
      { name: "Titanium Network", url: "https://sites.google.com/view/wolfunblock/unblocker-archive/titanium-network-unblockers" },
      { name: "SchoolNet Proxy DB", url: "https://sites.google.com/view/wolfunblock/unblocker-archive/schoolnet-proxy-database" },
    ],
  },
  {
    id: "proxies",
    title: "Proxies y unblockers",
    subtitle: "Enlaces externos del archivo WolfUnblock",
    accent: "#a855f7",
    items: [
      { name: "Choilieng", url: "https://choilieng.com/", note: "Game archive" },
      { name: "Doodoo", url: "https://doodoo.love/" },
      { name: "SCP Wolf", url: "https://scpwolf.appnaz.com/" },
      { name: "Zhicheng Wei", url: "https://my-home-page.zhichengwei06.repl.co/index.html" },
      { name: "Andre Holman", url: "http://andreholman.com" },
    ],
  },
  {
    id: "cine",
    title: "Cine y anime",
    subtitle: "Los destinos que usaba CineOS",
    accent: "#e11d48",
    items: [
      { name: "Streamex", url: "http://streamex.sh", note: "App Cine original" },
      { name: "Senshi", url: "https://senshi.live", note: "App Crunchyroll original" },
      { name: "Cineby", url: "https://cineby.tech" },
      { name: "Cinera", url: "https://cinera.cfd" },
      { name: "Pluto TV", url: "https://pluto.tv/" },
      { name: "Tubi", url: "https://tubitv.com/" },
    ],
  },
  {
    id: "community",
    title: "Comunidad",
    subtitle: "Discord y canales de WolfUnblock",
    accent: "#5865f2",
    items: [
      { name: "Discord CineOS", url: "https://discord.gg/YE6ZrFC6y", note: "Invitación original de CineOS" },
      { name: "Discord WolfUnblock", url: "https://discord.gg/KcdS8NjrZ4" },
      { name: "Discord WolfUnblock 2", url: "https://discord.gg/gnRjQSf89Y" },
      { name: "r/SCPWolf", url: "https://www.reddit.com/r/SCPWolf/" },
      { name: "SCPWolf en YouTube", url: "https://www.youtube.com/c/SCPWolf" },
    ],
  },
];

export function allLinks(): LinkItem[] {
  const seen = new Set<string>();
  const out: LinkItem[] = [];
  for (const group of LINK_GROUPS) {
    for (const item of group.items) {
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      out.push(item);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Misc
 * ------------------------------------------------------------------ */

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function proxyUrl(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}
