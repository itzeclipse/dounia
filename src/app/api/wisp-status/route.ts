import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WispDiagnostics {
  installed: boolean;
  upgrades: number;
  connections: number;
  lastError: string | null;
}

/**
 * Estado del transporte Wisp que Scramjet usa como motor.
 * `installed: true` significa que el servidor enganchó `/wisp/`;
 * `connections` cuenta los WebSocket que sí llegaron a abrirse.
 */
export async function GET() {
  const state = (globalThis as typeof globalThis & { __douniaWisp?: WispDiagnostics })
    .__douniaWisp ?? {
    installed: false,
    upgrades: 0,
    connections: 0,
    lastError: null,
  };

  return NextResponse.json(
    { wisp: state, endpoint: "/wisp/", engine: "scramjet-v2", ready: state.installed },
    { headers: { "cache-control": "no-store" } },
  );
}
