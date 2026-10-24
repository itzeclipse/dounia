"use client";
import React from 'react';

import { useCallback, useState } from "react";
import { hostOf, type LinkGroup } from "@/lib/os/data";
import { IconExternal, IconLink, IconRefresh, IconShield } from "../icons";

interface LinkDirectoryProps {
  groups: LinkGroup[];
  title: string;
  subtitle: string;
  onOpenProxy: (url: string) => void;
  onToast: (title: string, body: string) => void;
}

interface StatusEntry {
  ok: boolean;
  status: number;
}

export function LinkDirectory({ groups, title, subtitle, onOpenProxy, onToast }: LinkDirectoryProps) {
  const [statuses, setStatuses] = useState<Record<string, StatusEntry>>({});
  const [checking, setChecking] = useState(false);

  const checkAll = useCallback(async () => {
    const urls = Array.from(new Set(groups.flatMap((group) => group.items.map((item) => item.url))));
    setChecking(true);
    try {
      const response = await fetch("/api/link-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urls: urls.slice(0, 24) }),
      });
      const data = (await response.json()) as { results?: Array<{ url: string; ok: boolean; status: number }> };
      const next: Record<string, StatusEntry> = {};
      for (const entry of data.results ?? []) next[entry.url] = { ok: entry.ok, status: entry.status };
      setStatuses(next);
      const alive = Object.values(next).filter((entry) => entry.ok).length;
      onToast("Comprobación terminada", `${alive} de ${Object.keys(next).length} enlaces responden correctamente.`);
    } catch {
      onToast("No se pudo comprobar", "El comprobador necesita conexión al servidor de Dounia.");
    } finally {
      setChecking(false);
    }
  }, [groups, onToast]);

  return (
    <div className="d-dir">
      <header className="d-dir-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="d-btn" onClick={checkAll} disabled={checking}>
            <IconRefresh /> {checking ? "Comprobando…" : "Comprobar enlaces"}
          </button>
        </div>
      </header>

      {groups.map((group) => (
        <section key={group.id} className="d-group">
          <div className="d-group-head">
            <h3 style={{ color: group.accent }}>{group.title}</h3>
            <span>
              {group.subtitle} · {group.items.length} enlaces
            </span>
          </div>
          <div className="d-link-grid">
            {group.items.map((item) => {
              const status = statuses[item.url];
              return (
                <div key={`${group.id}-${item.url}`} className="d-link">
                  <span
                    className="d-link-badge"
                    style={{ background: `${group.accent}22`, border: `1px solid ${group.accent}55` }}
                  >
                    {hostOf(item.url).slice(0, 2).toUpperCase()}
                  </span>
                  <button
                    type="button"
                    className="d-link-body"
                    onClick={() => onOpenProxy(item.url)}
                    title={`Abrir ${item.url} con el proxy`}
                  >
                    <strong>
                      {item.name}
                      {status && (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: "0.6rem",
                            letterSpacing: "0.08em",
                            color: status.ok ? "#22c55e" : "#f59e0b",
                          }}
                        >
                          {status.ok ? `HTTP ${status.status}` : status.status ? `HTTP ${status.status}` : "sin respuesta"}
                        </span>
                      )}
                    </strong>
                    <small>{item.note ?? hostOf(item.url)}</small>
                  </button>
                  <div className="d-link-actions">
                    <button
                      type="button"
                      className="d-mini-btn"
                      aria-label="Abrir con proxy"
                      title="Abrir con proxy"
                      onClick={() => onOpenProxy(item.url)}
                    >
                      <IconShield />
                    </button>
                    <a
                      className="d-mini-btn"
                      aria-label="Abrir en pestaña"
                      title="Abrir en pestaña"
                      href={item.url}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <IconExternal />
                    </a>
                    <button
                      type="button"
                      className="d-mini-btn"
                      aria-label="Copiar enlace"
                      title="Copiar enlace"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(item.url);
                          onToast("Enlace copiado", item.url);
                        } catch {
                          onToast("No se pudo copiar", "El navegador ha bloqueado el portapapeles.");
                        }
                      }}
                    >
                      <IconLink />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
