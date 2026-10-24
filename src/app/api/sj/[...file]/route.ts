import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sirve los assets de Scramjet V2 directamente desde `node_modules`.
 *
 * Así no hay que copiar bundles ni wasm al proyecto (ni se quedan obsoletos al
 * actualizar el paquete): la ruta los lee del disco y los entrega con el
 * content-type correcto. Solo se exponen archivos de una lista blanca.
 */
const ALLOWED: Record<string, { file: string; type: string }> = {
  "scramjet.js": {
    file: "node_modules/@mercuryworkshop/scramjet/dist/scramjet.js",
    type: "text/javascript; charset=utf-8",
  },
  "scramjet.mjs": {
    file: "node_modules/@mercuryworkshop/scramjet/dist/scramjet.mjs",
    type: "text/javascript; charset=utf-8",
  },
  "scramjet.wasm": {
    file: "node_modules/@mercuryworkshop/scramjet/dist/scramjet.wasm",
    type: "application/wasm",
  },
  "controller.api.js": {
    file: "node_modules/@mercuryworkshop/scramjet-controller/dist/controller.api.js",
    type: "text/javascript; charset=utf-8",
  },
  "controller.inject.js": {
    file: "node_modules/@mercuryworkshop/scramjet-controller/dist/controller.inject.js",
    type: "text/javascript; charset=utf-8",
  },
  "controller.sw.js": {
    file: "node_modules/@mercuryworkshop/scramjet-controller/dist/controller.sw.js",
    type: "text/javascript; charset=utf-8",
  },
  "libcurl-transport.mjs": {
    file: "node_modules/@mercuryworkshop/libcurl-transport/dist/index.mjs",
    type: "text/javascript; charset=utf-8",
  },
  "wisp-client.mjs": {
    file: "node_modules/@mercuryworkshop/wisp-js/dist/wisp-client.mjs",
    type: "text/javascript; charset=utf-8",
  },
  "wisp-full.mjs": {
    file: "node_modules/@mercuryworkshop/wisp-js/dist/wisp-full.mjs",
    type: "text/javascript; charset=utf-8",
  },
};

/** Service worker que monta el controller de Scramjet en el navegador. */
const SERVICE_WORKER = `/* Dounia OS · service worker de Scramjet V2 */
importScripts("/api/sj/controller.sw.js");

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const controller = self.$scramjetController;
  if (!controller) return;
  let route = false;
  try {
    route = controller.shouldRoute(event);
  } catch (error) {
    return;
  }
  if (!route) return;
  event.respondWith(
    controller.route(event).catch(
      (error) => new Response("Scramjet error: " + error.message, { status: 502 }),
    ),
  );
});
`;

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string[] }> },
) {
  const { file } = await context.params;
  const key = file.join("/");

  if (key === "sw.js") {
    return new NextResponse(SERVICE_WORKER, {
      headers: {
        "content-type": "text/javascript; charset=utf-8",
        // Permite registrar este SW con alcance en la raíz de la app.
        "service-worker-allowed": "/",
        "cache-control": "no-store",
      },
    });
  }

  const entry = ALLOWED[key];
  if (!entry) {
    return NextResponse.json({ error: `Asset no permitido: ${key}` }, { status: 404 });
  }

  try {
    const data = await fs.readFile(path.join(process.cwd(), entry.file));
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "content-type": entry.type,
        "cache-control": "public, max-age=300",
        "content-length": String(data.byteLength),
      },
    });
  } catch {
    return NextResponse.json({ error: `No se encontró ${entry.file}` }, { status: 404 });
  }
}
