"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * localStorage-backed state that survives reloads and hydration.
 * Renders `initial` on the server, then adopts the saved value on mount.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let parsed: T | null = null;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) parsed = JSON.parse(raw) as T;
    } catch {
      parsed = null;
    }
    setValue((current) => (parsed === null ? current : parsed));
    setHydrated(true);
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked: the session still works in memory */
    }
  }, [key, value, hydrated]);

  const update = useCallback((next: T | ((previous: T) => T)) => {
    setValue((previous) => (typeof next === "function" ? (next as (p: T) => T)(previous) : next));
  }, []);

  return [value, update, hydrated] as const;
}

export interface ClockValue {
  time: string;
  shortTime: string;
  weekday: string;
  date: string;
  meridiem: string;
}

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export interface ClockOptions {
  /** 24-hour clock (default) or 12-hour with AM/PM. */
  h24?: boolean;
  /** Append seconds and tick every second. */
  seconds?: boolean;
}

function readClock(now: Date, options: ClockOptions): ClockValue {
  const h24 = options.h24 !== false;
  const withSeconds = Boolean(options.seconds);
  const hh = now.getHours();
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");
  const hourLabel = h24 ? hh.toString().padStart(2, "0") : String(hh % 12 || 12);
  const suffix = h24 ? "" : hh >= 12 ? " PM" : " AM";
  return {
    time: `${hourLabel}:${mm}${withSeconds ? `:${ss}` : ""}${suffix}`,
    shortTime: `${hourLabel}:${mm}${suffix}`,
    weekday: (WEEKDAYS[now.getDay()] ?? "").toUpperCase(),
    date: `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`,
    meridiem: hh >= 12 ? "PM" : "AM",
  };
}

/** Live clock; starts with a neutral value so SSR and the client agree. */
export function useClock(options: ClockOptions = {}): ClockValue {
  const h24 = options.h24 !== false;
  const seconds = Boolean(options.seconds);
  const [clock, setClock] = useState<ClockValue>({
    time: "--:--",
    shortTime: "--:--",
    weekday: "",
    date: "",
    meridiem: "",
  });

  useEffect(() => {
    const tick = () => setClock(readClock(new Date(), { h24, seconds }));
    tick();
    const id = window.setInterval(tick, seconds ? 1_000 : 15_000);
    return () => window.clearInterval(id);
  }, [h24, seconds]);

  return clock;
}
