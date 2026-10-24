"use client";
import React from 'react';

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Página de diagnóstico del motor Scramjet V2.
 *
 * Arranca el motor de verdad: registra el service worker, importa el
 * transporte libcurl, crea el Controller y navega a example.com, anotando cada
 * paso en el DOM (no solo en React, para que se vea siempre qué pasó).
 */

interface ScramjetApi {
  Controller: new (init: {
    serviceworker: ServiceWorker;
    transport: unknown;
    config?: Record<string, string>;
  }) => {
    wait(): Promise<void>;
    prefix: string;
    createFrame(element?: HTMLIFrameElement | null): { go(url: string): void; id: string };
  };
  VERSION?: string;
}

declare global {
  interface Window {
    $scramjetController?: ScramjetApi;
  }
}

type Step = { label: string; ok?: boolean; error?: boolean };

/** Carga un script clásico una sola vez y espera a que esté listo. */
function loadScript(src: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-sj="${key}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.dataset.sj = key;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`no se pudo cargar ${src}`));
    document.head.appendChild(script);
  });
}

/** El motor solo se arranca una vez por pestaña (StrictMode monta dos veces). */
let engineStarted = false;

export default function MotorPage() {
  const [steps, setSteps] = useState<Step[]>([]);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const traceRef = useRef<HTMLPreElement | null>(null);
  const stepRef = useRef<HTMLSpanElement | null>(null);
  const countRef = useRef(0);

  const log = useCallback((label: string, kind?: "ok" | "error") => {
    countRef.current += 1;
    if (stepRef.current) {
      stepRef.current.textContent = `[${String(countRef.current).padStart(2, "0")}] ${label}`;
    }
    if (traceRef.current) {
      traceRef.current.textContent = `${traceRef.current.textContent ?? ""}${label}\n`;
    }
    setSteps((previous) => [...previous, { label, ok: kind === "ok", error: kind === "error" }]);
    if (kind === "error") console.error("[motor]", label);
    else console.warn("[motor]", label);
  }, []);

  useEffect(() => {
    if (engineStarted) return;
    engineStarted = true;

    const run = async () => {
      try {
        /* 1 · service worker */
        log("registrando service worker…");
        const registration = await navigator.serviceWorker.register("/api/sj/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
        const sw = registration.active ?? (await navigator.serviceWorker.ready).active;
        if (!sw) throw new Error("el service worker no llegó a activarse");
        log(`SW activo · scope ${registration.scope}`, "ok");

        /* 2 · núcleo de Scramjet (define globalThis.$scramjet) */
        log("cargando núcleo de Scramjet…");
        await loadScript("/api/sj/scramjet.js", "core");
        if (!(window as unknown as Record<string, unknown>).$scramjet) {
          throw new Error("el núcleo no definió globalThis.$scramjet");
        }
        log("núcleo cargado ($scramjet disponible)", "ok");

        /* 3 · controller */
        log("cargando controller.api.js…");
        await loadScript("/api/sj/controller.api.js", "controller");
        const api = window.$scramjetController;
        if (!api) throw new Error("$scramjetController no está disponible");
        log(`controller API lista · controller ${api.VERSION ?? "?"}`, "ok");

        /* 4 · transporte libcurl sobre Wisp */
        log("importando transporte libcurl…");
        const dynamicImport = new Function("url", "return import(url)") as (
          url: string,
        ) => Promise<{ default?: unknown; LibcurlClient?: unknown }>;
        const mod = await dynamicImport("/api/sj/libcurl-transport.mjs");
        const LibcurlClient = (mod.default ?? mod.LibcurlClient) as new (options: {
          wisp: string;
        }) => { init(): Promise<void> };
        if (!LibcurlClient) throw new Error("el módulo de transporte no exporta LibcurlClient");
        const wispUrl = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/wisp/`;
        const transport = new LibcurlClient({ wisp: wispUrl });
        await transport.init();
        log(`transporte libcurl listo → ${wispUrl}`, "ok");

        /* 5 · controller + frame */
        log("creando el Controller de Scramjet…");
        const controller = new api.Controller({
          serviceworker: sw,
          transport,
          config: {
            scramjetPath: "/api/sj/scramjet.js",
            injectPath: "/api/sj/controller.inject.js",
            wasmPath: "/api/sj/scramjet.wasm",
          },
        });
        await controller.wait();
        log(`Controller listo · prefijo ${controller.prefix}`, "ok");

        /* 6 · navegar */
        const element = frameRef.current;
        log(`marco disponible: ${element ? "sí" : "no"}`);
        if (!element) throw new Error("no hay iframe donde crear el frame");

        const frame = controller.createFrame(element);
        log(`frame creado · ${frame.id}`, "ok");
        frame.go("https://example.com/");
        log("navegación enviada: mira el marco de abajo", "ok");
      } catch (error) {
        console.error("[motor] fallo", error);
        log(`ERROR: ${error instanceof Error ? error.message : String(error)}`, "error");
      }
    };

    void run();
  }, [log]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#07070b",
        color: "#f4f4f5",
        padding: "28px 20px 40px",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <p style={{ fontSize: 11, letterSpacing: "0.28em", color: "#8b5cf6", marginBottom: 10 }}>
          DOUNIA OS · MOTOR
        </p>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em" }}>
          Scramjet V2 · transporte Wisp
        </h1>
        <p style={{ color: "#a1a1ad", fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
          Interceptación con service worker + transporte libcurl sobre <code>/wisp/</code>. Cada
          línea es un paso real ejecutado en este navegador.
        </p>

        <p
          style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: 10,
            background: "#101019",
            border: "1px solid #3b2a63",
            color: "#e9d5ff",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <span ref={stepRef}>esperando…</span>
        </p>

        <ol
          style={{
            listStyle: "none",
            padding: 0,
            marginTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {steps.map((step, index) => (
            <li
              key={`${index}-${step.label}`}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
                padding: "10px 13px",
                borderRadius: 10,
                background: "#0e0e14",
                border: `1px solid ${step.error ? "#7f1d1d" : step.ok ? "#14532d" : "#1f1f28"}`,
                fontSize: 13,
                color: step.error ? "#fca5a5" : step.ok ? "#bbf7d0" : "#d4d4dc",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              <span style={{ color: "#6b6b78" }}>{String(index + 1).padStart(2, "0")}</span>
              <span>{step.label}</span>
            </li>
          ))}
        </ol>

        <pre
          ref={traceRef}
          id="motor-trace"
          style={{
            marginTop: 16,
            padding: "12px 14px",
            borderRadius: 10,
            background: "#0b0b10",
            border: "1px solid #26262f",
            color: "#a5f3fc",
            fontSize: 12,
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
            minHeight: 40,
          }}
        />

        <div
          style={{
            marginTop: 18,
            height: 380,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #26262f",
            background: "#0b0b10",
          }}
        >
          <iframe
            ref={frameRef}
            title="Scramjet"
            style={{ width: "100%", height: "100%", border: 0, background: "#fff" }}
          />
        </div>
      </div>
    </main>
  );
}
