import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Endpoint ligero para monitores tipo UptimeRobot.
 * No toca base de datos, proxies ni Scramjet: responde 200 al instante para
 * que un ping periódico pueda mantener despierto el contenedor.
 */
export async function GET() {
  return NextResponse.json(
    { ok: true, app: "Dounia OS", ts: new Date().toISOString() },
    { headers: { "cache-control": "no-store" } },
  );
}

export function HEAD() {
  return new Response(null, {
    status: 200,
    headers: { "cache-control": "no-store" },
  });
}
