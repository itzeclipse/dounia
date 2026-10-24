"use client";
import React from 'react';

import { useCallback, useMemo, useState } from "react";
import {
  PROXY_PROVIDERS,
  PROXY_TYPE_COLOR,
  PROXY_TYPE_LABEL,
  type ProxyType,
} from "@/lib/os/data";
import { AppIcon } from "../AppIcon";
import { IconBolt, IconExternal, IconRefresh, IconShield } from "../icons";

interface ProxyHubProps {
  onOpenProxy: (url: string) => void;
  onToast: (title: string, body: string) => void;
}

const TYPE_ORDER: ProxyType[] = [
  "propio",
  "universal",
  "frontend",
  "clasico",
  "traductor",
  "buscador",
  "tor",
  "dns",
  "emergencia",
];

/**
 * Proxy Hub — every proxy technique available to the system, grouped into 9
 * distinct types. "Abrir en Astra" runs the page through this project's own
 * backend; the rest open their own server or external tab.
 */
export function ProxyHub({ onOpenProxy, onToast }: ProxyHubProps) {
  const [statuses, setStatuses] = useState<Record<string, { ok: boolean; status: number }>>({});
  const [checking, setChecking] = useState(false);

  const groups = useMemo(
    () =>
      TYPE_ORDER.map((type) => ({
        type,
        providers: PROXY_PROVIDERS.filter((provider) => provider.type === type),
      })).filter((group) => group.providers.length > 0),
    [],
  );

  const alive = useMemo(
    () => Object.values(statuses).filter((entry) => entry.ok).length,
    [statuses],
  );
  const hasChecks = useMemo(() => Object.keys(statuses).length > 0, [statuses]);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/link-check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urls: PROXY_PROVIDERS.map((provider) => provider.url) }),
      });
      const data = (await response.json()) as { results?: Array<{ url: string; ok: boolean; status: number }> };
      const next: Record<string, { ok: boolean; status: number }> = {};
      for (const entry of data.results ?? []) next[entry.url] = { ok: entry.ok, status: entry.status };
      setStatuses(next);
      const online = Object.values(next).filter((entry) => entry.ok).length;
      onToast("Proxy Hub", `${online} de ${PROXY_PROVIDERS.length} proxies responden.`);
    } catch {
      onToast("Proxy Hub", "No se pudo comprobar la lista ahora mismo.");
    } finally {
      setChecking(false);
    }
  }, [onToast]);

  return (
    <div className="d-dir d-proxy-hub">
      <header className="d-dir-head">
        <div>
          <h2>Proxy Hub</h2>
          <p>
            {PROXY_PROVIDERS.length} proxies en {groups.length} tipos distintos. El proxy propio es el
            único que se ejecuta aquí; el resto abre su propio motor o una pestaña externa.
          </p>
        </div>
        <button type="button" className="d-btn" onClick={check} disabled={checking}>
          <IconRefresh /> {checking ? "Comprobando…" : "Comprobar todos"}
        </button>
      </header>

      <div className="d-proxy-stats">
        <div className="d-proxy-stat">
          <span className="d-proxy-stat-value">{PROXY_PROVIDERS.length}</span>
          <span className="d-proxy-stat-label">proxies</span>
        </div>
        <div className="d-proxy-stat">
          <span className="d-proxy-stat-value">{groups.length}</span>
          <span className="d-proxy-stat-label">tipos</span>
        </div>
        <div className="d-proxy-stat">
          <span
            className="d-proxy-stat-value"
            style={{
              color: checking ? "#fbbf24" : hasChecks && alive > 0 ? "#22c55e" : "var(--d-muted)",
            }}
          >
            {checking ? "…" : hasChecks ? alive : "—"}
          </span>
          <span className="d-proxy-stat-label">en línea</span>
        </div>
        <p className="d-proxy-stat-hint">
          <IconBolt /> La caché del backend hace que volver a una página sea instantáneo.
        </p>
      </div>

      {groups.map((group) => {
        const color = PROXY_TYPE_COLOR[group.type];
        return (
          <section key={group.type} className="d-proxy-type" style={{ "--type": color } as React.CSSProperties}>
            <div className="d-group-head">
              <h3 style={{ color }}>{PROXY_TYPE_LABEL[group.type]}</h3>
              <span>{group.providers.length} proveedores</span>
            </div>
            <div className="d-link-grid">
              {group.providers.map((provider) => {
                const status = statuses[provider.url];
                return (
                  <div key={provider.id} className="d-link" style={{ alignItems: "flex-start" }}>
                    <AppIcon src="/os/icons/proxy.svg" alt={provider.name} accent={color} size={34} />
                    <div className="d-link-body">
                      <strong>
                        {provider.name}
                        {status && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: "0.58rem",
                              color: status.ok ? "#22c55e" : "#f59e0b",
                            }}
                          >
                            {status.ok ? `HTTP ${status.status}` : "sin respuesta"}
                          </span>
                        )}
                      </strong>
                      <small>{provider.engine}</small>
                      {provider.note && (
                        <small style={{ marginTop: 4, color: "#a1a1aa", whiteSpace: "normal" }}>{provider.note}</small>
                      )}
                      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                        <button
                          type="button"
                          className="d-btn"
                          style={{ padding: "6px 10px", fontSize: "0.62rem" }}
                          onClick={() => onOpenProxy(provider.url)}
                        >
                          <IconShield /> Astra
                        </button>
                        <a
                          className="d-btn"
                          style={{ padding: "6px 10px", fontSize: "0.62rem" }}
                          href={provider.url}
                          target="_blank"
                          rel="noreferrer noopener"
                        >
                          <IconExternal /> Abrir
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
