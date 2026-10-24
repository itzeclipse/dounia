/** Dominio público del proyecto. Se puede sobrescribir en el hosting. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.RENDER_EXTERNAL_URL ??
  "https://douniaos.com"
).replace(/\/+$/, "");
export const SITE_NAME = "DouniaOS";
export const SITE_DESCRIPTION =
  "DouniaOS — un sistema operativo completo en el navegador: escritorio, terminal, archivos, juegos, modos consola, cine y móviles virtuales.";
