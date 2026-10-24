"use client";
import React from 'react';

import { useEffect, useMemo, useRef, useState } from "react";

import { fileCount, formatBytes, totalBytes, useFsTree } from "@/lib/os/fs";
import { AppIcon } from "../AppIcon";
import { IconCpu } from "../icons";

export interface ProcessInfo {
  id: string;
  title: string;
  sub: string;
  icon: string;
  accent: string;
  minimized: boolean;
  appId: string;
}

export interface MonitorAppProps {
  processes: ProcessInfo[];
  onKill: (id: string) => void;
  onFocusWindow: (id: string) => void;
}

function hash(value: string): number {
  let h = 0;
  for (let index = 0; index < value.length; index += 1) {
    h = (h * 31 + value.charCodeAt(index)) % 997;
  }
  return h;
}

function useFps() {
  const [fps, setFps] = useState(60);
  const [series, setSeries] = useState<number[]>([]);
  useEffect(() => {
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (time: number) => {
      frames += 1;
      if (time - last >= 1000) {
        const value = Math.round((frames * 1000) / (time - last));
        setFps(value);
        setSeries((previous) => [...previous.slice(-39), value]);
        frames = 0;
        last = time;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return { fps, series };
}

export function MonitorApp({ processes, onKill, onFocusWindow }: MonitorAppProps) {
  const tree = useFsTree();
  const { fps, series } = useFps();
  const [tick, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);
  const started = useRef(typeof window === "undefined" ? 0 : Date.now());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setTick((value) => value + 1), 1800);
    return () => window.clearInterval(id);
  }, []);

  const heap = useMemo(() => {
    const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } })
      .memory;
    if (!memory) return null;
    return { used: memory.usedJSHeapSize, limit: memory.jsHeapSizeLimit };
  }, [tick]);

  const [device, setDevice] = useState<{
    cores: number | null;
    memory: number | null;
    width: number;
    height: number;
    dpr: number;
    online: boolean;
    effective: string | null;
  } | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { effectiveType?: string } };
    setDevice({
      cores: nav.hardwareConcurrency ?? null,
      memory: nav.deviceMemory ?? null,
      width: window.innerWidth,
      height: window.innerHeight,
      dpr: window.devicePixelRatio || 1,
      online: nav.onLine,
      effective: nav.connection?.effectiveType ?? null,
    });
  }, [tick]);

  const uptimeMinutes = Math.floor((Date.now() - started.current) / 60000);
  const uptimeSeconds = Math.floor(((Date.now() - started.current) % 60000) / 1000);

  const rows = useMemo(
    () =>
      processes.map((process) => {
        const base = hash(process.id) % 9;
        const drift = ((tick + hash(process.appId)) % 5) * 0.6;
        return {
          ...process,
          cpu: Math.min(98, Number((base + drift + (process.minimized ? 0 : 1.4)).toFixed(1))),
          memory: 42 + (hash(`${process.id}-mem`) % 190),
        };
      }),
    [processes, tick],
  );

  const totalCpu = rows.reduce((sum, row) => sum + row.cpu, 0);
  const totalMemory = rows.reduce((sum, row) => sum + row.memory, 0);

  return (
    <div className="monitor">
      <div className="monitor-cards">
        <div className="monitor-card">
          <span>CPU estimada</span>
          <strong>{Math.min(100, Math.round(totalCpu))}%</strong>
          <div className="monitor-bar">
            <i style={{ width: `${Math.min(100, totalCpu)}%` }} />
          </div>
          <small>{rows.length} procesos activos</small>
        </div>
        <div className="monitor-card">
          <span>Memoria de la app</span>
          <strong>{mounted && heap ? formatBytes(heap.used) : `${totalMemory} MB`}</strong>
          <div className="monitor-bar">
            <i
              style={{
                width: `${Math.min(
                  100,
                  mounted && heap ? (heap.used / heap.limit) * 100 : totalMemory / 8,
                )}%`,
              }}
            />
          </div>
          <small>{mounted && heap ? `límite ${formatBytes(heap.limit)}` : "estimada por proceso"}</small>
        </div>
        <div className="monitor-card">
          <span>FPS reales</span>
          <strong className={fps < 45 ? "warn" : ""}>{fps}</strong>
          <div className="monitor-spark">
            {series.map((value, index) => (
              <i key={index} style={{ height: `${Math.min(100, (value / 70) * 100)}%` }} />
            ))}
          </div>
          <small>{fps >= 55 ? "fluido" : fps >= 40 ? "aceptable" : "bajo · cierra ventanas"}</small>
        </div>
      </div>

      <div className="monitor-table">
        <div className="monitor-head">
          <span>Proceso</span>
          <span>CPU</span>
          <span>Memoria</span>
          <span />
        </div>
        {rows.length === 0 && <p className="monitor-empty">No hay ventanas abiertas.</p>}
        {rows.map((row) => (
          <div key={row.id} className="monitor-row">
            <button type="button" className="monitor-name" onClick={() => onFocusWindow(row.id)}>
              <AppIcon src={row.icon} alt={row.title} accent={row.accent} size={22} />
              <span>
                <strong>{row.title}</strong>
                <small>{row.sub}</small>
              </span>
            </button>
            <span className="monitor-num">{row.cpu}%</span>
            <span className="monitor-num">{row.memory} MB</span>
            <button type="button" className="monitor-kill" onClick={() => onKill(row.id)}>
              Finalizar
            </button>
          </div>
        ))}
      </div>

      <div className="monitor-sys">
        <p>
          <IconCpu /> Sistema
        </p>
        <div className="monitor-sys-grid">
          <span>Sistema operativo</span>
          <strong>Dounia OS v4 «Aura»</strong>
          <span>Hilos de CPU</span>
          <strong>{device?.cores ?? "—"}</strong>
          <span>Memoria del equipo</span>
          <strong>{device?.memory ? `${device.memory} GB` : "no expuesta"}</strong>
          <span>Pantalla</span>
          <strong>
            {device ? `${device.width}×${device.height} @ ${device.dpr}x` : "—"}
          </strong>
          <span>Conexión</span>
          <strong>
            {device
              ? device.online
                ? `en línea${device.effective ? ` · ${device.effective}` : ""}`
                : "sin conexión"
              : "—"}
          </strong>
          <span>Tiempo encendido</span>
          <strong>{mounted ? `${uptimeMinutes} min ${uptimeSeconds} s` : "—"}</strong>
          <span>Archivos</span>
          <strong>
            {fileCount(tree)} · {formatBytes(totalBytes(tree))}
          </strong>
        </div>
        <small className="monitor-note">
          CPU y memoria por proceso son estimaciones del shell web; los FPS, el heap y los datos del dispositivo son
          mediciones reales del navegador.
        </small>
      </div>
    </div>
  );
}
