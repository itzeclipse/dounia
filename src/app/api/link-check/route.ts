import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIMEOUT_MS = 7_000;
const MAX_URLS = 40;

function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!v4) return false;
  const [a, b] = [Number(v4[1]), Number(v4[2])];
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

async function checkOne(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { url: raw, ok: false, status: 0, error: "URL no válida" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { url: raw, ok: false, status: 0, error: "Protocolo no permitido" };
  }
  if (isBlockedHost(url.hostname)) {
    return { url: raw, ok: false, status: 0, error: "Host privado" };
  }
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        range: "bytes=0-2048",
      },
    });
    return { url: raw, ok: response.status < 400, status: response.status };
  } catch (error) {
    return {
      url: raw,
      ok: false,
      status: 0,
      error: error instanceof Error ? error.name : "Error de red",
    };
  }
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "JSON no válido" }, { status: 400 });
  }

  const urls = (payload as { urls?: unknown })?.urls;
  if (!Array.isArray(urls) || urls.some((u) => typeof u !== "string")) {
    return Response.json({ error: "Envía { urls: string[] }" }, { status: 400 });
  }

  const list = (urls as string[]).slice(0, MAX_URLS);
  const results = await Promise.all(list.map((url) => checkOne(url)));
  return Response.json(
    { checkedAt: new Date().toISOString(), results },
    { headers: { "cache-control": "no-store" } },
  );
}
