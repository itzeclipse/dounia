import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

/**
 * Descarga limpia de la edición OD (archivo único).
 *
 * El HTML vive en public/DOUNIAOD.html y se puede abrir directamente en
 * /DOUNIAOD.html. Esta ruta existe porque el preview añade scripts de
 * terceros al servir HTML: aquí se eliminan y el archivo se entrega como
 * adjunto, para que la copia que guarda el usuario sea realmente autónoma.
 */
export const dynamic = "force-dynamic";

const FILE = path.join(process.cwd(), "public", "DOUNIAOD.html");

const APP_MARKER = /douniaod\.v1|runtime de un solo archivo/i;
const THIRD_PARTY =
  /cloudflareinsights|__CF\$cv\$params|challenge-platform|\/cdn-cgi\//i;

/**
 * Quita bloques <script> de terceros (Cloudflare/beacon) y deja el resto
 * intacto. El script propio de la app nunca se elimina: se reconoce por su
 * marcador, porque su código también menciona esas firmas al limpiar copias.
 */
function stripThirdPartyScripts(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (block) => {
    if (APP_MARKER.test(block)) return block;
    return THIRD_PARTY.test(block) ? "" : block;
  });
}

export async function GET() {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const clean = stripThirdPartyScripts(raw);

    return new NextResponse(clean, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "content-disposition": 'attachment; filename="DOUNIA-OD.html"',
        "content-length": String(Buffer.byteLength(clean, "utf8")),
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "No se encontró public/DOUNIAOD.html" },
      { status: 404 },
    );
  }
}
