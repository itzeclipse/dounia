"use client";
import React from 'react';

import { useCallback, useEffect, useRef, useState } from "react";

import { APPS, THEMES, WALLPAPERS } from "@/lib/os/data";
import {
  HOME,
  fileCount,
  formatBytes,
  getTree,
  isDir,
  join,
  listDir,
  mkdir,
  remove,
  rename,
  resolve,
  totalBytes,
  useFsTree,
  writeFile,
} from "@/lib/os/fs";

export interface TerminalProps {
  onOpenApp: (id: string) => void;
  onOpenUrl: (url: string) => void;
  onToast: (title: string, body: string) => void;
  onTheme: (id: string) => void;
  onWallpaper: (id: string) => void;
  onLock: () => void;
  onClose: () => void;
}

type LineKind = "in" | "out" | "ok" | "err" | "dim";

interface Line {
  id: number;
  kind: LineKind;
  text: string;
}

const START = Date.now();

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input))) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  return tokens;
}

function shortPath(path: string): string {
  if (path === HOME) return "~";
  if (path.startsWith(`${HOME}/`)) return `~${path.slice(HOME.length)}`;
  return path;
}

export function TerminalApp({
  onOpenApp,
  onOpenUrl,
  onToast,
  onTheme,
  onWallpaper,
  onLock,
  onClose,
}: TerminalProps) {
  const tree = useFsTree();
  const [cwd, setCwd] = useState(HOME);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [lines, setLines] = useState<Line[]>([]);
  const seedRef = useRef(1);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const push = useCallback((kind: LineKind, text: string) => {
    setLines((previous) => [...previous.slice(-400), { id: seedRef.current++, kind, text }]);
  }, []);

  useEffect(() => {
    const banner = [
      "Dounia OS · Terminal 4.0",
      "Escribe `help` para ver los comandos. `neofetch` para el resumen del sistema.",
      "",
    ];
    setLines(banner.map((text) => ({ id: seedRef.current++, kind: "dim" as LineKind, text })));
  }, []);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [lines]);

  const run = useCallback(
    (raw: string) => {
      const command = raw.trim();
      push("in", `dounia@os ${shortPath(cwd)} $ ${command}`);
      if (!command) return;
      setHistory((previous) => [...previous, command]);
      setHistoryIndex(-1);

      const tokens = tokenize(command);
      const name = (tokens[0] ?? "").toLowerCase();
      const args = tokens.slice(1);
      const out = (...values: string[]) => values.forEach((text) => push("out", text));
      const ok = (text: string) => push("ok", text);
      const err = (text: string) => push("err", text);

      /* echo with redirection: echo hola > notas.txt */
      if (name === "echo") {
        const redirectAt = args.findIndex((token) => token === ">" || token === ">>");
        if (redirectAt >= 0) {
          const text = args.slice(0, redirectAt).join(" ");
          const append = args[redirectAt] === ">>";
          const target = resolve(cwd, args[redirectAt + 1] ?? "");
          if (!args[redirectAt + 1]) {
            err("echo: falta el archivo de destino");
            return;
          }
          const previous = append ? getTree()[target]?.content ?? "" : "";
          const result = writeFile(target, previous ? `${previous}\n${text}` : text);
          if (!result.ok) err(`echo: ${result.error}`);
          else ok(`${append ? "Añadido a" : "Escrito en"} ${shortPath(target)}`);
          return;
        }
        out(args.join(" "));
        return;
      }

      switch (name) {
        case "help":
          out(
            "COMANDOS DISPONIBLES",
            "  ls [ruta]            lista el contenido de una carpeta",
            "  cd <ruta>            cambia de carpeta (cd .., cd ~, cd /)",
            "  pwd                  ruta actual",
            "  cat <archivo>        muestra un archivo",
            "  write <archivo> <t>  escribe texto en un archivo",
            "  mkdir <nombre>       crea una carpeta",
            "  touch <nombre>       crea un archivo vacío",
            "  rm <ruta>            borra archivo o carpeta",
            "  mv <ruta> <nombre>   renombra",
            "  open <app|url>       abre una app o una URL en Astra",
            "  apps                 lista las aplicaciones instaladas",
            "  wallpaper [id]       cambia el fondo (o lista los disponibles)",
            "  theme [id]           cambia el tema del escritorio",
            "  neofetch             resumen del sistema",
            "  sysinfo              datos reales del dispositivo",
            "  date · whoami · history · clear · lock · exit",
          );
          break;

        case "ls":
        case "dir": {
          const target = args[0] ? resolve(cwd, args[0]) : cwd;
          if (!isDir(tree, target)) {
            err(`ls: ${shortPath(target)}: no es una carpeta`);
            return;
          }
          const items = listDir(tree, target);
          if (!items.length) {
            out("(carpeta vacía)");
            return;
          }
          for (const item of items) {
            out(
              item.type === "dir"
                ? `  ${item.name}/`
                : `  ${item.name}${item.content ? `  · ${formatBytes(item.content.length)}` : ""}`,
            );
          }
          out(`  ${items.length} elemento(s)`);
          break;
        }

        case "cd": {
          const target = resolve(cwd, args[0] ?? HOME);
          if (!isDir(tree, target)) {
            err(`cd: ${shortPath(target)}: no existe`);
            return;
          }
          setCwd(target);
          break;
        }

        case "pwd":
          out(cwd);
          break;

        case "cat": {
          if (!args[0]) {
            err("cat: indica un archivo");
            return;
          }
          const target = resolve(cwd, args[0]);
          const node = tree[target];
          if (!node) {
            err(`cat: ${shortPath(target)}: no existe`);
            return;
          }
          if (node.type === "dir") {
            err(`cat: ${shortPath(target)}: es una carpeta`);
            return;
          }
          out(...(node.content ?? "(archivo vacío)").split("\n"));
          break;
        }

        case "write": {
          if (args.length < 2) {
            err("uso: write <archivo> <texto>");
            return;
          }
          const target = resolve(cwd, args[0]!);
          const text = args.slice(1).join(" ");
          const result = writeFile(target, text);
          if (!result.ok) err(`write: ${result.error}`);
          else ok(`Escrito en ${shortPath(target)}`);
          break;
        }

        case "mkdir": {
          if (!args.length) {
            err("uso: mkdir <nombre>");
            return;
          }
          for (const arg of args) {
            const result = mkdir(join(cwd, arg));
            if (!result.ok) err(`mkdir: ${arg}: ${result.error}`);
            else ok(`Carpeta creada: ${arg}`);
          }
          break;
        }

        case "touch": {
          if (!args.length) {
            err("uso: touch <archivo>");
            return;
          }
          for (const arg of args) {
            const target = join(cwd, arg);
            if (tree[target]) {
              err(`touch: ${arg}: ya existe`);
              continue;
            }
            const result = writeFile(target, "");
            if (!result.ok) err(`touch: ${arg}: ${result.error}`);
            else ok(`Archivo creado: ${arg}`);
          }
          break;
        }

        case "rm": {
          const target = args.filter((arg) => !arg.startsWith("-"))[0];
          if (!target) {
            err("uso: rm <ruta>");
            return;
          }
          const result = remove(resolve(cwd, target));
          if (!result.ok) err(`rm: ${result.error}`);
          else ok(`Borrado: ${target}`);
          break;
        }

        case "mv": {
          if (args.length < 2) {
            err("uso: mv <ruta> <nuevo nombre>");
            return;
          }
          const result = rename(resolve(cwd, args[0]!), args[1] ?? "");
          if (!result.ok) err(`mv: ${result.error}`);
          else ok(`Renombrado a ${args[1]}`);
          break;
        }

        case "open": {
          const target = args[0];
          if (!target) {
            err("uso: open <app|url>");
            return;
          }
          if (APPS.some((app) => app.id === target)) {
            onOpenApp(target);
            ok(`Abriendo ${target}…`);
            return;
          }
          if (/^(https?:)?\/\//.test(target) || target.includes(".")) {
            onOpenUrl(target.startsWith("http") ? target : `https://${target}`);
            ok("Abriendo en Astra Unblocker…");
            return;
          }
          err(`open: no encuentro «${target}»`);
          break;
        }

        case "apps": {
          out(...APPS.map((app) => `  ${app.id.padEnd(16)} ${app.name}`));
          out(`  ${APPS.length} aplicaciones instaladas`);
          break;
        }

        case "wallpaper": {
          if (!args[0]) {
            out(...WALLPAPERS.slice(0, 12).map((item) => `  ${item.id.padEnd(24)} ${item.name}`));
            out("  usa: wallpaper <id> · wallpaper random");
            return;
          }
          if (args[0] === "random") {
            const pick = WALLPAPERS[Math.floor(Math.random() * WALLPAPERS.length)];
            if (pick) {
              onWallpaper(pick.id);
              ok(`Fondo: ${pick.name}`);
            }
            return;
          }
          const match = WALLPAPERS.find((item) => item.id === args[0]);
          if (!match) {
            err(`wallpaper: no existe «${args[0]}»`);
            return;
          }
          onWallpaper(match.id);
          ok(`Fondo aplicado: ${match.name}`);
          break;
        }

        case "theme": {
          if (!args[0]) {
            out(...THEMES.map((item) => `  ${item.id.padEnd(12)} ${item.name}`));
            return;
          }
          const match = THEMES.find((item) => item.id === args[0]);
          if (!match) {
            err(`theme: no existe «${args[0]}»`);
            return;
          }
          onTheme(match.id);
          ok(`Tema aplicado: ${match.name}`);
          break;
        }

        case "neofetch": {
          const cores = navigator.hardwareConcurrency ?? 4;
          const minutes = Math.floor((Date.now() - START) / 60000);
          const linesBlock = [
            "      ▄▄▄▄▄▄▄      dounia@dounia-os",
            "    ▄█████████▄    ─────────────────",
            "   ███  ▀▀▀  ███   OS       Dounia OS v4 «Aura»",
            "   ███ ▄▄▄▄▄ ███   Kernel   web-shell 4.0",
            "   ███  ▀▀▀  ███   Shell    dtm 4.0",
            `    ▀█████████▀    Uptime   ${minutes} min`,
            "      ▀▀▀▀▀▀▀      Ventanas sistema activo",
            `                   Cores    ${cores}`,
            `                   Archivos ${fileCount(tree)} · ${formatBytes(totalBytes(tree))}`,
            `                   Apps     ${APPS.length}`,
            `                   Pantalla ${window.innerWidth}×${window.innerHeight}`,
          ];
          linesBlock.forEach((text) => push("out", text));
          break;
        }

        case "sysinfo": {
          const nav = navigator as Navigator & { deviceMemory?: number };
          out(
            `Sistema     Dounia OS v4 (Aura)`,
            `Usuario     ${"Dounia"}`,
            `Núcleo      ${navigator.userAgent.includes("CrOS") ? "ChromeOS · navegador" : "navegador web"}`,
            `CPU         ${navigator.hardwareConcurrency ?? "?"} hilos lógicos`,
            `Memoria     ${nav.deviceMemory ? `${nav.deviceMemory} GB (estimado)` : "no expuesta por el navegador"}`,
            `Pantalla    ${window.innerWidth}×${window.innerHeight} @ ${window.devicePixelRatio}x`,
            `Idioma      ${navigator.language}`,
            `Carpeta     ${shortPath(cwd)}`,
            `Archivos    ${fileCount(tree)} · ${formatBytes(totalBytes(tree))}`,
          );
          break;
        }

        case "date":
          out(new Date().toLocaleString("es-ES", { dateStyle: "full", timeStyle: "short" }));
          break;

        case "whoami":
          out("dounia");
          break;

        case "history":
          out(...history.map((item, index) => `  ${index + 1}  ${item}`));
          break;

        case "clear":
          setLines([]);
          break;

        case "lock":
          onLock();
          break;

        case "exit":
          onClose();
          break;

        case "reboot":
          onToast("Reiniciando", "El sistema se reiniciará en un instante…");
          window.setTimeout(() => window.location.reload(), 700);
          break;

        default:
          err(`${name}: comando no encontrado. Escribe «help».`);
      }
    },
    [cwd, history, onClose, onLock, onOpenApp, onOpenUrl, onTheme, onToast, onWallpaper, push, tree],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      run(input);
      setInput("");
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!history.length) return;
      const next = historyIndex < 0 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(next);
      setInput(history[next] ?? "");
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (historyIndex < 0) return;
      const next = historyIndex + 1;
      if (next >= history.length) {
        setHistoryIndex(-1);
        setInput("");
        return;
      }
      setHistoryIndex(next);
      setInput(history[next] ?? "");
      return;
    }
    if (event.key === "l" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      setLines([]);
    }
  };

  return (
    <div className="term" onClick={() => inputRef.current?.focus()}>
      <div className="term-screen" ref={scrollRef}>
        {lines.map((line) => (
          <div key={line.id} className={`term-line term-${line.kind}`}>
            {line.text || "\u00a0"}
          </div>
        ))}
        <div className="term-inputrow">
          <span className="term-prompt">dounia@os {shortPath(cwd)} $</span>
          <input
            ref={inputRef}
            className="term-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="off"
            aria-label="Entrada del terminal"
            autoFocus
          />
        </div>
      </div>
      <div className="term-status">
        <span>bash · {shortPath(cwd)}</span>
        <span>{fileCount(tree)} archivos</span>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setLines([]);
          }}
        >
          limpiar
        </button>
      </div>
    </div>
  );
}
