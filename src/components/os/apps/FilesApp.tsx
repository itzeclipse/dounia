"use client";
import React from 'react';

import { useEffect, useMemo, useState } from "react";

import { IconChevronLeft, IconClose, IconFile, IconFolder, IconPlus, IconTrash } from "../icons";
import { AppIcon } from "../AppIcon";
import {
  HOME,
  baseName,
  formatBytes,
  join,
  listDir,
  mkdir,
  parentOf,
  remove,
  rename,
  useFsTree,
  writeFile,
} from "@/lib/os/fs";

export interface FilesAppProps {
  onToast: (title: string, body: string) => void;
  initialPath?: string;
}

const PLACES = [
  { path: HOME, label: "Inicio" },
  { path: `${HOME}/Escritorio`, label: "Escritorio" },
  { path: `${HOME}/Documentos`, label: "Documentos" },
  { path: `${HOME}/Notas`, label: "Notas" },
  { path: `${HOME}/Descargas`, label: "Descargas" },
  { path: "/sistema", label: "Sistema" },
];

export function FilesApp({ onToast, initialPath }: FilesAppProps) {
  const tree = useFsTree();
  const [path, setPath] = useState(initialPath ?? HOME);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dirty, setDirty] = useState(false);
  const [creating, setCreating] = useState<"dir" | "file" | null>(null);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [filter, setFilter] = useState("");

  const items = useMemo(() => {
    const list = listDir(tree, path);
    const q = filter.trim().toLowerCase();
    return q ? list.filter((item) => item.name.toLowerCase().includes(q)) : list;
  }, [tree, path, filter]);

  useEffect(() => {
    const node = editing ? tree[editing] : null;
    if (editing && !node) {
      setEditing(null);
      setDraft("");
    }
  }, [tree, editing]);

  const openFile = (full: string) => {
    const node = tree[full];
    if (!node || node.type !== "file") return;
    setSelected(full);
    setEditing(full);
    setDraft(node.content ?? "");
    setDirty(false);
  };

  const saveFile = () => {
    if (!editing) return;
    const result = writeFile(editing, draft);
    if (!result.ok) {
      onToast("No se pudo guardar", result.error ?? "Error desconocido");
      return;
    }
    setDirty(false);
    onToast("Guardado", `${baseName(editing)} está al día.`);
  };

  const create = () => {
    const name = newName.trim();
    if (!name) {
      setCreating(null);
      return;
    }
    const target = join(path, name);
    const result = creating === "dir" ? mkdir(target) : writeFile(target, "");
    if (!result.ok) onToast("Error", result.error ?? "No se pudo crear");
    else {
      onToast(creating === "dir" ? "Carpeta creada" : "Archivo creado", name);
      if (creating === "file") openFile(target);
    }
    setNewName("");
    setCreating(null);
  };

  const doRemove = () => {
    if (!selected) return;
    const node = tree[selected];
    const result = remove(selected);
    if (!result.ok) onToast("Error", result.error ?? "No se pudo borrar");
    else {
      onToast("Enviado a la nada", `${node?.name ?? selected} se borró del sistema.`);
      if (editing === selected) {
        setEditing(null);
        setDraft("");
      }
      setSelected(null);
    }
  };

  const commitRename = () => {
    if (!renaming) return;
    const result = rename(renaming, renameValue);
    if (!result.ok) onToast("Error", result.error ?? "No se pudo renombrar");
    else {
      const nextPath = join(parentOf(renaming), renameValue.trim());
      if (editing === renaming) setEditing(nextPath);
      setSelected(nextPath);
      onToast("Renombrado", renameValue.trim());
    }
    setRenaming(null);
  };

  const openNode = (full: string) => {
    const node = tree[full];
    if (!node) return;
    setSelected(full);
    if (node.type === "dir") {
      setPath(full);
      setSelected(null);
    } else {
      openFile(full);
    }
  };

  const crumbs = path.split("/").filter(Boolean);

  return (
    <div className="files">
      <aside className="files-side">
        <p className="files-side-label">Lugares</p>
        {PLACES.map((place) => (
          <button
            key={place.path}
            type="button"
            className={`files-place${path === place.path ? " on" : ""}`}
            onClick={() => {
              setPath(place.path);
              setSelected(null);
            }}
          >
            <IconFolder />
            <span>{place.label}</span>
          </button>
        ))}
        <div className="files-side-foot">
          <span>{Object.keys(tree).length} nodos</span>
        </div>
      </aside>

      <div className="files-main">
        <header className="files-bar">
          <button
            type="button"
            className="files-icon-btn"
            aria-label="Subir"
            disabled={path === "/"}
            onClick={() => {
              setPath(parentOf(path));
              setSelected(null);
            }}
          >
            <IconChevronLeft />
          </button>
          <div className="files-crumbs">
            <button type="button" onClick={() => setPath("/")}>
              /
            </button>
            {crumbs.map((crumb, index) => {
              const full = `/${crumbs.slice(0, index + 1).join("/")}`;
              return (
                <span key={full}>
                  <button type="button" onClick={() => setPath(full)}>
                    {crumb}
                  </button>
                </span>
              );
            })}
          </div>
          <input
            className="files-search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filtrar…"
            aria-label="Filtrar archivos"
          />
        </header>

        <div className="files-tools">
          <button type="button" onClick={() => { setCreating("dir"); setNewName(""); }}>
            <IconPlus /> Carpeta
          </button>
          <button type="button" onClick={() => { setCreating("file"); setNewName(""); }}>
            <IconFile /> Archivo
          </button>
          <button type="button" disabled={!selected} onClick={() => { setRenaming(selected); setRenameValue(selected ? baseName(selected) : ""); }}>
            Renombrar
          </button>
          <button type="button" className="danger" disabled={!selected} onClick={doRemove}>
            <IconTrash /> Borrar
          </button>
        </div>

        {creating && (
          <div className="files-create">
            <span>{creating === "dir" ? "Nueva carpeta:" : "Nuevo archivo:"}</span>
            <input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") create();
                if (event.key === "Escape") setCreating(null);
              }}
              onBlur={create}
              placeholder={creating === "dir" ? "mi-carpeta" : "nota.txt"}
            />
            <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={create}>
              Crear
            </button>
          </div>
        )}

        <div className="files-body">
          <div className="files-list">
            {items.length === 0 && <p className="files-empty">Esta carpeta está vacía.</p>}
            {items.map((item) => {
              const full = path === "/" ? `/${item.name}` : `${path}/${item.name}`;
              const isSelected = selected === full;
              return (
                <div
                  key={full}
                  className={`files-row${isSelected ? " on" : ""}`}
                  onClick={() => setSelected(full)}
                  onDoubleClick={() => openNode(full)}
                >
                  {item.type === "dir" ? (
                    <IconFolder className="files-ico dir" />
                  ) : (
                    <IconFile className="files-ico" />
                  )}
                  {renaming === full ? (
                    <input
                      autoFocus
                      className="files-inline"
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") commitRename();
                        if (event.key === "Escape") setRenaming(null);
                      }}
                      onBlur={commitRename}
                      onClick={(event) => event.stopPropagation()}
                    />
                  ) : (
                    <span className="files-name">{item.name}</span>
                  )}
                  <span className="files-meta">
                    {item.type === "dir" ? "carpeta" : formatBytes(item.content?.length ?? 0)}
                  </span>
                </div>
              );
            })}
          </div>

          {editing && tree[editing]?.type === "file" && (
            <div className="files-editor">
              <header>
                <AppIcon src="/os/icons/notes.svg" alt="Notas" accent="#22d3ee" size={18} />
                <strong>{baseName(editing)}</strong>
                <span className="files-dirty">{dirty ? "sin guardar" : "guardado"}</span>
                <button type="button" onClick={saveFile} disabled={!dirty}>
                  Guardar
                </button>
                <button
                  type="button"
                  aria-label="Cerrar editor"
                  onClick={() => {
                    setEditing(null);
                    setDirty(false);
                  }}
                >
                  <IconClose />
                </button>
              </header>
              <textarea
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setDirty(true);
                }}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
                    event.preventDefault();
                    saveFile();
                  }
                }}
                spellCheck={false}
                aria-label={`Editar ${baseName(editing)}`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
