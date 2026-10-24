"use client";
import React from 'react';

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACCENTS,
  APPS,
  THEMES,
  WALLPAPERS,
  type OSApp,
  type Wallpaper,
} from "@/lib/os/data";
import type { OSSettings } from "./SettingsApp";
import { IconBolt, IconChevron } from "../icons";

interface CiriConsoleProps {
  settings: OSSettings;
  onChange: (patch: Partial<OSSettings>) => void;
  user: string;
  onSetUser: (name: string) => void;
  onOpenApp: (appId: string) => void;
  onCloseApp: (appId: string) => void;
  onApplyWallpaper: (wallpaper: Wallpaper) => void;
  onOpenProxy: (url: string) => void;
  onOpenStudio: () => void;
  onLock: () => void;
  onRestart: () => void;
  onShutdown: () => void;
  onSignOut: () => void;
  onAddToDesktop: (appId: string) => void;
  onRemoveFromDesktop: (appId: string) => void;
  onToast: (title: string, body: string) => void;
  onApplyCss: (css: string) => void;
  onResetStyle: () => void;
}

interface Line {
  id: number;
  role: "sys" | "you" | "bot";
  text: string;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

function findApp(query: string): OSApp | undefined {
  const q = normalize(query);
  if (!q) return undefined;
  return (
    APPS.find((app) => normalize(app.name) === q) ??
    APPS.find((app) => normalize(app.name).startsWith(q)) ??
    APPS.find((app) => normalize(app.name).includes(q) || normalize(app.sub).includes(q))
  );
}

const strip = (text: string, prefixes: string[]) => {
  const t = normalize(text);
  for (const prefix of prefixes) {
    if (t.startsWith(prefix)) return text.slice(prefix.length).trim();
  }
  return text;
};

const SUGGESTIONS = [
  "abrir youtube",
  "pon el tema gamer",
  "fondo galaxia",
  "busca minecraft",
  "sube el brillo",
  "¿qué puedes hacer?",
];

const param = (properties: Record<string, unknown>, required: string[]) => ({
  type: "object",
  properties,
  required,
});

const fn = (name: string, description: string, parameters: Record<string, unknown>) => ({
  type: "function",
  function: { name, description, parameters },
});

const stringParam = (description: string) => ({ type: "string", description });
const numberParam = (description: string) => ({ type: "number", description });

/**
 * The tools Dounia AI can call to actually change the system. These are the
 * safe, reversible actions available to the model; the model decides which one
 * to call and the client executes it locally.
 */
const SYSTEM_TOOLS = [
  fn("open_app", "Abre una aplicación del sistema por su nombre.", param({ app: stringParam("Nombre de la app, p.ej. youtube, calculadora, juegos, astra") }, ["app"])),
  fn("close_app", "Cierra una aplicación abierta.", param({ app: stringParam("Nombre de la app") }, ["app"])),
  fn("list_apps", "Devuelve los nombres de todas las apps disponibles.", param({}, [])),
  fn("set_theme", "Cambia el tema/estilo del escritorio.", param({ theme: stringParam("windows11, macos, linux o gamer") }, ["theme"])),
  fn("set_accent", "Cambia el color de acento de todo el sistema.", param({ color: stringParam("Nombre del color: violeta, cian, rosa, esmeralda o ambar") }, ["color"])),
  fn("set_wallpaper", "Cambia el fondo de pantalla.", param({ query: stringParam("Tema del fondo: galaxia, neón, gaming, anime, cine, paisaje…") }, ["query"])),
  fn("set_brightness", "Ajusta el brillo de la pantalla (0-100).", param({ level: numberParam("Nivel de 0 a 100") }, ["level"])),
  fn("set_volume", "Ajusta el volumen (0-100).", param({ level: numberParam("Nivel de 0 a 100") }, ["level"])),
  fn("toggle_setting", "Activa o desactiva un ajuste del sistema.", param({ setting: stringParam("widgets, aura, sonido, cursor, wifi, bluetooth, etiquetas, dnd"), enabled: { type: "boolean", description: "true para activar, false para desactivar" } }, ["setting", "enabled"])),
  fn("search_web", "Busca algo en internet y lo abre por el proxy.", param({ query: stringParam("Texto a buscar") }, ["query"])),
  fn("add_to_desktop", "Añade una app al escritorio.", param({ app: stringParam("Nombre de la app") }, ["app"])),
  fn("remove_from_desktop", "Quita una app del escritorio.", param({ app: stringParam("Nombre de la app") }, ["app"])),
  fn("set_user_name", "Cambia tu nombre de usuario.", param({ name: stringParam("Nuevo nombre") }, ["name"])),
  fn("apply_css", "Aplica CSS personalizado para reestilizar la interfaz al instante (solo CSS válido, sin JavaScript).", param({ css: stringParam("Bloque de CSS a aplicar") }, ["css"])),
  fn("reset_style", "Restablece el estilo CSS personalizado.", param({}, [])),
  fn("lock_screen", "Bloquea la pantalla.", param({}, [])),
  fn("restart", "Reinicia Dounia OS.", param({}, [])),
  fn("shutdown", "Apaga Dounia OS.", param({}, [])),
  fn("sign_out", "Cierra la sesión del usuario.", param({}, [])),
];

/**
 * Dounia AI — the in-system assistant. It runs locally and executes real
 * desktop actions: opens/closes apps, changes wallpapers, themes and accents,
 * toggles settings, locks/restarts/shuts down and searches through the proxy.
 */
export function CiriConsole({
  settings,
  onChange,
  user,
  onSetUser,
  onOpenApp,
  onCloseApp,
  onApplyWallpaper,
  onOpenProxy,
  onOpenStudio,
  onLock,
  onRestart,
  onShutdown,
  onSignOut,
  onAddToDesktop,
  onRemoveFromDesktop,
  onToast,
  onApplyCss,
  onResetStyle,
}: CiriConsoleProps) {
  const [lines, setLines] = useState<Line[]>([
    {
      id: 0,
      role: "bot",
      text: `Hola ${user}, soy Dounia AI 🤖. Pídeme lo que quieras: abrir apps, cambiar el fondo, el tema o los colores, buscar en internet, ajustar el sistema… Escribe «ayuda» para ver todo lo que sé hacer.`,
    },
  ]);
  const [value, setValue] = useState("");
  const [typing, setTyping] = useState(false);
  const idRef = useRef(1);
  const logRef = useRef<HTMLDivElement | null>(null);

  const push = useCallback((role: Line["role"], text: string) => {
    setLines((previous) => [...previous, { id: idRef.current++, role, text }]);
  }, []);

  /** Execute one tool call locally and return a short result for the model. */
  const executeTool = useCallback(
    (name: string, args: Record<string, unknown>): string => {
      const str = (value: unknown) => (typeof value === "string" ? value : "");
      const num = (value: unknown, fallback: number) => {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
      };
      const appArg = str(args.app ?? args.name ?? args.id);

      switch (name) {
        case "open_app": {
          const app = findApp(appArg);
          if (!app) return `No encontré la app «${appArg}».`;
          onOpenApp(app.id);
          return `App «${app.name}» abierta.`;
        }
        case "close_app": {
          const app = findApp(appArg);
          if (!app) return `No encontré la app «${appArg}».`;
          onCloseApp(app.id);
          return `App «${app.name}» cerrada.`;
        }
        case "list_apps":
          return APPS.map((app) => app.name).join(", ");
        case "set_theme": {
          const term = normalize(str(args.theme ?? args.id));
          const theme = THEMES.find(
            (item) => normalize(item.name).includes(term) || normalize(item.id).includes(term),
          );
          if (!theme) return `Tema no encontrado. Disponibles: ${THEMES.map((t) => t.name).join(", ")}.`;
          onChange({ theme: theme.id });
          return `Tema «${theme.name}» aplicado.`;
        }
        case "set_accent": {
          const term = normalize(str(args.color ?? args.accent));
          const accent = ACCENTS.find(
            (item) => normalize(item.name).includes(term) || item.id === term,
          );
          if (!accent) return `Color no encontrado. Disponibles: ${ACCENTS.map((a) => a.name).join(", ")}.`;
          onChange({ accent: accent.id });
          return `Color «${accent.name}» aplicado.`;
        }
        case "set_wallpaper": {
          const term = normalize(str(args.query ?? args.name));
          const wallpaper = WALLPAPERS.find(
            (item) => normalize(item.name).includes(term) || normalize(item.category).includes(term),
          );
          if (!wallpaper) return `No hay un fondo que coincida con «${term}».`;
          onApplyWallpaper(wallpaper);
          return `Fondo «${wallpaper.name}» aplicado.`;
        }
        case "set_brightness": {
          const level = Math.max(0, Math.min(100, Math.round(num(args.level, 100))));
          onChange({ brightness: level });
          return `Brillo al ${level}%.`;
        }
        case "set_volume": {
          const level = Math.max(0, Math.min(100, Math.round(num(args.level, 70))));
          onChange({ volume: level });
          return `Volumen al ${level}%.`;
        }
        case "toggle_setting": {
          const setting = normalize(str(args.setting));
          const enabled = args.enabled !== false;
          const map: Record<string, keyof OSSettings> = {
            widgets: "widgets",
            widget: "widgets",
            aura: "aura",
            sonido: "sounds",
            sounds: "sounds",
            cursor: "cursor",
            wifi: "wifi",
            bluetooth: "bluetooth",
            etiquetas: "showLabels",
            labels: "showLabels",
            dnd: "dnd",
            "no molestar": "dnd",
          };
          const key = map[setting];
          if (!key) return `No conozco el ajuste «${setting}». Prueba: widgets, aura, sonido, cursor, wifi, bluetooth, etiquetas.`;
          onChange({ [key]: enabled } as Partial<OSSettings>);
          return `Ajuste «${setting}» ${enabled ? "activado" : "desactivado"}.`;
        }
        case "search_web": {
          const q = str(args.query);
          if (!q) return "Dime qué quieres buscar.";
          onOpenProxy(`https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`);
          return `Búsqueda «${q}» abierta por el proxy.`;
        }
        case "add_to_desktop": {
          const app = findApp(appArg);
          if (!app) return `No encontré la app «${appArg}».`;
          onAddToDesktop(app.id);
          return `${app.name} añadida al escritorio.`;
        }
        case "remove_from_desktop": {
          const app = findApp(appArg);
          if (!app) return `No encontré la app «${appArg}».`;
          onRemoveFromDesktop(app.id);
          return `${app.name} quitada del escritorio.`;
        }
        case "set_user_name": {
          const name = str(args.name).trim();
          if (!name) return "Dime el nombre.";
          onSetUser(name.charAt(0).toUpperCase() + name.slice(1));
          return `Te llamaré ${name}.`;
        }
        case "apply_css": {
          const css = str(args.css).trim();
          if (!css) return "CSS vacío.";
          onApplyCss(css);
          return "Estilo aplicado a la interfaz.";
        }
        case "reset_style": {
          onResetStyle();
          return "Estilo personalizado restablecido.";
        }
        case "lock_screen":
          onLock();
          return "Pantalla bloqueada.";
        case "restart":
          onRestart();
          return "Reiniciando el sistema.";
        case "shutdown":
          onShutdown();
          return "Apagando el sistema.";
        case "sign_out":
          onSignOut();
          return "Cerrando sesión.";
        default:
          return `Herramienta desconocida: ${name}.`;
      }
    },
    [
      onAddToDesktop,
      onApplyCss,
      onApplyWallpaper,
      onChange,
      onCloseApp,
      onLock,
      onOpenApp,
      onOpenProxy,
      onRemoveFromDesktop,
      onResetStyle,
      onRestart,
      onSetUser,
      onShutdown,
      onSignOut,
    ],
  );

  /**
   * Ask DeepSeek with tool calling: the model decides which tool to call, the
   * client executes it and feeds the result back until it produces a final
   * answer. No key → helpful fallback.
   */
  const askAI = useCallback(
    async (raw: string): Promise<void> => {
      setTyping(true);
      const history = lines
        .filter((line) => line.role === "you" || line.role === "bot")
        .slice(-8)
        .map((line) => ({ role: line.role === "you" ? "user" : "assistant", content: line.text }));

      const messages: Array<Record<string, unknown>> = [
        ...history,
        { role: "user", content: raw },
      ];

      const botId = idRef.current++;
      setLines((previous) => [...previous, { id: botId, role: "bot", text: "" }]);

      try {
        let finalText = "";
        for (let round = 0; round < 5; round += 1) {
          const response = await fetch("/api/ai", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ messages, tools: SYSTEM_TOOLS }),
          });
          const data = (await response.json().catch(() => ({}))) as {
            configured?: boolean;
            error?: string;
            detail?: string;
            reply?: string;
            toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
          };

          if (data.configured === false) {
            finalText =
              "Todavía no tengo conectado el modelo de lenguaje real. Añade tu clave en el archivo .env (DEEPSEEK_API_KEY) y podré razonar y ejecutar cambios por ti. 🙌";
            break;
          }
          if (data.error) throw new Error(data.error);

          if (data.toolCalls && data.toolCalls.length > 0) {
            messages.push({
              role: "assistant",
              content: null,
              tool_calls: data.toolCalls.map((call) => ({
                id: call.id,
                type: "function",
                function: { name: call.name, arguments: JSON.stringify(call.arguments ?? {}) },
              })),
            });
            for (const call of data.toolCalls) {
              const result = executeTool(call.name, call.arguments ?? {});
              messages.push({ role: "tool", tool_call_id: call.id, content: result });
            }
            continue;
          }

          finalText = data.reply ?? "";
          break;
        }

        const display = finalText.trim() || "…";
        setLines((previous) =>
          previous.map((line) => (line.id === botId ? { ...line, text: display } : line)),
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "No pude conectar con el modelo ahora mismo.";
        setLines((previous) =>
          previous.map((line) =>
            line.id === botId ? { ...line, text: `No pude conectar con el modelo: ${message}` } : line,
          ),
        );
      } finally {
        setTyping(false);
      }
    },
    [executeTool, lines],
  );

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [lines, typing]);

  const run = useCallback(
    (raw: string) => {
      const input = raw.trim();
      if (!input || typing) return;
      push("you", input);
      setTyping(true);

      const text = normalize(input);
      const delay = 420 + Math.min(520, text.length * 8);

      window.setTimeout(() => {
        setTyping(false);
        const [head, ...rest] = input.split(/\s+/);
        const command = normalize(head);
        const argument = rest.join(" ").trim();

        // Greetings
        if (/^(hola|hey|buenas|saludos|hi|hello)$/.test(text) || text.startsWith("hola ")) {
          push("bot", `¡Hola! Dime qué quieres que haga. Por ejemplo: «abrir youtube», «fondo galaxia» o «pon el tema gamer».`);
          return;
        }

        if (/^(ayuda|help|que puedes hacer|qué puedes hacer|comandos|ayudame|ayúdame)$/.test(text) || text.includes("que puedes hacer")) {
          push(
            "bot",
            "Puedo hacer de todo en Dounia OS:\n• abrir <app> / cerrar <app>\n• fondo <nombre> / cambiar el fondo\n• tema <nombre> · acento <color>\n• buscar <texto>\n• añadir <app> al escritorio / quitar <app>\n• activar o desactivar widgets, aura, sonidos…\n• subir/bajar brillo o volumen\n• bloquear · reiniciar · apagar · cerrar sesión\n• llámame <nombre> · ¿quién eres? · chiste",
          );
          return;
        }

        if (/^(quien eres|quién eres|quien sos|que eres)$/.test(text)) {
          push("bot", "Soy Dounia AI, el asistente de Dounia OS. Vivo dentro de este sistema y ejecuto cambios reales en el escritorio: fondos, temas, apps, ajustes y búsquedas. Sin nube ni claves: todo pasa aquí mismo.");
          return;
        }

        if (/^(chiste|joke|broma)$/.test(text) || text.startsWith("cuentame un chiste")) {
          const jokes = [
            "¿Por qué los programadores confunden Halloween y Navidad? Porque OCT 31 = DEC 25. 🎃",
            "Hay 10 tipos de personas: las que entienden binario y las que no.",
            "Mi router y yo tenemos una relación estable: siempre hay buena conexión.",
          ];
          push("bot", jokes[Math.floor(Math.random() * jokes.length)]);
          return;
        }

        if (/^(hora|time|fecha|date)$/.test(text)) {
          push(
            "bot",
            `Son las ${new Date().toLocaleTimeString("es-ES")} del ${new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}.`,
          );
          return;
        }

        // Power actions
        if (/^(apaga|apagar|shutdown|poweroff)$/.test(text) || text.includes("apaga el sistema")) {
          push("bot", "Apagando Dounia OS… ¡hasta luego! 👋");
          onShutdown();
          return;
        }
        if (/^(reinicia|reiniciar|restart|reboot)$/.test(text) || text.includes("reinicia el sistema")) {
          push("bot", "Reiniciando el sistema…");
          onRestart();
          return;
        }
        if (text.includes("cerrar sesion") || text.includes("cerrar sesión") || /^sign.?out$/.test(text)) {
          push("bot", "Cerrando tu sesión. Vuelve a entrar cuando quieras.");
          onSignOut();
          return;
        }
        if (/^(bloquea|bloquear|lock)$/.test(text) || text.includes("bloquea la pantalla")) {
          push("bot", "Pantalla bloqueada. 🔒");
          onLock();
          return;
        }

        // Rename user
        if (/^llamame|llámame|mi nombre es|renombrame/.test(text)) {
          const name = strip(text, ["llamame", "llámame", "mi nombre es", "renombrame"]).trim();
          if (!name) {
            push("bot", "Dime el nombre, por ejemplo «llámame Alex».");
          } else {
            onSetUser(name.charAt(0).toUpperCase() + name.slice(1));
            push("bot", `Hecho, a partir de ahora te llamaré ${name}. ✨`);
          }
          return;
        }

        // Open / close apps
        if (/^(abrir|abre|open|lanza|lanzar|ejecuta)$/.test(command)) {
          const app = findApp(argument);
          if (!app) {
            push("bot", `No encuentro «${argument}». Escribe «apps» para ver la lista completa.`);
            return;
          }
          onOpenApp(app.id);
          push("bot", `Abriendo ${app.name}. ✅`);
          return;
        }
        if (/^(cierra|cerrar|close|kill)$/.test(command)) {
          const app = findApp(argument);
          if (!app) {
            push("bot", `No encuentro «${argument}». Dime el nombre exacto de la app.`);
            return;
          }
          onCloseApp(app.id);
          push("bot", `Cerrando ${app.name}.`);
          return;
        }
        if (/^(apps|aplicaciones|lista)$/.test(text)) {
          push("bot", APPS.map((app) => app.name).join(" · "));
          return;
        }

        // Wallpaper
        if (/^(fondo|fondos|wallpaper|wallpapers)$/.test(command) && !argument) {
          onOpenStudio();
          push("bot", "Estudio de fondos abierto: elige, marca favoritos y aplica al escritorio o al bloqueo.");
          return;
        }
        if (command === "fondo" || command === "wallpaper" || text.startsWith("pon el fondo") || text.startsWith("cambia el fondo") || text.startsWith("cambiar fondo")) {
          const term = normalize(strip(text, ["fondo", "wallpaper", "pon el fondo", "cambia el fondo", "cambiar fondo", "pon fondo", "poner fondo"]));
          const wallpaper =
            WALLPAPERS.find((item) => normalize(item.name) === term) ??
            WALLPAPERS.find((item) => normalize(item.name).includes(term) || normalize(item.category).includes(term));
          if (!wallpaper) {
            push("bot", `No hay ningún fondo que coincida con «${argument || term}». Prueba «fondos» para verlos.`);
            return;
          }
          onApplyWallpaper(wallpaper);
          push("bot", `Fondo «${wallpaper.name}» aplicado y guardado. 🎨`);
          return;
        }

        // Theme
        if (text.startsWith("tema ") || text.startsWith("pon el tema ") || text.startsWith("cambia el tema ") || text.startsWith("cambiar tema")) {
          const term = normalize(strip(text, ["tema", "pon el tema", "cambia el tema", "cambiar tema", "estilo"]));
          const theme = THEMES.find((item) => normalize(item.name).includes(term) || normalize(item.id).includes(term));
          if (!theme) {
            push("bot", `Temas disponibles: ${THEMES.map((t) => t.name).join(", ")}.`);
            return;
          }
          onChange({ theme: theme.id });
          push("bot", `Estilo «${theme.name}» aplicado. ${theme.desc}`);
          return;
        }

        // Accent
        if (text.startsWith("acento ") || text.startsWith("color ") || text.startsWith("pon el color ") || text.startsWith("cambia el color")) {
          const term = normalize(strip(text, ["acento", "color", "pon el color", "cambia el color", "cambiar color"]));
          const accent = ACCENTS.find((item) => normalize(item.name).includes(term));
          if (!accent) {
            push("bot", `Colores disponibles: ${ACCENTS.map((a) => a.name).join(", ")}.`);
            return;
          }
          onChange({ accent: accent.id });
          push("bot", `Acento «${accent.name}» aplicado a todo el sistema. 🎨`);
          return;
        }

        // Search via proxy
        if (/^(busca|buscar|search|google|consulta)$/.test(command) || text.startsWith("busca ")) {
          const q = strip(text, ["busca", "buscar", "search", "google", "consulta"]).trim();
          if (!q) {
            push("bot", "Dime qué quieres buscar: «busca noticias de cine».");
            return;
          }
          onOpenProxy(`https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`);
          push("bot", `Buscando «${q}» a través del proxy. 🔍`);
          return;
        }

        // Add / remove from desktop
        if (text.startsWith("añade ") || text.startsWith("agrega ") || text.startsWith("pon ") && text.includes(" en el escritorio")) {
          const q = normalize(strip(text, ["añade", "agrega", "pon", "añadir", "agregar"]).replace(/ en el escritorio/g, ""));
          const app = findApp(q);
          if (!app) {
            push("bot", `No encuentro «${q}». Escribe «apps» para ver la lista.`);
            return;
          }
          onAddToDesktop(app.id);
          push("bot", `${app.name} añadida al escritorio.`);
          return;
        }
        if (text.startsWith("quita ") || text.startsWith("saca ") || text.startsWith("elimina ")) {
          const q = normalize(strip(text, ["quita", "saca", "elimina", "quitar", "sacar", "eliminar"]).replace(/ del escritorio/g, ""));
          const app = findApp(q);
          if (!app) {
            push("bot", `No encuentro «${q}».`);
            return;
          }
          onRemoveFromDesktop(app.id);
          push("bot", `${app.name} quitada del escritorio (sigue en el cajón de apps).`);
          return;
        }

        // Toggles and sliders
        if (text.includes("activa") || text.includes("desactiva") || text.includes("enciende") || text.includes("apaga el") || text.includes("sube") || text.includes("baja")) {
          const on = /activa|enciende|sube/.test(text);
          const off = /desactiva|apaga el|baja/.test(text);
          const target = text;

          if (target.includes("widget") || target.includes("widgets")) {
            onChange({ widgets: on });
            push("bot", `Widgets ${on ? "activados" : "desactivados"}.`);
            return;
          }
          if (target.includes("aura") || target.includes("fondo animado")) {
            onChange({ aura: on });
            push("bot", `Efectos del escritorio ${on ? "activados" : "desactivados"}.`);
            return;
          }
          if (target.includes("sonido") || target.includes("sonidos")) {
            onChange({ sounds: on });
            push("bot", `Sonidos ${on ? "activados" : "desactivados"}.`);
            return;
          }
          if (target.includes("cursor")) {
            onChange({ cursor: on });
            push("bot", `Cursor personalizado ${on ? "activado" : "desactivado"}.`);
            return;
          }
          if (target.includes("nombres") || target.includes("etiquetas")) {
            onChange({ showLabels: on });
            push("bot", `Nombres de iconos ${on ? "visibles" : "ocultos"}.`);
            return;
          }
          if (target.includes("brillo")) {
            const next = Math.max(0, Math.min(100, (settings.brightness ?? 100) + (on ? 15 : -15)));
            onChange({ brightness: next });
            push("bot", `Brillo al ${next}%.`);
            return;
          }
          if (target.includes("volumen")) {
            const next = Math.max(0, Math.min(100, (settings.volume ?? 70) + (on ? 15 : -15)));
            onChange({ volume: next });
            push("bot", `Volumen al ${next}%.`);
            return;
          }
          if (target.includes("wifi")) {
            onChange({ wifi: on });
            push("bot", `WiFi ${on ? "activado" : "desactivado"}.`);
            return;
          }
          if (target.includes("bluetooth")) {
            onChange({ bluetooth: on });
            push("bot", `Bluetooth ${on ? "activado" : "desactivado"}.`);
            return;
          }
          if (target.includes("no molestar") || target.includes("dnd")) {
            onChange({ dnd: on || !off });
            push("bot", `Modo no molestar ${on || !off ? "activado" : "desactivado"}.`);
            return;
          }
          // fallthrough
        }

        // Fallback: treat as app name.
        const app = findApp(text);
        if (app) {
          onOpenApp(app.id);
          push("bot", `Abriendo ${app.name}. ✅`);
          return;
        }

        // Anything else goes to the real DeepSeek model for free-form chat.
        void askAI(input);
      }, delay);
    },
    [askAI, onAddToDesktop, onApplyWallpaper, onChange, onCloseApp, onLock, onOpenApp, onOpenProxy, onOpenStudio, onRemoveFromDesktop, onRestart, onSetUser, onShutdown, onSignOut, push, settings.brightness, settings.volume, typing],
  );

  return (
    <div className="d-ai">
      <div className="d-ai-log" ref={logRef}>
        {lines.map((line) => (
          <div key={line.id} className={`d-ai-msg ${line.role}`}>
            {line.role === "bot" && (
              <span className="d-ai-avatar">
                <IconBolt />
              </span>
            )}
            <span className="d-ai-bubble">{line.text}</span>
          </div>
        ))}
        {typing && (
          <div className="d-ai-msg bot">
            <span className="d-ai-avatar">
              <IconBolt />
            </span>
            <span className="d-ai-bubble typing">
              <i />
              <i />
              <i />
            </span>
          </div>
        )}
      </div>

      <div className="d-ai-suggest">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="d-chip"
            onClick={() => {
              setValue(suggestion);
              run(suggestion);
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className="d-ai-form"
        onSubmit={(event) => {
          event.preventDefault();
          run(value);
          setValue("");
        }}
      >
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={`Pregúntale a Dounia AI…`}
          aria-label="Mensaje para Dounia AI"
          autoFocus
        />
        <button type="submit" className="d-btn primary" disabled={typing}>
          <IconChevron /> Enviar
        </button>
      </form>
    </div>
  );
}
