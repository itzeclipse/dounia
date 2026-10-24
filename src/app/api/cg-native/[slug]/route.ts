import { NextRequest } from "next/server";
import { readNativeGame } from "@/lib/cg-native";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Página standalone del reproductor nativo de CrazyGames.
 * Para dentro de la consola se usa el componente CrazyNativeGame (sin iframe
 * same-origin, que el CSP del preview bloquea).
 */
function page(title: string, body: string): Response {
  return new Response(
    `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<title>${title}</title>
<style>
  html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#05060a;color:#fff;font-family:system-ui,sans-serif}
  #game{position:fixed;inset:0;width:100%;height:100%;border:0}
  #game canvas,#unity-canvas{width:100%!important;height:100%!important;display:block}
  #load{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:radial-gradient(60% 60% at 50% 45%,rgba(124,58,237,.22),#05060a 75%);z-index:5}
  #load strong{font-size:15px;letter-spacing:.02em}
  #load small{color:rgba(255,255,255,.55);font-size:12px}
  #bar{width:min(320px,70vw);height:6px;border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}
  #bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#8b5cf6,#22d3ee);transition:width .15s}
  #err{max-width:min(560px,86vw);text-align:center;font-size:12px;line-height:1.6;color:#fca5a5;white-space:pre-wrap}
</style>
</head>
<body>
${body}
</body>
</html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  if (!/^[a-z0-9][a-z0-9-]{1,80}$/i.test(slug)) {
    return page("Juego no válido", '<div id="load"><strong>Juego no válido.</strong></div>');
  }

  try {
    const info = await readNativeGame(slug);

    if (info.mode === "embed") {
      return page(
        info.title,
        `<iframe id="game" src="${info.embedUrl}" allow="autoplay; fullscreen; gamepad; clipboard-write; encrypted-media"></iframe>`,
      );
    }

    const body = `
<div id="load">
  <strong id="load-title">${info.title}</strong>
  <small id="load-note">Cargando juego…</small>
  <div id="bar"><i></i></div>
  <div id="err"></div>
</div>
<canvas id="unity-canvas"></canvas>
<script>
  window.CrazyGames = window.CrazyGames || {};
  window.CrazyGames.SDK = window.CrazyGames.SDK || {
    init: function () { return Promise.resolve(); },
    game: {
      gameplayStart: function () {}, gameplayStop: function () {},
      happytime: function () {}, loadingStart: function () {}, loadingStop: function () {},
      inviteLink: function () { return Promise.resolve(null); },
      showInviteButton: function () {}, hideInviteButton: function () {}
    },
    ad: { requestAd: function () { return Promise.resolve(); }, hasAdblock: function () { return Promise.resolve(false); } },
    data: { getItem: function () { return Promise.resolve(null); }, setItem: function () { return Promise.resolve(); } },
    user: { getUser: function () { return Promise.resolve(null); }, isUserAccountAvailable: false }
  };
  (function () {
    var canvas = document.getElementById("unity-canvas");
    var bar = document.querySelector("#bar i");
    var note = document.getElementById("load-note");
    var err = document.getElementById("err");
    var script = document.createElement("script");
    script.src = ${JSON.stringify(info.loaderUrl)};
    script.onload = function () {
      if (typeof createUnityInstance !== "function") {
        err.textContent = "El build de Unity no expuso createUnityInstance.";
        return;
      }
      note.textContent = "Descargando el juego…";
      createUnityInstance(canvas, ${JSON.stringify(info.config)}, function (progress) {
        bar.style.width = Math.max(0, Math.min(100, progress * 100)) + "%";
        note.textContent = "Cargando… " + Math.round(progress * 100) + "%";
      }).then(function () {
        document.getElementById("load").style.display = "none";
      }).catch(function (error) {
        err.textContent = "No se pudo iniciar el juego: " + (error && error.message ? error.message : error);
        note.textContent = "Error";
      });
    };
    script.onerror = function () {
      err.textContent = "No se pudo cargar el loader del juego.";
      note.textContent = "Error";
    };
    document.body.appendChild(script);
  })();
</script>`;

    return page(info.title, body);
  } catch (error) {
    return page(
      "Juego no disponible",
      `<div id="load"><strong>No se pudo abrir el juego: ${
        error instanceof Error ? error.message : "error de red"
      }.</strong></div>`,
    );
  }
}
