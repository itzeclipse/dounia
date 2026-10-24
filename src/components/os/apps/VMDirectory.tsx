"use client";
import React from 'react';

import { useState } from "react";
import { VM_PROVIDERS } from "@/lib/os/data";
import { IconExternal, IconRefresh, IconShield } from "../icons";
import { ScramjetFrame } from "./ScramjetFrame";

interface VMDirectoryProps {
  onToast: (title: string, body: string) => void;
  onOpenProxy: (url: string) => void;
}

/**
 * Virtual PC — real remote-desktop providers. Embeddable ones open inline,
 * the rest open through the system proxy or in a tab.
 */
export function VMDirectory({ onToast, onOpenProxy }: VMDirectoryProps) {
  const [active, setActive] = useState(VM_PROVIDERS[0]);
  const [nonce, setNonce] = useState(0);




  return (
    <>
      <div className="d-quick">
        {VM_PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            onClick={() => {
              setActive(provider);
              setNonce((n) => n + 1);
            }}
            style={
              provider.id === active.id
                ? { background: "#fff", color: "#000", borderColor: "#fff" }
                : undefined
            }
          >
            {provider.name}
          </button>
        ))}
      </div>
      <div className="d-proxybar">
        <span className="d-status-line" style={{ margin: 0 }}>
          <i style={{ background: "#a855f7" }} />
          {active.name} · {active.sub}
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <span className="d-sj-tag" title="Motor único del sistema">
            <IconShield /> Scramjet
          </span>
          <button type="button" className="d-tool icon-only" aria-label="Recargar" onClick={() => setNonce((n) => n + 1)}>
            <IconRefresh />
          </button>
          <button type="button" className="d-tool" onClick={() => onOpenProxy(active.url)}>
            Abrir en Scramjet
          </button>
          <a className="d-tool" href={active.url} target="_blank" rel="noreferrer noopener">
            <IconExternal /> <span>Externo</span>
          </a>
        </div>
      </div>
      <div className="d-win-body" style={{ flex: 1, background: "#000" }}>
        <ScramjetFrame url={active.url} reloadKey={nonce} />
      </div>
    </>
  );
}
