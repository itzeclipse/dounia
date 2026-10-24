import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/**
 * Transporte HTTP del proxy de Dounia OS.
 *
 * Motor principal: `libcurl` (el binario `curl` del sistema, enlazado contra
 * libcurl 8.x). Se usa en lugar de `fetch` porque libcurl negocia HTTP/2,
 * brotli, zstd y TLS propio, sigue redirecciones de forma nativa y respeta
 * `--max-time`, que es lo que hace que el proxy cargue webs que `fetch` deja
 * colgadas.
 *
 * Si `curl` no estuviera disponible, cae automáticamente a `fetch` para que el
 * navegador nunca se quede sin motor.
 */

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const ACCEPT =
  "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";

export type ProxyEngine = "libcurl" | "fetch";

export interface UpstreamResponse {
  ok: boolean;
  status: number;
  /** URL final después de las redirecciones. */
  url: string;
  engine: ProxyEngine;
  headers: { get(name: string): string | null };
  body: ArrayBuffer;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
}

interface CurlRun {
  code: number;
  stdout: string;
  stderr: string;
}

function runCurl(args: string[], hardTimeoutMs: number): Promise<CurlRun> {
  return new Promise((resolve, reject) => {
    const child = spawn("curl", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      const error = new Error("curl agotó el tiempo de espera");
      error.name = "TimeoutError";
      reject(error);
    }, hardTimeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

/** El último bloque de cabeceras es el de la respuesta final. */
function parseHeaderBlocks(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  const blocks = raw.split(/\r?\n\r?\n/).filter((block) => block.trim().length > 0);
  const last = blocks[blocks.length - 1] ?? "";
  for (const line of last.split(/\r?\n/)) {
    const index = line.indexOf(":");
    if (index <= 0) continue;
    const key = line.slice(0, index).trim().toLowerCase();
    if (!key || key.startsWith("http/")) continue;
    const value = line.slice(index + 1).trim();
    const previous = map.get(key);
    map.set(key, previous ? `${previous}, ${value}` : value);
  }
  return map;
}

function toResponse(
  status: number,
  finalUrl: string,
  engine: ProxyEngine,
  headers: Map<string, string>,
  body: Buffer,
): UpstreamResponse {
  const payload = body.buffer.slice(
    body.byteOffset,
    body.byteOffset + body.byteLength,
  ) as ArrayBuffer;

  return {
    ok: status >= 200 && status < 400,
    status,
    url: finalUrl,
    engine,
    headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
    body: payload,
    arrayBuffer: async () => payload,
    text: async () => Buffer.from(payload).toString("utf8"),
  };
}

/** Petición real con libcurl. Lanza si el binario no existe o falla. */
export async function libcurlGet(target: string, timeoutMs: number): Promise<UpstreamResponse> {
  const id = randomUUID();
  const bodyPath = path.join(tmpdir(), `dounia-curl-${id}.body`);
  const headPath = path.join(tmpdir(), `dounia-curl-${id}.head`);

  const args = [
    "--silent",
    "--show-error",
    "--location",
    "--compressed",
    "--http2",
    "--max-redirs",
    "6",
    "--max-time",
    String(Math.max(5, Math.ceil(timeoutMs / 1000))),
    "--connect-timeout",
    "8",
    "--user-agent",
    USER_AGENT,
    "--header",
    `accept: ${ACCEPT}`,
    "--header",
    "accept-language: es-ES,es;q=0.9,en;q=0.8",
    "--header",
    "cache-control: no-cache",
    "--dump-header",
    headPath,
    "--output",
    bodyPath,
    "--write-out",
    "%{http_code}\n%{url_effective}\n%{content_type}",
    target,
  ];

  try {
    const run = await runCurl(args, timeoutMs + 5_000);

    if (run.code === 28) {
      const error = new Error("La web tardó demasiado en responder.");
      error.name = "TimeoutError";
      throw error;
    }
    if (run.code !== 0) {
      throw new Error(run.stderr.trim() || `curl terminó con código ${run.code}`);
    }

    const [statusLine, urlLine, typeLine] = run.stdout.split("\n");
    const status = Number.parseInt(statusLine ?? "0", 10) || 0;
    const finalUrl = (urlLine ?? "").trim() || target;

    const head = await fs.readFile(headPath, "utf8").catch(() => "");
    const body = await fs.readFile(bodyPath).catch(() => Buffer.alloc(0));
    const headers = parseHeaderBlocks(head);
    if (typeLine && !headers.has("content-type")) {
      headers.set("content-type", typeLine.trim());
    }

    return toResponse(status, finalUrl, "libcurl", headers, body);
  } finally {
    void fs.rm(bodyPath, { force: true });
    void fs.rm(headPath, { force: true });
  }
}

/** Respaldo: el `fetch` de Node, por si el sistema no trae curl. */
async function fetchFallback(target: string, timeoutMs: number): Promise<UpstreamResponse> {
  const response = await fetch(target, {
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      "user-agent": USER_AGENT,
      accept: ACCEPT,
      "accept-language": "es-ES,es;q=0.9,en;q=0.8",
      "cache-control": "no-cache",
    },
  });

  const body = Buffer.from(await response.arrayBuffer());
  const headers = new Map<string, string>();
  response.headers.forEach((value, key) => headers.set(key.toLowerCase(), value));

  return toResponse(response.status, response.url || target, "fetch", headers, body);
}

/** Motor del proxy: libcurl primero, fetch como red de seguridad. */
export async function fetchUpstream(target: string, timeoutMs: number): Promise<UpstreamResponse> {
  try {
    return await libcurlGet(target, timeoutMs);
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") throw error;
    return fetchFallback(target, timeoutMs);
  }
}
