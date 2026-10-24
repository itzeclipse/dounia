"use client";
import React from 'react';

import { useEffect, useMemo, useRef, useState } from "react";

import { HOME, baseName, formatBytes, listDir, remove, useFsTree, writeFile } from "@/lib/os/fs";
import { IconPlus, IconTrash } from "../icons";

const NOTES_DIR = `${HOME}/Notas`;

export interface NotesAppProps {
  onToast: (title: string, body: string) => void;
}

export function NotesApp({ onToast }: NotesAppProps) {
  const tree = useFsTree();
  const notes = useMemo(
    () => listDir(tree, NOTES_DIR).filter((node) => node.type === "file"),
    [tree],
  );
  const [active, setActive] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const timer = useRef<number | null>(null);
  const loadedFor = useRef<string | null>(null);

  /* Pick the first note once the tree is hydrated. */
  useEffect(() => {
    if (active) return;
    const first = notes[0];
    if (first) setActive(`${NOTES_DIR}/${first.name}`);
  }, [active, notes]);

  /* Load the selected note into the editor. */
  useEffect(() => {
    if (!active || loadedFor.current === active) return;
    const node = tree[active];
    if (!node) return;
    loadedFor.current = active;
    setDraft(node.content ?? "");
    setSaved(true);
  }, [active, tree]);

  /* Autosave after 600ms without typing. */
  useEffect(() => {
    if (!active || saved) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      writeFile(active, draft);
      setSaved(true);
    }, 600);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [active, draft, saved]);

  const createNote = () => {
    const name = (newName.trim() || `nota-${Date.now().toString().slice(-4)}`).replace(/\s+/g, "-");
    const target = `${NOTES_DIR}/${name}${name.includes(".") ? "" : ".txt"}`;
    const result = writeFile(target, "");
    if (!result.ok) {
      onToast("No se pudo crear", result.error ?? "Error");
      return;
    }
    loadedFor.current = null;
    setActive(target);
    setDraft("");
    setSaved(true);
    setNewName("");
    setCreating(false);
  };

  const deleteNote = () => {
    if (!active) return;
    const result = remove(active);
    if (!result.ok) {
      onToast("No se pudo borrar", result.error ?? "Error");
      return;
    }
    onToast("Nota borrada", baseName(active));
    loadedFor.current = null;
    setActive(null);
    setDraft("");
  };

  return (
    <div className="notes">
      <aside className="notes-list">
        <header>
          <strong>Notas</strong>
          <button type="button" aria-label="Nueva nota" onClick={() => setCreating(true)}>
            <IconPlus />
          </button>
        </header>
        {creating && (
          <input
            autoFocus
            className="notes-new"
            value={newName}
            placeholder="nombre de la nota"
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") createNote();
              if (event.key === "Escape") setCreating(false);
            }}
            onBlur={() => setCreating(false)}
          />
        )}
        <div className="notes-items">
          {notes.map((note) => {
            const full = `${NOTES_DIR}/${note.name}`;
            return (
              <button
                key={full}
                type="button"
                className={`notes-item${active === full ? " on" : ""}`}
                onClick={() => {
                  loadedFor.current = null;
                  setActive(full);
                }}
              >
                <strong>{note.name.replace(/\.txt$/, "")}</strong>
                <small>{formatBytes(note.content?.length ?? 0)}</small>
              </button>
            );
          })}
          {notes.length === 0 && <p className="notes-empty">Sin notas todavía.</p>}
        </div>
      </aside>

      <section className="notes-editor">
        <header>
          <span>{active ? baseName(active) : "Sin nota"}</span>
          <span className={`notes-state${saved ? "" : " dirty"}`}>
            {active ? (saved ? "guardado" : "guardando…") : ""}
          </span>
          <button type="button" onClick={deleteNote} disabled={!active} aria-label="Borrar nota">
            <IconTrash />
          </button>
        </header>
        <textarea
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setSaved(false);
          }}
          placeholder={active ? "Escribe aquí…" : "Crea una nota con el botón +"}
          disabled={!active}
          spellCheck
          aria-label="Editor de notas"
        />
      </section>
    </div>
  );
}
