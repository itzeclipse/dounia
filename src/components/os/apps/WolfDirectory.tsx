"use client";
import React from 'react';

import { useEffect, useMemo, useState } from "react";
import { LINK_GROUPS, hostOf } from "@/lib/os/data";
import { IconExternal, IconRefresh, IconSearch, IconShield } from "../icons";

interface WolfItem {
  name: string;
  url: string;
  section: string;
}

interface WolfSection {
  id: string;
  label: string;
  items: WolfItem[];
}

interface WolfDirectoryProps {
  section?: string;
  onOpenProxy: (url: string) => void;
  onToast: (title: string, body: string) => void;
}

/** Every WolfUnblock page, read live from the site and grouped by section. */
export function WolfDirectory({ section, onOpenProxy, onToast }: WolfDirectoryProps) {
  const [sections, setSections] = useState<WolfSection[]>([]);
  const [tab, setTab] = useState<string>(section ?? "all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch("/api/wolfunblock");
        const data = (await response.json()) as { sections?: WolfSection[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "No se pudo leer WolfUnblock");
        if (!cancelled) setSections(data.sections ?? []);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "No se pudo leer WolfUnblock");
          const fallback: WolfSection[] = LINK_GROUPS.filter((group) => group.id === "wolfunblock").map((group) => ({
            id: "wolfunblock",
            label: "WolfUnblock (lista local)",
            items: group.items.map((item) => ({ name: item.name, url: item.url, section: "wolfunblock" })),
          }));
          setSections(fallback);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sections
      .filter((group) => (tab === "all" ? true : group.id === tab))
      .map((group) => ({
        ...group,
        items: q ? group.items.filter((item) => item.name.toLowerCase().includes(q) || item.url.includes(q)) : group.items,
      }))
      .filter((group) => group.items.length > 0);
  }, [query, sections, tab]);

  const total = sections.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <div className="d-dir">
      <header className="d-dir-head">
        <div className="d-dir-brand">
          <span className="d-dir-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/api/wolfunblock/logo"
              alt="Logo de WolfUnblock"
              onError={(event) => {
                event.currentTarget.src = "/os/icons/wolf.svg";
              }}
            />
          </span>
          <div>
            <h2>
              WolfUnblock <em className="d-dir-verified">logo oficial</em>
            </h2>
            <p>
              {loading ? "Leyendo el sitio…" : `${total} enlaces en ${sections.length} secciones · cada uno se abre con el proxy`}
              {error ? " · usando la lista local" : ""}
            </p>
          </div>
        </div>
        <label className="d-search" style={{ maxWidth: 280, margin: 0 }}>
          <IconSearch />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar enlaces…"
            aria-label="Filtrar enlaces"
          />
        </label>
      </header>

      <div className="d-filters" style={{ marginBottom: 22 }}>
        <button type="button" className={`d-chip${tab === "all" ? " on" : ""}`} onClick={() => setTab("all")}>
          Todas
        </button>
        {sections.map((group) => (
          <button
            key={group.id}
            type="button"
            className={`d-chip${tab === group.id ? " on" : ""}`}
            onClick={() => setTab(group.id)}
          >
            {group.label} ({group.items.length})
          </button>
        ))}
      </div>

      {loading && <p className="d-empty">Cargando el archivo de WolfUnblock…</p>}

      {visible.map((group) => (
        <section key={group.id} className="d-group">
          <div className="d-group-head">
            <h3 style={{ color: "#22c55e" }}>{group.label}</h3>
            <span>{group.items.length} enlaces</span>
          </div>
          <div className="d-link-grid">
            {group.items.map((item) => (
              <div key={`${group.id}-${item.url}`} className="d-link">
                <span className="d-link-badge" style={{ background: "#22c55e22", border: "1px solid #22c55e55" }}>
                  {item.name.slice(0, 2).toUpperCase()}
                </span>
                <button type="button" className="d-link-body" onClick={() => onOpenProxy(item.url)}>
                  <strong>{item.name}</strong>
                  <small>{hostOf(item.url)}</small>
                </button>
                <div className="d-link-actions">
                  <button
                    type="button"
                    className="d-mini-btn"
                    title="Abrir con proxy"
                    aria-label="Abrir con proxy"
                    onClick={() => onOpenProxy(item.url)}
                  >
                    <IconShield />
                  </button>
                  <a
                    className="d-mini-btn"
                    title="Abrir en pestaña"
                    aria-label="Abrir en pestaña"
                    href={item.url}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <IconExternal />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {!loading && visible.length === 0 && (
        <p className="d-empty">
          Sin resultados.{" "}
          <button
            type="button"
            className="d-btn"
            style={{ marginLeft: 8 }}
            onClick={() => {
              setQuery("");
              setTab("all");
              onToast("WolfUnblock", "Filtros reiniciados.");
            }}
          >
            <IconRefresh /> Reiniciar filtros
          </button>
        </p>
      )}
    </div>
  );
}
