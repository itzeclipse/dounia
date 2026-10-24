"use client";
import React from 'react';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACCENTS,
  APPS,
  APP_MAP,
  CATEGORY_LABEL,
  DEFAULT_WALLPAPER,
  GHOSTCLOUD_GROUP,
  LINK_GROUPS,
  ORIGINAL_WALLPAPER,
  WALLPAPERS,
  THEMES,
  hostOf,
  wallpaperById,
  type AppCategory,
  type OSApp,
  type ThemeId,
  type Wallpaper,
} from "@/lib/os/data";
import { useClock, usePersistentState } from "@/lib/os/hooks";

import { AppIcon } from "./AppIcon";
import { AuraFX } from "./AuraFX";
import { CinemaHome } from "./CinemaHome";
import { ConsoleHome } from "./ConsoleHome";
import { CursorFX } from "./CursorFX";
import { QuickWallpapers } from "./QuickWallpapers";
import { SystemPanel } from "./SystemPanel";
import { WindowFrame, type WindowRect } from "./WindowFrame";
import { CalculatorApp } from "./apps/CalculatorApp";
import { FilesApp } from "./apps/FilesApp";
import { MonitorApp, type ProcessInfo } from "./apps/MonitorApp";
import { NotesApp } from "./apps/NotesApp";
import { TerminalApp } from "./apps/TerminalApp";
import { BootScreen } from "./BootScreen";
import { LockScreen } from "./LockScreen";
import { PhoneHome } from "./PhoneHome";
import { WallpaperLayer } from "./WallpaperLayer";
import { CommandPalette } from "./CommandPalette";
import { CiriConsole } from "./apps/CiriConsole";
import { CloudGamesApp } from "./apps/CloudGamesApp";
import { EmbedApp } from "./apps/EmbedApp";
import { FeedApp } from "./apps/FeedApp";
import { LinkDirectory } from "./apps/LinkDirectory";
import { CinemitasApp } from "./apps/CinemitasApp";
import { PersonalBrowser } from "./apps/PersonalBrowser";
import { RacoonGames } from "./apps/RacoonGames";
import { ScramjetBrowser } from "./apps/ScramjetBrowser";
import { ProxyHub } from "./apps/ProxyHub";
import { RaccoonGamesApp } from "./apps/RaccoonGamesApp";
import { SignIn } from "./SignIn";
import { GamesApp } from "./apps/GamesApp";
import { SettingsApp, type OSSettings } from "./apps/SettingsApp";
import { VMDirectory } from "./apps/VMDirectory";
import { WolfDirectory } from "./apps/WolfDirectory";
import { Widgets } from "./Widgets";
import {
  IconBolt,
  IconClose,
  IconExternal,
  IconFolder,
  IconGrid,
  IconImage,
  IconTerminal,
  IconLock,
  IconMinus,
  IconMonitor,
  IconPlus,
  IconPower,
  IconRefresh,
  IconSearch,
  IconShield,
  IconStar,
} from "./icons";

interface OSWindow {
  id: string;
  appId: string;
  minimized: boolean;
  maximized: boolean;
  z: number;
  proxyTarget?: string;
  fullscreen?: boolean;
}

interface ToastItem {
  id: number;
  title: string;
  body: string;
}

interface ContextState {
  x: number;
  y: number;
}

const DEFAULT_SETTINGS: OSSettings = {
  skipBoot: false,
  optimizedBg: false,
  showLabels: true,
  startVolume: true,
  theme: "gamer",
  widgets: true,
  aura: true,
  sounds: false,
  cursor: true,
  accent: "violeta",
  mode: "dark",
  glass: 82,
  dim: 30,
  iconSize: "m",
  autoWallpaper: false,
  reduceMotion: false,
  sysHud: false,
  brightness: 100,
  volume: 70,
  wifi: true,
  bluetooth: false,
  dnd: false,
  power: "balanced",
  clock24: true,
  clockSeconds: false,
  nightLight: false,
  wallBlur: 0,
  autoLock: false,
  keepAwake: true,
};

const DEFAULT_DESKTOP = [
  "browser",
  "terminal",
  "files",
  "notes",
  "calc",
  "monitor",
  "movies",
  "scramjet",
  "ghostcloud",
  "htmlgames",
  "raccoongames",
  "cloudgames",
  "bravebrowser",
  "startpageweb",
  "wolfunblock",
  "snackexpo",
  "pluto",
  "youtube",
  "twitch",
  "ciri",
  "settings",
];

const MAX_WINDOWS = 5;

export function DouniaOS({
  startAt = "boot",
  openStudio = false,
  openDrawer = false,
  initialApp,
  initialGame,
  initialCine,
  themeOverride,
  openPalette = false,
}: {
  startAt?: "boot" | "signin" | "lock" | "desktop";
  openStudio?: boolean;
  openDrawer?: boolean;
  initialApp?: string;
  /** Slug de CrazyGames que la consola abre al entrar. */
  initialGame?: string;
  /** Título de Cinemitas que se abre al entrar (enlace compartible). */
  initialCine?: string;
  themeOverride?: ThemeId;
  openPalette?: boolean;
}) {
  const [settings, setSettings, settingsReady] = usePersistentState<OSSettings>("dounia.settings.v3", DEFAULT_SETTINGS);
  const clock = useClock({ h24: settings.clock24 ?? true, seconds: settings.clockSeconds ?? false });

  /* Las preferencias guardadas de antes no tienen los ajustes nuevos (modo
   * claro, cristal, oscurecido…). Sin esto, cualquier opción recién añadida se
   * quedaba a undefined y no se aplicaba nunca. */
  useEffect(() => {
    if (!settingsReady) return;
    const missing = Object.keys(DEFAULT_SETTINGS).filter(
      (key) => !(key in (settings as unknown as Record<string, unknown>)),
    );
    if (missing.length === 0) return;
    setSettings((previous) => ({ ...DEFAULT_SETTINGS, ...previous }));
  }, [settingsReady, settings, setSettings]);
  const [homeId, setHomeId, homeReady] = usePersistentState<string>("dounia.wall.home.v3", DEFAULT_WALLPAPER.id);
  const [lockId, setLockId, lockReady] = usePersistentState<string>("dounia.wall.lock.v3", DEFAULT_WALLPAPER.id);
  const [favorites, , favoritesReady] = usePersistentState<string[]>("dounia.wall.favorites.v3", []);
  const [pinned, setPinned] = usePersistentState<string[]>(
    "dounia.pinned.v4",
    APPS.filter((app) => app.pinned).map((app) => app.id),
  );
  const [desktop, setDesktop] = usePersistentState<string[]>("dounia.desktop.v4", DEFAULT_DESKTOP);
  const [lastAppId, setLastAppId] = usePersistentState<string>("dounia.last.v3", "");

  const [phase, setPhase] = useState<"boot" | "signin" | "lock" | "desktop" | "off">(startAt);
  const [signedUser, setSignedUser] = usePersistentState<string>("dounia.user.v3", "Dounia");
  const [windows, setWindows] = useState<OSWindow[]>(() =>
    initialApp && APP_MAP[initialApp]
      ? [
          {
            id: `${initialApp}-start`,
            appId: initialApp,
            minimized: false,
            maximized: false,
            z: 21,
            proxyTarget: APP_MAP[initialApp].kind === "scramjet" ? APP_MAP[initialApp].url : undefined,
          },
        ]
      : [],
  );
  const [snapPreview, setSnapPreview] = useState<WindowRect | null>(null);
  const [sysPanelOpen, setSysPanelOpen] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(openDrawer);
  const [context, setContext] = useState<ContextState | null>(null);
  const [appMenu, setAppMenu] = useState<{ x: number; y: number; appId: string } | null>(null);
  const [themeMenu, setThemeMenu] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<AppCategory | "all">("all");
  const [dragging, setDragging] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [quickOpen, setQuickOpen] = useState(openStudio);
  const [paletteOpen, setPaletteOpen] = useState(openPalette);
  const [showHint, setShowHint] = useState(false);
  const [backend, setBackend] = useState<"checking" | "online" | "offline">("checking");
  const [liveCss, setLiveCss] = useState("");
  const toastId = useRef(1);
  const zCounter = useRef(22);
  const dragInfo = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null);

  const ready = settingsReady && homeReady && lockReady && favoritesReady;
  const theme: ThemeId = themeOverride ?? settings.theme ?? "gamer";

  /* Keep-alive: mientras el sistema esté abierto, una petición ligera cada
   * cuatro minutos mantiene el contenedor del preview despierto y un wake lock
   * impide que ChromeOS apague la pantalla. No puede impedir que la plataforma
   * duerma una pestaña cerrada; para eso hace falta un monitor externo o un
   * hosting siempre encendido. */
  useEffect(() => {
    if (!settings.keepAwake) return;
    let stopped = false;

    const ping = () => {
      if (stopped) return;
      void fetch("/api/wisp-status", { cache: "no-store" }).catch(() => undefined);
    };
    const timer = window.setInterval(ping, 4 * 60 * 1000);

    /* Screen Wake Lock: ChromeOS lo soporta y evita el apagado de pantalla.
     * El navegador exige un gesto del usuario, así que se pide en el primer
     * clic/tecla y se vuelve a pedir al recuperar la pestaña. */
    type WakeLockLike = { release: () => Promise<void> };
    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockLike> };
    };
    let lock: WakeLockLike | null = null;
    const requestLock = () => {
      if (stopped || lock || !nav.wakeLock) return;
      nav.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (stopped) void sentinel.release().catch(() => undefined);
          else lock = sentinel;
        })
        .catch(() => undefined);
    };
    const releaseLock = () => {
      if (!lock) return;
      void lock.release().catch(() => undefined);
      lock = null;
    };
    const onFirstGesture = () => {
      requestLock();
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      ping();
      releaseLock();
      requestLock();
    };

    window.addEventListener("pointerdown", onFirstGesture);
    window.addEventListener("keydown", onFirstGesture);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stopped = true;
      window.clearInterval(timer);
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
      document.removeEventListener("visibilitychange", onVisible);
      releaseLock();
    };
  }, [settings.keepAwake]);

  /* Sistema x300 · bloqueo automático: cinco minutos sin actividad devuelven
   * la pantalla de bloqueo, sin cerrar ninguna ventana. */
  useEffect(() => {
    if (!settings.autoLock || phase !== "desktop") return;
    let timer = 0;
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setPhase("lock"), 5 * 60 * 1000);
    };
    reset();
    const events = ["pointerdown", "keydown", "wheel", "touchstart"];
    events.forEach((name) => window.addEventListener(name, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((name) => window.removeEventListener(name, reset));
    };
  }, [settings.autoLock, phase]);

  const homeWallpaper = useMemo(() => wallpaperById(homeId), [homeId]);
  const lockWallpaper = useMemo(() => wallpaperById(lockId), [lockId]);

  const toast = useCallback((title: string, body: string) => {
    const id = toastId.current++;
    setToasts((previous) => [...previous.slice(-3), { id, title, body }]);
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((item) => item.id !== id));
    }, 4600);
  }, []);

  /* Boot: skip straight to the lock screen when the user asked for fast boot. */
  useEffect(() => {
    if (!ready) return;
    if (settings.skipBoot && phase === "boot") setPhase("signin");
  }, [ready, settings.skipBoot, phase]);

  /* Deep links: /?skip=1 jumps to the desktop, ?studio=1 opens the studio,
     ?app=<id> launches an app. Handy for demos and for the host preview. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("skip") !== "1") return;
    setPhase("desktop");
    if (params.get("studio") === "1") setQuickOpen(true);
    if (params.get("panel") === "1") setSysPanelOpen(true);
    const appId = params.get("app");
    if (appId && APP_MAP[appId]) {
      setWindows([{ id: `${appId}-deep`, appId, minimized: false, maximized: false, z: 21 }]);
      setLastAppId(appId);
    }
  }, [setLastAppId]);

  /* Backend health: proves the proxy/link-checker is actually reachable. */
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const response = await fetch("/api/link-check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ urls: ["https://cineby.tech"] }),
        });
        if (!response.ok) throw new Error("bad status");
        const data = (await response.json()) as { results?: Array<{ ok: boolean }> };
        if (!cancelled) setBackend(data.results?.[0]?.ok ? "online" : "offline");
      } catch {
        if (!cancelled) setBackend("offline");
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Onboarding: the double-click hint shows itself for the first seconds. */
  useEffect(() => {
    if (phase !== "desktop") return;
    setShowHint(true);
    const id = window.setTimeout(() => setShowHint(false), 9000);
    return () => window.clearTimeout(id);
  }, [phase]);

  /* First run on a modest machine: pick the light wallpaper so the desktop
     stays fluid. Only applied once and the setting is still editable. */
  useEffect(() => {
    if (!ready) return;
    const KEY = "dounia.tuned.v4";
    try {
      if (window.localStorage.getItem(KEY)) return;
      window.localStorage.setItem(KEY, "1");
      const cores = navigator.hardwareConcurrency ?? 8;
      if (cores <= 4) setSettings((previous) => ({ ...previous, optimizedBg: true }));
    } catch {
      /* storage blocked: nothing to tune */
    }
  }, [ready, setSettings]);

  /* Optional auto-rotation: a slow, quiet wallpaper carousel. */
  useEffect(() => {
    if (!settings.autoWallpaper || phase !== "desktop") return;
    const pool = WALLPAPERS.filter((wallpaper) => wallpaper.type !== "video");
    const id = window.setInterval(() => {
      setHomeId((previous) => {
        const index = pool.findIndex((wallpaper) => wallpaper.id === previous);
        return pool[(index + 1) % pool.length]?.id ?? previous;
      });
    }, 45_000);
    return () => window.clearInterval(id);
  }, [settings.autoWallpaper, phase, setHomeId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Exit fullscreen first when any app is in fullscreen.
        setWindows((previous) =>
          previous.some((win) => win.fullscreen)
            ? previous.map((win) => (win.fullscreen ? { ...win, fullscreen: false } : win))
            : previous,
        );
        setQuickOpen(false);
        setStartOpen(false);
        setDrawerOpen(false);
        setContext(null);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((previous) => !previous);
        setStartOpen(false);
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openApp = useCallback(
    (appId: string, options?: { url?: string }) => {
      const app = APP_MAP[appId];
      if (!app) return;
      const targetUrl = options?.url ?? (app.kind === "scramjet" ? app.url : undefined);
      const z = (zCounter.current += 1);
      setWindows((previous) => {
        const existing = previous.find((win) => win.appId === appId);
        if (existing) {
          return previous.map((win) =>
            win.appId === appId
              ? {
                  ...win,
                  minimized: false,
                  z,
                  proxyTarget: options?.url ? options.url : win.proxyTarget ?? targetUrl,
                }
              : win,
          );
        }
        const next = [
          ...previous,
          {
            id: `${appId}-${Date.now()}`,
            appId,
            minimized: false,
            maximized: false,
            z,
            proxyTarget: targetUrl,
          },
        ];
        return next.slice(-MAX_WINDOWS);
      });
      setLastAppId(appId);
      setStartOpen(false);
      setDrawerOpen(false);
      setContext(null);
      setSysPanelOpen(false);
    },
    [setLastAppId],
  );

  /* Mi navegador entra una sola vez también en los escritorios ya guardados. */
  useEffect(() => {
    try {
      if (window.localStorage.getItem("dounia.browser.seeded.v1")) return;
      window.localStorage.setItem("dounia.browser.seeded.v1", "1");
      setDesktop((previous) => (previous.includes("browser") ? previous : ["browser", ...previous]));
      setPinned((previous) => (previous.includes("browser") ? previous : ["browser", ...previous]));
    } catch {
      /* almacenamiento bloqueado: el escritorio por defecto ya lo incluye */
    }
  }, [setDesktop, setPinned]);

  const openProxy = useCallback(
    (url: string) => {
      openApp("scramjet", { url });
      toast("Scramjet V2", `Abriendo ${hostOf(url)} con el motor del sistema.`);
    },
    [openApp, toast],
  );

  const closeWindow = useCallback((id: string) => {
    setWindows((previous) => previous.filter((win) => win.id !== id));
  }, []);

  const closeApp = useCallback((appId: string) => {
    setWindows((previous) => previous.filter((win) => win.appId !== appId));
  }, []);

  const focusWindow = useCallback((id: string) => {
    setWindows((previous) => {
      const target = previous.find((win) => win.id === id);
      if (!target) return previous;
      const top = previous.reduce((max, win) => Math.max(max, win.z), 0);
      if (target.z === top && !target.minimized) return previous;
      const z = (zCounter.current += 1);
      return previous.map((win) => (win.id === id ? { ...win, z, minimized: false } : win));
    });
  }, []);

  const minimizeWindow = useCallback((id: string) => {
    setWindows((previous) => previous.map((win) => (win.id === id ? { ...win, minimized: true } : win)));
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows((previous) =>
      previous.map((win) => (win.id === id ? { ...win, maximized: !win.maximized, z: (zCounter.current += 1) } : win)),
    );
  }, []);

  const toggleFullscreen = useCallback((id: string) => {
    setWindows((previous) =>
      previous.map((win) =>
        win.id === id
          ? {
              ...win,
              fullscreen: !win.fullscreen,
              maximized: win.fullscreen ? win.maximized : true,
              z: (zCounter.current += 1),
            }
          : win,
      ),
    );
  }, []);

  const cycleWindows = useCallback(() => {
    setWindows((previous) => {
      const open = previous.filter((win) => !win.minimized).sort((a, b) => a.z - b.z);
      if (open.length < 2) return previous;
      const bottom = open[0]!;
      const z = (zCounter.current += 1);
      return previous.map((win) => (win.id === bottom.id ? { ...win, z } : win));
    });
  }, []);

  const shutdown = useCallback(() => {
    setSysPanelOpen(false);
    setWindows([]);
    setPhase("off");
  }, []);

  const restart = useCallback(() => {
    setSysPanelOpen(false);
    setPhase("boot");
    setWindows([]);
    toast("Reiniciando", "El escritorio vuelve a arrancar.");
  }, [toast]);

  const signOut = useCallback(() => {
    setSysPanelOpen(false);
    setWindows([]);
    setSignedUser("Dounia");
    setPhase("signin");
    toast("Sesión cerrada", "Vuelve a iniciar sesión para entrar.");
  }, [toast, setSignedUser]);

  /* Window shortcuts, like a real desktop. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const typing = Boolean(
        active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable),
      );
      const top = windows
        .filter((win) => !win.minimized)
        .reduce<OSWindow | null>((acc, win) => (!acc || win.z > acc.z ? win : acc), null);

      if ((event.altKey && event.key === "Tab") || ((event.ctrlKey || event.metaKey) && event.key === "`")) {
        event.preventDefault();
        cycleWindows();
        return;
      }
      // Alt+T on purpose: ChromeOS reserves Ctrl+Alt+T for crosh.
      if (event.altKey && !event.ctrlKey && !event.metaKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        openApp("terminal");
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        openApp("terminal");
        return;
      }
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "w" && !typing) {
        if (top) {
          event.preventDefault();
          closeWindow(top.id);
        }
        return;
      }
      if (event.key === "F11") {
        if (top) {
          event.preventDefault();
          toggleMaximize(top.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [windows, cycleWindows, closeWindow, toggleMaximize, openApp]);

  const applyWallpaper = useCallback(
    (wallpaper: Wallpaper, target: "both" | "home" | "lock" = "both") => {
      if (target !== "lock") setHomeId(wallpaper.id);
      if (target !== "home") setLockId(wallpaper.id);
      toast(
        "Fondo aplicado",
        `${wallpaper.name} · ${target === "both" ? "escritorio y bloqueo" : target === "home" ? "escritorio" : "bloqueo"}`,
      );
    },
    [setHomeId, setLockId, toast],
  );

  const restoreOriginal = useCallback(() => {
    setHomeId(ORIGINAL_WALLPAPER.id);
    setLockId(ORIGINAL_WALLPAPER.id);
    toast("Fondo original restaurado", "Vuelve el bucle «Snake Skeleton» de CineOS.");
  }, [setHomeId, setLockId, toast]);

  const resetPreferences = useCallback(() => {
    try {
      window.localStorage.removeItem("dounia.settings.v3");
      window.localStorage.removeItem("dounia.wall.home.v3");
      window.localStorage.removeItem("dounia.wall.lock.v3");
      window.localStorage.removeItem("dounia.wall.favorites.v3");
      window.localStorage.removeItem("dounia.pinned.v3");
      window.localStorage.removeItem("dounia.positions.v3");
      window.localStorage.removeItem("dounia.last.v3");
    } catch {
      /* ignore */
    }
    window.location.reload();
  }, []);

  const desktopApps = useMemo(
    () => desktop.map((id) => APP_MAP[id]).filter((app): app is OSApp => Boolean(app)),
    [desktop],
  );

  const addToDesktop = useCallback(
    (appId: string) => {
      setDesktop((previous) => (previous.includes(appId) ? previous : [...previous, appId]));
      toast("Añadida al escritorio", `${APP_MAP[appId]?.name ?? "App"} ya está en el escritorio.`);
    },
    [setDesktop, toast],
  );

  const removeFromDesktop = useCallback(
    (appId: string) => {
      setDesktop((previous) => previous.filter((id) => id !== appId));
      toast("Quitada del escritorio", `${APP_MAP[appId]?.name ?? "App"} sigue disponible en el cajón de apps.`);
    },
    [setDesktop, toast],
  );

  const iconPosition = useCallback(
    (index: number) => {
      const perColumn = 5;
      const column = Math.floor(index / perColumn);
      const row = index % perColumn;
      return { x: 20 + column * 104, y: 16 + row * 104 };
    },
    [],
  );

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return APPS.filter((app) => {
      const matchesCategory = category === "all" || app.category === category;
      const matchesQuery = !q || app.name.toLowerCase().includes(q) || app.sub.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const pinnedApps = useMemo(
    () => pinned.map((id) => APP_MAP[id]).filter((app): app is OSApp => Boolean(app)),
    [pinned],
  );

  const startResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pinnedApps;
    return APPS.filter((app) => app.name.toLowerCase().includes(q) || app.sub.toLowerCase().includes(q));
  }, [pinnedApps, query]);

  const accent = useMemo(
    () => ACCENTS.find((item) => item.id === settings.accent) ?? ACCENTS[0],
    [settings.accent],
  );

  const activeWindows = windows.filter((win) => !win.minimized);
  const runningIds = new Set(windows.map((win) => win.appId));
  const lastApp = lastAppId ? APP_MAP[lastAppId] : undefined;
  const fullscreenActive = activeWindows.some((win) => win.fullscreen);

  /* ----- drag desktop icons ------------------------------------------- */

  const onIconPointerDown = (event: React.PointerEvent, app: OSApp) => {
    if (event.button !== 0) return;
    dragInfo.current = { id: app.id, startX: event.clientX, startY: event.clientY, moved: false };
    setDragging(app.id);
    setDrag({ id: app.id, dx: 0, dy: 0 });
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onIconPointerMove = (event: React.PointerEvent) => {
    const info = dragInfo.current;
    if (!info) return;
    const dx = event.clientX - info.startX;
    const dy = event.clientY - info.startY;
    if (!info.moved && Math.hypot(dx, dy) < 6) return;
    info.moved = true;
    const width = window.innerWidth;
    const height = window.innerHeight;
    setDrag({
      id: info.id,
      dx: Math.max(-info.startX + 8, Math.min(dx, width - info.startX - 96)),
      dy: Math.max(-info.startY + 64, Math.min(dy, height - info.startY - 116)),
    });
  };

  const onIconPointerUp = (app: OSApp) => {
    const info = dragInfo.current;
    dragInfo.current = null;
    setDragging(null);
    setDrag(null);
    if (info && !info.moved) openApp(app.id);
  };

  const focusedWindowId =
    activeWindows.reduce<OSWindow | null>((top, win) => (!top || win.z > top.z ? win : top), null)?.id ?? null;
  const brightness = (settings.brightness ?? 100) / 100;

  const glass = Math.min(100, Math.max(30, settings.glass ?? 82)) / 100;
  const dim = Math.min(80, Math.max(0, settings.dim ?? 30)) / 100;
  const power = settings.power ?? "balanced";
  const wallBlur = Math.min(18, Math.max(0, settings.wallBlur ?? 0));
  const nightLight = Boolean(settings.nightLight);

  const shellStyle = {
    "--d-accent": accent.hex,
    "--d-accent-soft": accent.soft,
    "--d-glass": `${glass}`,
    "--d-glass-strong": `${Math.min(1, glass + 0.12)}`,
    "--d-dim": `${dim}`,
    "--d-wall-blur": `${wallBlur}px`,
    ...(brightness < 0.995 ? { filter: `brightness(${brightness})` } : {}),
  } as React.CSSProperties;

  const consoleMode: "playstation" | "xbox" | "nintendo" | null =
    theme === "playstation" || theme === "xbox" || theme === "nintendo" ? theme : null;
  const cinemaMode = theme === "cinema";
  const phoneMode: "samsung" | "iphone" | null =
    theme === "samsung" || theme === "iphone" ? theme : null;
  const immersiveMode = Boolean(consoleMode) || cinemaMode || Boolean(phoneMode);

  const shellClass = `d-os${settings.cursor ? " d-gcursor-on" : ""}${fullscreenActive ? " d-fullscreen" : ""}${
    immersiveMode ? " d-console-mode" : ""
  }${consoleMode ? ` console-${consoleMode}` : ""}${cinemaMode ? " d-cinema-mode" : ""}${
    phoneMode ? ` d-phone-mode phone-${phoneMode}` : ""
  }`;
  const shellData = {
    "data-icon-size": settings.iconSize,
    "data-motion": settings.reduceMotion ? "off" : "on",
    "data-mode": settings.mode ?? "dark",
    "data-power": power,
    "data-nightlight": nightLight ? "on" : "off",
    ...(consoleMode
      ? { "data-console": consoleMode }
      : cinemaMode
        ? { "data-console": "cinema" }
        : phoneMode
          ? { "data-console": phoneMode }
          : {}),
  };

  if (phase === "off") {
    return (
      <div className={shellClass} data-theme={theme} style={shellStyle} {...shellData}>
        <div className="d-off">
          <button type="button" className="d-off-btn" aria-label="Encender" onClick={() => setPhase("boot")}>
            <IconPower />
          </button>
          <p>Dounia OS está apagado</p>
          <small>Pulsa el botón para encender</small>
        </div>
        <CursorFX enabled={settings.cursor} />
      </div>
    );
  }

  if (phase === "boot") {
    return (
      <div className={shellClass} data-theme={theme} style={shellStyle} {...shellData}>
        <BootScreen onEnter={() => setPhase("signin")} />
        <CursorFX enabled={settings.cursor} />
      </div>
    );
  }

  return (
    <div className={shellClass} data-theme={theme} style={shellStyle} {...shellData}>
      {phase === "signin" && (
        <SignIn
          wallpaper={wallpaperById("live-aurora")}
          clock={clock}
          onSignIn={(user) => {
            setSignedUser(user);
            setPhase("desktop");
            toast(`Bienvenida, ${user}`, "Dounia OS listo. Terminal, Archivos, Monitor y el Proxy Hub disponibles.");
          }}
          onShutdown={shutdown}
          onRestart={restart}
          onSignOut={signOut}
        />
      )}

      {phase === "lock" && (
        <LockScreen
          wallpaper={lockWallpaper}
          clock={clock}
          onUnlock={() => setPhase("desktop")}
        />
      )}
      <div className={`d-desktop${settings.showLabels ? "" : " d-labels-hidden"}`}>
        <WallpaperLayer
          wallpaper={homeWallpaper}
          fallback={DEFAULT_WALLPAPER}
          still={homeWallpaper.type === "video" && (Boolean(settings.optimizedBg) || power === "eco")}
        />

        {nightLight && <div className="d-nightlight" aria-hidden="true" />}

        {consoleMode && (
          <ConsoleHome
            mode={consoleMode}
            clock={clock}
            user={signedUser}
            onModeChange={(mode) => {
              /* Las rutas /theme/<id> fijan el estilo por URL: allí cambiamos de
               * consola navegando, en el escritorio normal basta el ajuste. */
              if (window.location.pathname.startsWith("/theme/")) {
                window.location.href = `/theme/${mode}`;
                return;
              }
              setSettings((previous) => ({ ...previous, theme: mode }));
              toast("Modo consola", `El sistema ahora es una ${mode === "playstation" ? "PlayStation 5" : mode === "xbox" ? "Xbox Series X" : "Nintendo Switch"}.`);
            }}
            onExit={() => {
              if (window.location.pathname.startsWith("/theme/")) {
                window.location.href = "/desktop";
                return;
              }
              setSettings((previous) => ({ ...previous, theme: "gamer" }));
              toast("Modo escritorio", "Vuelves al escritorio de Dounia OS.");
            }}
            onOpenApps={() => setDrawerOpen(true)}
            onOpenSettings={() => openApp("settings")}
            onOpenWallpapers={() => setQuickOpen(true)}
            onLock={() => setPhase("lock")}
            onToast={toast}
            initialGame={initialGame}
          />
        )}

        {cinemaMode && (
          <CinemaHome
            clock={clock}
            user={signedUser}
            onExit={() => {
              if (window.location.pathname.startsWith("/theme/")) {
                window.location.href = "/desktop";
                return;
              }
              setSettings((previous) => ({ ...previous, theme: "gamer" }));
              toast("Modo escritorio", "Salimos del cine y volvemos al escritorio.");
            }}
            onOpenApps={() => setDrawerOpen(true)}
            onOpenSettings={() => openApp("settings")}
            onOpenWallpapers={() => setQuickOpen(true)}
            onLock={() => setPhase("lock")}
            onToast={toast}
          />
        )}

        {phoneMode && (
          <PhoneHome
            mode={phoneMode}
            clock={clock}
            user={signedUser}
            apps={desktopApps}
            dock={pinnedApps}
            running={activeWindows
              .map((win) => APP_MAP[win.appId])
              .filter((app): app is OSApp => Boolean(app))}
            wallpaper={homeWallpaper}
            backend={backend}
            volume={settings.volume ?? 70}
            brightness={settings.brightness ?? 100}
            wifi={settings.wifi !== false}
            bluetooth={Boolean(settings.bluetooth)}
            dnd={Boolean(settings.dnd)}
            onChange={(patch) => setSettings((previous) => ({ ...previous, ...patch }))}
            onHome={() => setWindows((previous) => previous.map((win) => ({ ...win, minimized: true })))}
            onOpenApp={openApp}
            onOpenDrawer={() => setDrawerOpen(true)}
            onOpenSettings={() => openApp("settings")}
            onOpenWallpapers={() => setQuickOpen(true)}
            onLock={() => setPhase("lock")}
            onExit={() => {
              if (window.location.pathname.startsWith("/theme/")) {
                window.location.href = "/desktop";
                return;
              }
              setSettings((previous) => ({ ...previous, theme: "gamer" }));
              toast("Modo escritorio", "Sales del móvil y vuelves al escritorio.");
            }}
          />
        )}

        {(theme === "macos" || theme === "linux") && (
          <header className="d-menubar">
            <span className="d-menubar-brand">Dounia OS</span>
            <nav>
              <button type="button" onClick={() => setDrawerOpen(true)}>
                Apps
              </button>
              <button type="button" onClick={() => setQuickOpen(true)}>
                Fondos
              </button>
              <button type="button" onClick={() => openApp("ciri")}>
                Dounia AI
              </button>
              <button type="button" onClick={() => openApp("settings")}>
                Ajustes
              </button>
            </nav>
            <span className="d-menubar-status">
              {clock.weekday ? `${clock.weekday.charAt(0)}${clock.weekday.slice(1).toLowerCase()}` : ""} · {clock.time}
            </span>
          </header>
        )}

        <div className="d-hud">
          <div className="d-hud-day">{clock.weekday}</div>
          {showHint && <span className="d-hud-hint">doble clic aquí → cambiar fondo</span>}
        </div>

        <div className="d-tray">
          <div className="d-tray-clock">
            <strong>{clock.time}</strong>
            <span>{clock.date.replace(/\s\d{4}$/, "")}</span>
          </div>
          <button
            type="button"
            className="d-tray-btn"
            aria-label="Cambiar fondo"
            title="Cambiar fondo"
            onClick={() => setQuickOpen(true)}
          >
            <IconImage />
          </button>
          <button
            type="button"
            className="d-tray-btn"
            aria-label="Buscar apps"
            title="Buscar apps (Ctrl/⌘ + K)"
            onClick={() => setDrawerOpen(true)}
          >
            <IconGrid />
          </button>
          <button
            type="button"
            className="d-tray-btn"
            aria-label="Estilo del escritorio"
            title="Estilo del escritorio"
            onClick={() => setThemeMenu((open) => !open)}
          >
            <IconMonitor />
          </button>
          <button
            type="button"
            className="d-tray-btn"
            aria-label="Bloquear"
            title="Bloquear"
            onClick={() => setPhase("lock")}
          >
            <IconLock />
          </button>
          <button
            type="button"
            className={`d-tray-btn${sysPanelOpen ? " on" : ""}`}
            aria-label="Panel del sistema"
            title="Panel del sistema"
            onClick={() => setSysPanelOpen((open) => !open)}
          >
            <IconBolt />
          </button>
        </div>

        {themeMenu && (
          <div className="d-theme-menu">
            <p className="d-widget-label">Estilo del escritorio</p>
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`d-theme-option${settings.theme === item.id ? " on" : ""}`}
                onClick={() => {
                  setSettings((previous) => ({ ...previous, theme: item.id }));
                  setThemeMenu(false);
                  toast("Estilo aplicado", `${item.name} · ${item.desc}`);
                }}
              >
                <span className="d-theme-swatch" style={{ background: item.accent }} />
                <span>
                  <strong>{item.name}</strong>
                  <small>{item.desc}</small>
                </span>
              </button>
            ))}
          </div>
        )}

        <div
          className="d-icons"
          onPointerMove={onIconPointerMove}
          onPointerLeave={() => {
            dragInfo.current = null;
            setDragging(null);
            setDrag(null);
          }}
          onDoubleClick={(event) => {
            if (event.target === event.currentTarget) setQuickOpen(true);
          }}
        >
          {phase === "desktop" && desktopApps.map((app, index) => {
            const position = iconPosition(index);
            const offset = drag && drag.id === app.id ? drag : null;
            return (
              <button
                key={app.id}
                type="button"
                className={`d-icon${dragging === app.id ? " drag-live" : ""}`}
                style={{
                  left: position.x,
                  top: position.y,
                  transform: offset
                    ? `translate3d(${offset.dx}px, ${offset.dy}px, 0) scale(1.07) rotate(${Math.max(-7, Math.min(7, offset.dx * 0.04))}deg)`
                    : undefined,
                  ...({ "--i": index } as React.CSSProperties),
                }}
                onPointerDown={(event) => onIconPointerDown(event, app)}
                onPointerUp={() => onIconPointerUp(app)}
                onDoubleClick={() => openApp(app.id)}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setAppMenu({
                    x: Math.min(event.clientX, window.innerWidth - 240),
                    y: Math.min(event.clientY, window.innerHeight - 200),
                    appId: app.id,
                  });
                }}
                title={`${app.name} — ${app.sub}`}
              >
                <AppIcon src={app.icon} alt={app.name} accent={app.accent} className="d-icon-img" />
                <span>{app.name}</span>
              </button>
            );
          })}
        </div>

        {liveCss && <style dangerouslySetInnerHTML={{ __html: liveCss }} />}
        <AuraFX
          parallax={settings.aura && !settings.reduceMotion && power === "balanced"}
          glow={settings.aura && power !== "eco"}
          sounds={settings.sounds}
        />
        <CursorFX enabled={settings.cursor} />

        {settings.sysHud && (
          <div className="d-syshud" aria-hidden="true">
            <i />
            <span>
              <b>{desktopApps.length}</b> apps
            </span>
            <span>·</span>
            <span>
              <b>{activeWindows.length}</b> ventanas
            </span>
            <span>·</span>
            <span>{homeWallpaper.name}</span>
          </div>
        )}

        {settings.widgets && (
          <Widgets
            clock={clock}
            backend={backend}
            favorites={favorites.length}
            apps={APPS.length}
            wallpaper={homeWallpaper}
            onOpenStudio={() => setQuickOpen(true)}
            onOpenProxy={openProxy}
            onOpenApp={openApp}
          />
        )}
      </div>

      {sysPanelOpen && (
        <SystemPanel
          settings={settings}
          onChange={(patch) => setSettings((previous) => ({ ...previous, ...patch }))}
          clock={clock}
          user={signedUser}
          windows={activeWindows.length}
          onClose={() => setSysPanelOpen(false)}
          onOpenStudio={() => {
            setSysPanelOpen(false);
            setQuickOpen(true);
          }}
          onOpenApps={() => {
            setSysPanelOpen(false);
            setDrawerOpen(true);
          }}
          onLock={() => {
            setSysPanelOpen(false);
            setPhase("lock");
          }}
          onRestart={restart}
          onShutdown={shutdown}
        />
      )}

      {snapPreview && (
        <div
          className="d-snap-preview"
          style={{
            left: snapPreview.x,
            top: snapPreview.y,
            width: snapPreview.w,
            height: snapPreview.h,
          }}
          aria-hidden="true"
        />
      )}

      {windows.map((win, index) => {
        const app = APP_MAP[win.appId];
        if (!app || win.minimized) return null;
        const stackIndex = [...windows].sort((a, b) => a.z - b.z).findIndex((item) => item.id === win.id);
        return (
          <WindowFrame
            key={win.id}
            id={win.id}
            appId={win.appId}
            title={app.name}
            subtitle={win.proxyTarget ? hostOf(win.proxyTarget) : app.sub}
            icon={app.icon}
            accent={app.accent}
            index={index}
            z={21 + Math.max(0, stackIndex)}
            focused={focusedWindowId === win.id}
            maximized={win.maximized}
            fullscreen={Boolean(win.fullscreen)}
            externalHref={win.proxyTarget}
            onFocus={() => focusWindow(win.id)}
            onClose={() => closeWindow(win.id)}
            onMinimize={() => minimizeWindow(win.id)}
            onToggleMax={() => toggleMaximize(win.id)}
            onToggleFullscreen={() => toggleFullscreen(win.id)}
            onSnapPreview={setSnapPreview}
          >
              {app.kind === "browser" && (
                <PersonalBrowser
                  key={`${win.id}-${win.proxyTarget ?? "home"}`}
                  initialUrl={win.proxyTarget}
                  onToast={toast}
                />
              )}

              {app.kind === "embed" && <EmbedApp app={app} onToast={toast} />}

              {app.kind === "feed" && <FeedApp app={app} onToast={toast} />}

              {app.kind === "cinemitas" && <CinemitasApp app={app} onToast={toast} initialCine={initialCine} />}

              {app.kind === "scramjet" && (
                <ScramjetBrowser
                  key={`${win.id}-${win.proxyTarget ?? "home"}`}
                  initialUrl={win.proxyTarget}
                  onToast={toast}
                />
              )}

              {app.kind === "racoon" && <RacoonGames onToast={toast} />}

              {app.kind === "links" && (
                <LinkDirectory
                  groups={app.id === "wolfunblock" ? [LINK_GROUPS[1]] : [GHOSTCLOUD_GROUP, ...LINK_GROUPS.slice(2)]}
                  title={app.name}
                  subtitle={
                    app.id === "wolfunblock"
                      ? "Enlaces de sites.google.com/view/wolfunblock, agrupados por categoría"
                      : "Todos los enlaces principales y los proxies verificados"
                  }
                  onOpenProxy={openProxy}
                  onToast={toast}
                />
              )}

              {app.kind === "wolf" && (
                <WolfDirectory section={app.section} onOpenProxy={openProxy} onToast={toast} />
              )}

              {app.kind === "proxies" && <ProxyHub onOpenProxy={openProxy} onToast={toast} />}

              {app.kind === "xbox" && <CloudGamesApp onToast={toast} onOpenProxy={openProxy} />}

              {app.kind === "raccoon" && (
                <RaccoonGamesApp onOpenUrl={openProxy} onToast={toast} />
              )}

              {app.kind === "games" && <GamesApp onToast={toast} />}

              {app.kind === "vms" && <VMDirectory onToast={toast} onOpenProxy={openProxy} />}

              {app.kind === "movies" && (
                <LinkDirectory
                  groups={[GHOSTCLOUD_GROUP, LINK_GROUPS[3]]}
                  title="Cine Hub"
                  subtitle="GhostCloud, Cineby, Cinera y el destino original de CineOS — ábrelos con el proxy del sistema"
                  onOpenProxy={openProxy}
                  onToast={toast}
                />
              )}

              {app.kind === "settings" && (
                <SettingsApp
                  settings={settings}
                  onChange={(patch) => setSettings((previous) => ({ ...previous, ...patch }))}
                  appliedHome={homeId}
                  appliedLock={lockId}
                  favoritesCount={favorites.length}
                  onOpenStudio={() => setQuickOpen(true)}
                  onOpenQuick={() => setQuickOpen(true)}
                  onRestoreOriginal={restoreOriginal}
                  onLock={() => setPhase("lock")}
                  onReset={resetPreferences}
                />
              )}

              {app.kind === "assistant" && (
                <CiriConsole
                  settings={settings}
                  onChange={(patch) => setSettings((previous) => ({ ...previous, ...patch }))}
                  user={signedUser}
                  onSetUser={setSignedUser}
                  onOpenApp={openApp}
                  onCloseApp={closeApp}
                  onApplyWallpaper={(wallpaper) => applyWallpaper(wallpaper, "both")}
                  onOpenProxy={openProxy}
                  onOpenStudio={() => setQuickOpen(true)}
                  onLock={() => setPhase("lock")}
                  onRestart={restart}
                  onShutdown={shutdown}
                  onSignOut={signOut}
                  onAddToDesktop={addToDesktop}
                  onRemoveFromDesktop={removeFromDesktop}
                  onToast={toast}
                  onApplyCss={setLiveCss}
                  onResetStyle={() => setLiveCss("")}
                />
              )}

              {app.kind === "terminal" && (
                <TerminalApp
                  onOpenApp={openApp}
                  onOpenUrl={openProxy}
                  onToast={toast}
                  onTheme={(id) =>
                    setSettings((previous) => ({ ...previous, theme: id as ThemeId }))
                  }
                  onWallpaper={(id) => {
                    const wallpaper = wallpaperById(id);
                    if (!wallpaper) return;
                    setHomeId(wallpaper.id);
                    setLockId(wallpaper.id);
                  }}
                  onLock={() => setPhase("lock")}
                  onClose={() => closeWindow(win.id)}
                />
              )}

              {app.kind === "files" && <FilesApp onToast={toast} />}

              {app.kind === "notes" && <NotesApp onToast={toast} />}

              {app.kind === "calc" && <CalculatorApp />}

              {app.kind === "tasks" && (
                <MonitorApp
                  processes={windows.map<ProcessInfo>((item) => {
                    const target = APP_MAP[item.appId];
                    return {
                      id: item.id,
                      appId: item.appId,
                      title: target?.name ?? item.appId,
                      sub: item.minimized ? "minimizada" : target?.sub ?? "",
                      icon: target?.icon ?? "/os/icons/config.svg",
                      accent: target?.accent ?? "#a855f7",
                      minimized: item.minimized,
                    };
                  })}
                  onKill={(id) => closeWindow(id)}
                  onFocusWindow={(id) => focusWindow(id)}
                />
              )}
          </WindowFrame>
        );
      })}

      <nav className="d-dock" aria-label="Barra de tareas">
        <button
          type="button"
          className="d-dock-start"
          aria-label="Menú de inicio"
          onClick={() => {
            setStartOpen((open) => !open);
            setDrawerOpen(false);
          }}
        >
          <IconGrid />
        </button>
        <span className="d-dock-sep" />
        {pinnedApps.slice(0, 8).map((app) => (
          <button
            key={app.id}
            type="button"
            className={`d-dock-item${runningIds.has(app.id) ? " running" : ""}`}
            onClick={() => openApp(app.id)}
            aria-label={app.name}
          >
            <AppIcon src={app.icon} alt={app.name} accent={app.accent} size={30} />
            <span className="d-dock-tip">{app.name}</span>
          </button>
        ))}
        {windows
          .filter((win) => !pinned.includes(win.appId))
          .slice(0, 4)
          .map((win) => {
            const running = APP_MAP[win.appId];
            if (!running) return null;
            return (
              <button
                key={win.id}
                type="button"
                className={`d-dock-item running${win.minimized ? " min" : ""}`}
                onClick={() => openApp(running.id)}
                aria-label={running.name}
              >
                <AppIcon src={running.icon} alt={running.name} accent={running.accent} size={30} />
                <span className="d-dock-tip">{running.name}</span>
              </button>
            );
          })}
        <span className="d-dock-sep" />
        <button
          type="button"
          className="d-dock-item"
          onClick={() => setQuickOpen(true)}
          aria-label="Cambiar fondo"
        >
          <IconImage style={{ width: 22, height: 22 }} />
          <span className="d-dock-tip">Fondos</span>
        </button>
        <button
          type="button"
          className="d-dock-item"
          onClick={() => setDrawerOpen(true)}
          aria-label="Todas las apps"
        >
          <IconGrid style={{ width: 22, height: 22 }} />
          <span className="d-dock-tip">Todas las apps</span>
        </button>
      </nav>

      {startOpen && (
        <>
          <div className="d-scrim" onClick={() => setStartOpen(false)} />
          <div className="d-start" role="dialog" aria-label="Menú de inicio">
            <label className="d-search">
              <IconSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar apps y fondos…"
                aria-label="Buscar"
                autoFocus
              />
            </label>
            <div className="d-start-body">
              <p className="d-group-label">{query ? "Resultados" : "Fijadas"}</p>
              <div className="d-pinned">
                {startResults.map((app) => (
                  <button key={app.id} type="button" className="d-pinned-item" onClick={() => openApp(app.id)}>
                    <AppIcon src={app.icon} alt={app.name} accent={app.accent} size={34} />
                    <span>{app.name}</span>
                  </button>
                ))}
                {startResults.length === 0 && <p className="d-empty">Ninguna app coincide con «{query}».</p>}
              </div>
              <p className="d-group-label">Fondos</p>
              <div className="d-pinned">
                {WALLPAPERS.slice(0, 4).map((wallpaper) => (
                  <button
                    key={wallpaper.id}
                    type="button"
                    className="d-pinned-item"
                    onClick={() => {
                      applyWallpaper(wallpaper, "both");
                      setStartOpen(false);
                    }}
                  >
                    <span
                      className="d-link-badge"
                      style={{
                        width: 34,
                        height: 34,
                        background: wallpaper.type === "gradient" ? wallpaper.src : "#1c1c24",
                      }}
                    >
                      {wallpaper.type === "gradient" ? "" : <IconImage />}
                    </span>
                    <span>{wallpaper.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <p className="d-start-keys">
              Alt+T terminal · Ctrl+` ventanas · Ctrl+W cerrar · Ctrl+K buscar · F11 maximizar
            </p>
            <footer className="d-start-footer">
              <div className="d-user">
                <span className="d-avatar">DV</span>
                <span>{signedUser} · Dounia OS v4 Aura</span>
              </div>
              <button type="button" className="d-tray-btn" aria-label="Bloquear" onClick={() => setPhase("lock")}>
                <IconPower />
              </button>
            </footer>
          </div>
        </>
      )}

      {drawerOpen && (
        <div className="d-drawer" role="dialog" aria-label="Todas las aplicaciones">
          <div className="d-drawer-head">
            <h2>Todas las aplicaciones</h2>
            <label className="d-search d-drawer-search">
              <IconSearch />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar…"
                aria-label="Buscar aplicaciones"
                autoFocus
              />
            </label>
            <button type="button" className="d-mini-btn" aria-label="Cerrar" onClick={() => setDrawerOpen(false)}>
              <IconClose />
            </button>
          </div>
          <div className="d-filters">
            <button type="button" className={`d-chip${category === "all" ? " on" : ""}`} onClick={() => setCategory("all")}>
              Todas
            </button>
            {(Object.keys(CATEGORY_LABEL) as AppCategory[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`d-chip${category === key ? " on" : ""}`}
                onClick={() => setCategory(key)}
              >
                {CATEGORY_LABEL[key]}
              </button>
            ))}
          </div>
          <div className="d-drawer-grid">
            {filteredApps.map((app) => (
              <div key={app.id} className="d-app-tile-wrap" style={{ position: "relative" }}>
                <button type="button" className="d-app-tile" onClick={() => openApp(app.id)}>
                  <AppIcon src={app.icon} alt={app.name} accent={app.accent} size={44} />
                  <span>{app.name}</span>
                </button>
                <button
                  type="button"
                  className="d-mini-btn"
                  style={{ position: "absolute", top: 4, right: 4 }}
                  aria-label={pinned.includes(app.id) ? "Quitar de la barra" : "Fijar en la barra"}
                  title={pinned.includes(app.id) ? "Quitar de la barra" : "Fijar en la barra"}
                  onClick={() =>
                    setPinned((previous) =>
                      previous.includes(app.id)
                        ? previous.filter((id) => id !== app.id)
                        : [...previous, app.id],
                    )
                  }
                >
                  <IconStar style={{ fill: pinned.includes(app.id) ? "#fbbf24" : "none" }} />
                </button>
                <button
                  type="button"
                  className="d-mini-btn"
                  style={{ position: "absolute", top: 4, left: 4 }}
                  aria-label={desktop.includes(app.id) ? "Quitar del escritorio" : "Añadir al escritorio"}
                  title={desktop.includes(app.id) ? "Quitar del escritorio" : "Añadir al escritorio"}
                  onClick={() =>
                    desktop.includes(app.id) ? removeFromDesktop(app.id) : addToDesktop(app.id)
                  }
                >
                  {desktop.includes(app.id) ? <IconMinus /> : <IconPlus />}
                </button>
              </div>
            ))}
            {filteredApps.length === 0 && <p className="d-empty">Sin resultados.</p>}
          </div>
        </div>
      )}

      {quickOpen && (
        <QuickWallpapers
          appliedHome={homeId}
          onApply={(wallpaper) => applyWallpaper(wallpaper, "both")}
          onClose={() => setQuickOpen(false)}
        />
      )}

      {appMenu && (
        <>
          <div
            className="d-scrim"
            style={{ background: "transparent", backdropFilter: "none" }}
            onClick={() => setAppMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setAppMenu(null);
            }}
          />
          <div className="d-menu" style={{ left: appMenu.x, top: appMenu.y }}>
            <p className="muted">{APP_MAP[appMenu.appId]?.name}</p>
            <button
              type="button"
              onClick={() => {
                openApp(appMenu.appId);
                setAppMenu(null);
              }}
            >
              <IconExternal /> Abrir
            </button>
            <button
              type="button"
              onClick={() => {
                setPinned((previous) =>
                  previous.includes(appMenu.appId)
                    ? previous.filter((id) => id !== appMenu.appId)
                    : [...previous, appMenu.appId],
                );
                setAppMenu(null);
              }}
            >
              <IconStar /> {pinned.includes(appMenu.appId) ? "Quitar de la barra" : "Fijar en la barra"}
            </button>
            <hr />
            <button
              type="button"
              onClick={() => {
                removeFromDesktop(appMenu.appId);
                setAppMenu(null);
              }}
            >
              <IconClose /> Quitar del escritorio
            </button>
          </div>
        </>
      )}

      {context && (
        <>
          <div className="d-scrim" style={{ background: "transparent", backdropFilter: "none" }} onClick={() => setContext(null)} />
          <div className="d-menu" style={{ left: context.x, top: context.y }}>
            <p className="muted">Escritorio</p>
            <button type="button" onClick={() => { setQuickOpen(true); setContext(null); }}>
              <IconImage /> Cambiar fondo
            </button>
            <button type="button" onClick={() => { setDrawerOpen(true); setContext(null); }}>
              <IconGrid /> Todas las apps
            </button>
            <button type="button" onClick={() => { openApp("terminal"); setContext(null); }}>
              <IconTerminal /> Abrir terminal
            </button>
            <button type="button" onClick={() => { openApp("files"); setContext(null); }}>
              <IconFolder /> Archivos
            </button>
            <button type="button" onClick={() => { openApp("monitor"); setContext(null); }}>
              <IconMonitor /> Monitor del sistema
            </button>
            <button type="button" onClick={() => { openApp("scramjet"); setContext(null); }}>
              <IconShield /> Scramjet V2
            </button>
            <hr />
            <button
              type="button"
              onClick={() => {
                setSettings((previous) => ({ ...previous, showLabels: !previous.showLabels }));
                setContext(null);
              }}
            >
              <IconRefresh /> {settings.showLabels ? "Ocultar nombres" : "Mostrar nombres"}
            </button>
            <button type="button" onClick={() => { void applyWallpaper(ORIGINAL_WALLPAPER, "both"); setContext(null); }}>
              <IconRefresh /> Restaurar fondo original
            </button>
            <hr />
            <button type="button" onClick={() => { setPhase("lock"); setContext(null); }}>
              <IconLock /> Bloquear sistema
            </button>
          </div>
        </>
      )}

      <div className="d-toasts">
        {toasts.map((item) => (
          <div key={item.id} className="d-toast">
            <strong>{item.title}</strong>
            <span>{item.body}</span>
          </div>
        ))}
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        apps={APPS}
        onOpenApp={openApp}
        onOpenUrl={openProxy}
        onLock={() => setPhase("lock")}
        onWallpapers={() => setQuickOpen(true)}
        onToggleTheme={() =>
          setSettings((previous) => {
            const index = THEMES.findIndex((item) => item.id === previous.theme);
            const next = THEMES[(index + 1) % THEMES.length];
            return { ...previous, theme: next.id as ThemeId };
          })
        }
        onOpenMonitor={() => openApp("monitor")}
        onToast={toast}
      />

      {activeWindows.length === 0 && (
        <div
          style={{ position: "absolute", inset: 0, zIndex: 1 }}
          onContextMenu={(event) => {
            event.preventDefault();
            setContext({ x: Math.min(event.clientX, window.innerWidth - 230), y: Math.min(event.clientY, window.innerHeight - 420) });
          }}
          onClick={() => setContext(null)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
