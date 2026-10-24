import { NextRequest } from "next/server";
import { readNativeGame } from "@/lib/cg-native";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  if (!/^[a-z0-9][a-z0-9-]{1,80}$/i.test(slug)) {
    return Response.json({ error: "Juego no válido." }, { status: 400 });
  }

  try {
    const info = await readNativeGame(slug);
    return Response.json(info);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "No se pudo leer el juego." },
      { status: 502 },
    );
  }
}
