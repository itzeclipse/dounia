"use client";

import { useEffect, useState } from "react";

/**
 * Dounia OS — real virtual file system.
 *
 * A single tree, persisted in localStorage, shared by the Terminal, the Files
 * app and the Notes editor, so a file written in one app appears instantly in
 * the others.
 */

export interface FSNode {
  name: string;
  type: "dir" | "file";
  content?: string;
  updated: number;
}

export type FSTree = Record<string, FSNode>;

const KEY = "dounia.fs.v1";
export const HOME = "/home/dounia";

const now = 0;

function seed(): FSTree {
  const dirs = [
    "/",
    HOME,
    `${HOME}/Escritorio`,
    `${HOME}/Documentos`,
    `${HOME}/Descargas`,
    `${HOME}/Notas`,
    "/sistema",
  ];
  const tree: FSTree = {};
  for (const path of dirs) {
    tree[path] = { name: path === "/" ? "/" : path.split("/").pop() ?? path, type: "dir", updated: now };
  }
  tree[`${HOME}/Documentos/bienvenida.txt`] = {
    name: "bienvenida.txt",
    type: "file",
    updated: now,
    content: [
      "DOUNIA OS v4 — bienvenida",
      "",
      "Este sistema de archivos es real: vive en tu navegador.",
      "Puedes editar este archivo desde Archivos o con el Terminal:",
      "",
      "  write Documentos/bienvenida.txt hola mundo",
      "",
      "Carpetas disponibles: Escritorio, Documentos, Descargas, Notas.",
      "Atajos: Ctrl+Alt+T abre el Terminal, Ctrl+K busca apps.",
    ].join("\n"),
  };
  tree[`${HOME}/Notas/ideas.txt`] = {
    name: "ideas.txt",
    type: "file",
    updated: now,
    content: "1. Personalizar el escritorio con otro fondo\n2. Abrir el Estudio de fondos\n3. Probar el Terminal",
  };
  tree["/sistema/README.txt"] = {
    name: "README.txt",
    type: "file",
    updated: now,
    content: "Dounia OS · núcleo local. Nada de aquí se envía a ningún servidor.",
  };
  return tree;
}

let cached: FSTree | null = null;
const listeners = new Set<() => void>();

export function getTree(): FSTree {
  if (cached) return cached;
  if (typeof window === "undefined") {
    cached = seed();
    return cached;
  }
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FSTree;
      if (parsed && typeof parsed === "object" && parsed["/"]) {
        cached = parsed;
        return cached;
      }
    }
  } catch {
    /* corrupted tree: reseed */
  }
  cached = seed();
  return cached;
}

function persist(next: FSTree) {
  cached = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage full: the session keeps working in memory */
  }
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useFsTree(): FSTree {
  const [tree, setTree] = useState<FSTree>(() => seed());
  useEffect(() => {
    setTree(getTree());
    return subscribe(() => setTree(getTree()));
  }, []);
  return tree;
}

/* ------------------------------------------------------------------ paths */

export function normalize(path: string): string {
  const parts: string[] = [];
  for (const chunk of path.split("/")) {
    if (!chunk || chunk === ".") continue;
    if (chunk === "..") parts.pop();
    else parts.push(chunk);
  }
  return `/${parts.join("/")}`;
}

export function resolve(cwd: string, target: string): string {
  let raw = target.trim();
  if (!raw) return normalize(cwd);
  if (raw === "~") raw = HOME;
  if (raw.startsWith("~/")) raw = `${HOME}${raw.slice(1)}`;
  if (raw.startsWith("/")) return normalize(raw);
  return normalize(`${cwd}/${raw}`);
}

export function parentOf(path: string): string {
  if (path === "/") return "/";
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return `/${parts.join("/")}`;
}

export function baseName(path: string): string {
  if (path === "/") return "/";
  return path.split("/").filter(Boolean).pop() ?? "/";
}

export function join(cwd: string, name: string): string {
  return normalize(`${cwd === "/" ? "" : cwd}/${name}`);
}

export function isDir(tree: FSTree, path: string): boolean {
  return tree[normalize(path)]?.type === "dir";
}

export function listDir(tree: FSTree, path: string): FSNode[] {
  const dir = normalize(path);
  const prefix = dir === "/" ? "/" : `${dir}/`;
  return Object.entries(tree)
    .filter(([key]) => key !== "/" && key.startsWith(prefix) && !key.slice(prefix.length).includes("/"))
    .map(([key, node]) => ({ ...node, name: baseName(key) }))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
}

export function fileCount(tree: FSTree): number {
  return Object.values(tree).filter((node) => node.type === "file").length;
}

export function totalBytes(tree: FSTree): number {
  return Object.values(tree).reduce((sum, node) => sum + (node.content?.length ?? 0), 0);
}

/* ---------------------------------------------------------------- dispatch */

export function mkdir(path: string): { ok: boolean; error?: string } {
  const tree = { ...getTree() };
  const target = normalize(path);
  if (tree[target]) return { ok: false, error: "Ya existe" };
  const parent = parentOf(target);
  if (tree[parent]?.type !== "dir") return { ok: false, error: "La carpeta padre no existe" };
  tree[target] = { name: baseName(target), type: "dir", updated: Date.now() };
  persist(tree);
  return { ok: true };
}

export function writeFile(path: string, content: string): { ok: boolean; error?: string } {
  const tree = { ...getTree() };
  const target = normalize(path);
  if (tree[target]?.type === "dir") return { ok: false, error: "Es una carpeta" };
  const parent = parentOf(target);
  if (tree[parent]?.type !== "dir") return { ok: false, error: "La carpeta padre no existe" };
  tree[target] = { name: baseName(target), type: "file", content, updated: Date.now() };
  persist(tree);
  return { ok: true };
}

export function remove(path: string): { ok: boolean; error?: string } {
  const tree = { ...getTree() };
  const target = normalize(path);
  if (!tree[target]) return { ok: false, error: "No existe" };
  if (target === "/" || target === HOME || target === "/home") return { ok: false, error: "Ruta protegida" };
  const prefix = `${target}/`;
  for (const key of Object.keys(tree)) {
    if (key === target || key.startsWith(prefix)) delete tree[key];
  }
  persist(tree);
  return { ok: true };
}

export function rename(path: string, nextName: string): { ok: boolean; error?: string } {
  const tree = { ...getTree() };
  const source = normalize(path);
  const node = tree[source];
  if (!node) return { ok: false, error: "No existe" };
  const safe = nextName.trim().replace(/[/\\]/g, "");
  if (!safe) return { ok: false, error: "Nombre inválido" };
  const target = join(parentOf(source), safe);
  if (tree[target]) return { ok: false, error: "Ya existe" };
  const prefix = `${source}/`;
  for (const key of Object.keys(tree).sort()) {
    if (key === source || key.startsWith(prefix)) {
      const nextKey = `${target}${key.slice(source.length)}`;
      tree[nextKey] = { ...tree[key]!, name: baseName(nextKey) };
      delete tree[key];
    }
  }
  persist(tree);
  return { ok: true };
}

export function resetFs() {
  persist(seed());
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
