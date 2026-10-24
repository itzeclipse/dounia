# Publicar DouniaOS en douniaos.com

El proyecto ya está **brandeado y configurado para `https://douniaos.com`**: metadatos, canonical, Open Graph, `robots.txt` y `sitemap.xml` usan ese dominio (se puede cambiar con `NEXT_PUBLIC_SITE_URL`).

> **Importante y honesto:** `douniaos.com` no resuelve ahora mismo (`ENOTFOUND`), así que está libre o sin DNS. Desde este entorno **no puedo comprar dominios ni cambiar el DNS de tu cuenta**. Hay que registrarlo (Cloudflare, Namecheap, Google/Squarespace Domains…) y luego publicar el proyecto en un host; los pasos están abajo.

## 0. Si quieres que sea 100 % gratis

Un dominio `.com` siempre cuesta dinero y necesita una cuenta tuya. Estas son las alternativas gratis de verdad:

### A. Subdominio de Render (recomendado, 5 minutos)
1. Sube el proyecto a GitHub (gratis).
2. Render → **New → Blueprint** → selecciona el repo (usa `render.yaml`).
3. Al terminar tendrás `https://TU-SERVICIO.onrender.com` gratis, con HTTPS y WebSockets.
4. Si quieres, añade `NEXT_PUBLIC_SITE_URL=https://TU-SERVICIO.onrender.com` para que canonical/OG apunten ahí.

### B. Subdominio gratis `*.is-a.dev`
1. Crea una cuenta de GitHub (gratis).
2. Haz fork de `https://github.com/is-a-dev/register`.
3. Copia `deploy/is-a.dev.example.json` a `domains/douniaos.json` en tu fork.
4. Cambia el usuario y el `CNAME` por tu host real (por ejemplo `TU-SERVICIO.onrender.com`).
5. Abre un Pull Request. Cuando lo aprueben tendrás `https://douniaos.is-a.dev`.

### C. DuckDNS para un VPS
1. Entra en `duckdns.org` con tu cuenta (gratis) y crea `douniaos.duckdns.org`.
2. Apunta la IP del VPS y pon Caddy/Nginx delante para HTTPS.

> La cuenta debe ser tuya: el dominio queda a tu nombre y el servicio pide tu email/GitHub. Yo no puedo crear cuentas ni aceptar términos en tu nombre.

## 1. Registra el dominio

1. Compra `douniaos.com` en un registrador (suele costar ~10–15 €/año).
2. Si quieres, añade también `www.douniaos.com`.
3. No hace falta configurar nada más todavía: el DNS se apunta en el paso 4.

## 2. Publica el proyecto (elige una opción)

### Opción A — IQX Studio

1. Pulsa **Publish / Publicar**.
2. Obtendrás una URL de producción (`*.iqx.dev` o el host que asigne la plataforma).
3. En **Project → Domains**, añade `douniaos.com` y `www.douniaos.com`.
4. Crea los registros DNS que te indique la plataforma (normalmente `A` para el dominio raíz y `CNAME` para `www`).

### Opción B — Render (Docker, sin servidor propio)

1. Sube el proyecto a GitHub.
2. Render → **New → Blueprint** → selecciona el repo (usa `render.yaml`).
3. Añade `DEEPSEEK_API_KEY` en Environment si quieres Dounia AI.
4. En **Settings → Custom Domain** añade `douniaos.com`. Render te dará un `A`/`CNAME`; créalo en tu registrador. HTTPS es automático.

> El plan free duerme el servicio tras un rato sin tráfico. Para un enlace siempre activo, usa Starter o un VPS.

### Opción C — VPS propio (Docker + Caddy)

```bash
git clone <tu-repo> douniaos
cd douniaos
NEXT_PUBLIC_SITE_URL=https://douniaos.com DEEPSEEK_API_KEY=tu_clave docker compose up -d --build
```

Luego, con el DNS de `douniaos.com` y `www` apuntando a la IP del VPS:

```bash
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy pide el certificado TLS solo. Si usas Nginx, hay una configuración con WebSockets en `deploy/nginx.conf`.

## 3. DNS

En tu registrador:

| Tipo | Nombre | Valor |
|---|---|---|
| `A` | `@` | IP del VPS o la que indique el host |
| `CNAME` | `www` | host que te den (Render/IQX) o `douniaos.com` |

Espera la propagación (minutos u horas). Comprueba con:

```bash
dig douniaos.com +short
curl -I https://douniaos.com
```

## 4. Variables de entorno

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Dominio público para metadatos, canonical y sitemap. Por defecto `https://douniaos.com`. |
| `DEEPSEEK_API_KEY` | Dounia AI. Sin ella, el resto del sistema funciona igual. |

## 5. Requisitos del hosting

- **WebSockets y conexiones largas**: Scramjet usa `/wisp/`. Funciona en Render, Railway, Fly, VPS y Docker; **no** en hostings estáticos ni en Vercel serverless.
- **Node 20+** (la imagen usa Node 22).
- Puerto `PORT` (3000 por defecto).
- Healthcheck: `/api/health` → `{"ok":true,"app":"Dounia OS",...}`.

## 6. Verificación

```bash
curl https://douniaos.com/api/health
curl -I https://douniaos.com
curl https://douniaos.com/robots.txt
curl https://douniaos.com/sitemap.xml
```

Y abre `https://douniaos.com/`: escritorio, apps, modos consola/cine/móviles y visores sociales deben cargar igual que en el preview.
