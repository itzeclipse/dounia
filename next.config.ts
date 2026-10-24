import http from "node:http";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import type { NextConfig } from "next";

/* ------------------------------------------------------------------ *
 * Servidor Wisp (transporte real de Scramjet V2)
 *
 * El preview arranca siempre `next dev`, sin custom server, y la
 * instrumentación no se ejecuta en este Next. `next.config.ts` sí se carga
 * en el proceso del servidor al arrancar, así que aquí enganchamos los
 * upgrades de `/wisp/` interceptando `http.Server.prototype.emit`.
 *
 * Resultado: WebSocket Wisp v1/v2 (TCP + UDP) en el mismo puerto y origen
 * que la app, sin procesos extra ni puertos extra.
 * ------------------------------------------------------------------ */

interface WispDiagnostics {
  installed: boolean;
  upgrades: number;
  connections: number;
  lastError: string | null;
}

const globalScope = globalThis as typeof globalThis & {
  __douniaWisp?: WispDiagnostics;
};

function diagnostics(): WispDiagnostics {
  if (!globalScope.__douniaWisp) {
    globalScope.__douniaWisp = { installed: false, upgrades: 0, connections: 0, lastError: null };
  }
  return globalScope.__douniaWisp;
}

async function handleWispUpgrade(
  request: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): Promise<void> {
  const state = diagnostics();
  try {
    const wisp = await import("@mercuryworkshop/wisp-js/server");
    state.connections += 1;
    wisp.server.routeRequest(request, socket, head, {});
  } catch (error) {
    state.lastError = error instanceof Error ? error.message : String(error);
    console.error("[dounia] Wisp no pudo atender el upgrade:", error);
    try {
      socket.destroy();
    } catch {
      /* socket ya cerrado */
    }
  }
}

function installWisp(): void {
  const state = diagnostics();
  if (state.installed) return;
  state.installed = true;

  type EmitArgs = Parameters<typeof http.Server.prototype.emit>;
  const original = http.Server.prototype.emit;

  http.Server.prototype.emit = function patchedEmit(
    this: http.Server,
    event: string | symbol,
    ...args: unknown[]
  ): boolean {
    if (event === "upgrade") {
      const request = args[0] as IncomingMessage | undefined;
      const url = request?.url ?? "";
      if (url === "/wisp" || url.startsWith("/wisp/") || url.startsWith("/wisp?")) {
        state.upgrades += 1;
        void handleWispUpgrade(request as IncomingMessage, args[1] as Duplex, args[2] as Buffer);
        return true; // no dejamos que Next cierre este socket
      }
    }
    return original.apply(this, [event, ...args] as EmitArgs);
  } as typeof http.Server.prototype.emit;

  console.log("[dounia] Wisp instalado en /wisp/ · transporte de Scramjet listo");
}

installWisp();

const nextConfig: NextConfig = {
  devIndicators: false,
  // three / @react-three/* ship untranspiled ESM that Next must transpile, else
  // 3D scenes fail to render. Listing packages a project does not install is a
  // harmless no-op.
  transpilePackages: ["three", "@react-three/fiber", "@react-three/drei"],
  // El servidor Wisp vive en un paquete dual ESM/CJS que debe cargarse tal cual
  // desde el proceso Node, sin bundling de Next.
  serverExternalPackages: ["@mercuryworkshop/wisp-js"],
  // The preview is served from a public host that differs from the in-container
  // dev origin, so Next 16 blocks cross-origin /_next and HMR without this.
  allowedDevOrigins: [
    "*.iqx.dev",
    ...(process.env.IQX_PROJECT_ID || process.env.PROJECT_ID
      ? [
          `https://preview-${process.env.IQX_PROJECT_ID || process.env.PROJECT_ID}-web.iqx.dev`,
          `preview-${process.env.IQX_PROJECT_ID || process.env.PROJECT_ID}-mobile.iqx.dev`,
        ]
      : []),
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
  },
};

export default nextConfig;
