const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

export interface NativeGameInfo {
  slug: string;
  title: string;
  mode: "unity" | "embed";
  loaderUrl?: string;
  config?: Record<string, unknown>;
  embedUrl: string;
}

const CACHE_TTL = 30 * 60 * 1000;
const cache = new Map<string, { at: number; info: NativeGameInfo }>();

function extractOptions(html: string): Record<string, unknown> | null {
  const start = html.indexOf("var options = ");
  if (start < 0) return null;
  const brace = html.indexOf("{", start);
  if (brace < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = brace; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(brace, index + 1)) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Lee el manifiesto de un juego de CrazyGames y decide cómo reproducirlo. */
export async function readNativeGame(slug: string): Promise<NativeGameInfo> {
  const cached = cache.get(slug);
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.info;

  const embedUrl = `https://www.crazygames.com/embed/${slug}`;
  const response = await fetch(embedUrl, {
    headers: { "user-agent": UA, "accept-language": "es-ES,es;q=0.9,en;q=0.8" },
    signal: AbortSignal.timeout(20_000),
    redirect: "follow",
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`El juego devolvió ${response.status}.`);

  const html = await response.text();
  const options = extractOptions(html);
  const loaderOptions = options?.loaderOptions as
    | { unityLoaderUrl?: string; unityConfigOptions?: Record<string, string> }
    | undefined;
  const title =
    html.match(/<title>([^<]*)</)?.[1]?.replace(/\s*Game Files.*$/i, "") ?? slug;

  const unity =
    loaderOptions?.unityLoaderUrl &&
    loaderOptions.unityConfigOptions?.dataUrl &&
    loaderOptions.unityConfigOptions?.frameworkUrl &&
    loaderOptions.unityConfigOptions?.codeUrl
      ? {
          loaderUrl: loaderOptions.unityLoaderUrl,
          config: {
            ...loaderOptions.unityConfigOptions,
            companyName: "Dounia OS",
            productName: title,
            productVersion: "1.0",
            matchWebGLToCanvasSize: true,
          },
        }
      : null;

  const info: NativeGameInfo = unity
    ? { slug, title, mode: "unity", loaderUrl: unity.loaderUrl, config: unity.config, embedUrl }
    : { slug, title, mode: "embed", embedUrl };

  if (cache.size > 400) cache.clear();
  cache.set(slug, { at: Date.now(), info });
  return info;
}
