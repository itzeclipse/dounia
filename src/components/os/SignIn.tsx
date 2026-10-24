"use client";
import React from 'react';

import { useEffect, useRef, useState } from "react";
import { DEFAULT_WALLPAPER, type Wallpaper } from "@/lib/os/data";
import type { ClockValue } from "@/lib/os/hooks";
import { WallpaperLayer } from "./WallpaperLayer";
import {
  IconBattery,
  IconChevron,
  IconLock,
  IconMoon,
  IconPlus,
  IconPower,
  IconRefresh,
  IconUserPlus,
  IconWifi,
} from "./icons";

interface SignInProps {
  wallpaper: Wallpaper;
  clock: ClockValue;
  onSignIn: (user: string) => void;
  onShutdown: () => void;
  onRestart: () => void;
  onSignOut: () => void;
}

/**
 * Chromebook-style sign-in screen: big bottom-left clock, centre avatar +
 * password field with a "next" arrow, a top-right status bar with WiFi,
 * battery and a power button whose menu offers suspend / restart / sign out /
 * shut down, plus "browse as guest" and "add account" like a real Chromebook.
 */
export function SignIn({ wallpaper, clock, onSignIn, onShutdown, onRestart, onSignOut }: SignInProps) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [powerOpen, setPowerOpen] = useState(false);
  const [sleeping, setSleeping] = useState(false);
  const [shake, setShake] = useState(false);
  const [adding, setAdding] = useState(false);
  const [accountName, setAccountName] = useState("Dounia");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const signInAs = (user: string) => {
    if (busy) return;
    setBusy(true);
    setPowerOpen(false);
    window.setTimeout(() => onSignIn(user), 640);
  };

  const submit = () => {
    if (busy) return;
    if (!password.trim()) {
      setShake(true);
      window.setTimeout(() => setShake(false), 520);
      inputRef.current?.focus();
      return;
    }
    signInAs(accountName);
  };

  const commitAccount = () => {
    setAccountName(accountName.trim() || "Invitado");
    setAdding(false);
    setPassword("");
    window.setTimeout(() => inputRef.current?.focus(), 30);
  };

  /* Esc closes the power menu and the add-account form. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPowerOpen(false);
        setAdding(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (sleeping) {
    return (
      <section className="d-cb d-cb-sleep" onClick={() => setSleeping(false)} aria-label="Despertar">
        <div className="d-cb-sleep-icon">
          <IconMoon />
        </div>
        <p>Dounia OS en suspensión</p>
        <small>Pulsa para despertar</small>
      </section>
    );
  }

  return (
    <section className="d-cb" aria-label="Iniciar sesión en Dounia OS">
      <WallpaperLayer wallpaper={wallpaper} fallback={DEFAULT_WALLPAPER} />
      <div className="d-cb-scrim" />

      {/* Top-right status bar (WiFi, battery, time, power). */}
      <div className="d-cb-status">
        <span className="d-cb-status-ico">
          <IconWifi />
        </span>
        <span className="d-cb-status-ico">
          <IconBattery />
        </span>
        <span className="d-cb-status-time">{clock.time}</span>
        <div className="d-cb-power-wrap">
          <button
            type="button"
            className="d-cb-power"
            aria-label="Opciones de energía"
            onClick={() => setPowerOpen((v) => !v)}
          >
            <IconPower />
          </button>
          {powerOpen && (
            <div className="d-cb-power-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPowerOpen(false);
                  setSleeping(true);
                }}
              >
                <IconMoon /> Suspender
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPowerOpen(false);
                  onRestart();
                }}
              >
                <IconRefresh /> Reiniciar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setPowerOpen(false);
                  onSignOut();
                }}
              >
                <IconLock /> Cerrar sesión
              </button>
              <button
                type="button"
                role="menuitem"
                className="danger"
                onClick={() => {
                  setPowerOpen(false);
                  onShutdown();
                }}
              >
                <IconPower /> Apagar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Big clock, bottom-left, like ChromeOS. */}
      <div className="d-cb-clock">
        <strong>{clock.time}</strong>
        <span>{clock.date || `${clock.weekday}, Dounia OS`}</span>
      </div>

      {/* Centre: avatar, name and password field. */}
      <div className={`d-cb-card${shake ? " shake" : ""}${busy ? " is-entering" : ""}`}>
        <div className="d-cb-avatar" aria-hidden="true">
          {accountName.charAt(0).toUpperCase()}
        </div>
        <h1 className="d-cb-name">{accountName}</h1>

        {adding ? (
          <div className="d-cb-add">
            <input
              autoFocus
              value={accountName}
              onChange={(event) => setAccountName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitAccount();
                }
              }}
              placeholder="Nombre de la cuenta"
              aria-label="Nombre de la cuenta"
            />
            <button type="button" className="d-cb-add-btn" onClick={commitAccount}>
              Añadir
            </button>
          </div>
        ) : (
          <div className="d-cb-field">
            <input
              ref={inputRef}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder="Contraseña"
              aria-label="Contraseña"
              autoFocus
            />
            <button type="button" className="d-cb-go" aria-label="Entrar" onClick={submit}>
              <IconChevron />
            </button>
          </div>
        )}

        {shake && <p className="d-cb-error">Escribe tu contraseña para entrar.</p>}
      </div>

      {/* Bottom actions, like ChromeOS guest / add-person. */}
      <div className="d-cb-actions">
        <button type="button" className="d-cb-ghost" onClick={() => signInAs("Invitado")}>
          <IconUserPlus /> Examinar como invitado
        </button>
        <button
          type="button"
          className="d-cb-ghost"
          onClick={() => {
            setAdding((v) => !v);
            setPassword("");
          }}
        >
          <IconPlus /> Añadir cuenta
        </button>
      </div>
    </section>
  );
}
