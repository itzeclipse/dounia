"use client";
import React from 'react';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SEARCH_ENGINES, hostOf } from "@/lib/os/data";
import { usePersistentState } from "@/lib/os/hooks";
import {
  IconClose,
  IconExternal,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconShield,
  IconStar,
} from "../icons";
import { ScramjetFrame } from "./ScramjetFrame";

interface PersonalBrowserProps {
  initialUrl?: string;
  onToast: (title: string, body: string) => void;
}

interface Tab {
  id: string;
  url: string;
  back: string[];
  forward: string[];
}

interface Mark {
  url: string;
  title: string;
  at: number;
}

type Mode = "proxy" | "directo";

const TABS_KEY = "dounia.browser.tabs.v1";
const MARKS_KEY = "dounia.browser.marks.v1";
const HISTORY_KEY = "dounia.browser.history.v1";
const MODE_KEY = "dounia.browser.mode.v1";

const QUICK_LINKS: Array<{ name: string; url: string }> = [
  { name: "Google", url: "https://www.google.com/" },
  { name: "YouTube", url: "https://www.youtube.com/" },
  { name: "Wikipedia", url: "https://es.wikipedia.org/" },
  { name: "GitHub", url: "https://github.com/" },
  { name: "Reddit", url: "https://www.reddit.com/" },
  { name: "Twitch", url: "https://www.twitch.tv/" },
];

function newTab(url = ""): Tab {
  return { id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, url, back: [], forward: [] };
}

/** Turns whatever the user typed into a real URL or a search. */
function resolveInput(raw: string, search: (query: string) => string): string {
  const value = raw.trim();
  if (!value) return "";
  const looksLikeUrl =
    /^(https?:\/\/|www\.)/i.test(value) || /^[\w-]+(\.[\w-]+)+(\/|$)/.test(value);
  if (!looksLikeUrl) return search(value);
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

/**
 * Mi navegador — Dounia's personal browser. Real tabs, per-tab back/forward,
 * bookmarks and history persisted in this browser, plus a switch between the
 * self-hosted proxy (/api/proxy) and a direct frame.
 */
export function PersonalBrowser({ initialUrl = "", onToast }: PersonalBrowserProps) {
  const [tabs, setTabs] = usePersistentState<Tab[]>(TABS_KEY, [newTab(initialUrl)]);
  const [marks, setMarks] = usePersistentState<Mark[]>(MARKS_KEY, []);
  const [history, setHistory] = usePersistentState<Mark[]>(HISTORY_KEY, []);
  const [mode, setMode] = usePersistentState<Mode>(MODE_KEY, "proxy");

  const [activeId, setActiveId] = useState<string>("");
  const [draft, setDraft] = useState(initialUrl);
  const [engineId, setEngineId] = useState(SEARCH_ENGINES[0]?.id ?? "ddg");
  const [panel, setPanel] = useState<"none" | "marks" | "history">("none");
  const [reloadKey, setReloadKey] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const engine = useMemo(
    () => SEARCH_ENGINES.find((item) => item.id === engineId) ?? SEARCH_ENGINES[0],
    [engineId],
  );

  const active = useMemo(
    () => tabs.find((tab) => tab.id === activeId) ?? tabs[0],
    [tabs, activeId],
  );

  useEffect(() => {
    if (!active) setTabs([newTab(initialUrl)]);
    else if (active.id !== activeId) setActiveId(active.id);
  }, [active, activeId, initialUrl, setTabs]);

  useEffect(() => {
    setDraft(active?.url ?? "");
  }, [active?.url]);

  const patchTab = useCallback(
    (id: string, patch: (tab: Tab) => Tab) => {
      setTabs((previous) => previous.map((tab) => (tab.id === id ? patch(tab) : tab)));
    },
    [setTabs],
  );

  const remember = useCallback(
    (url: string) => {
      const entry: Mark = { url, title: hostOf(url), at: Date.now() };
      setHistory((previous) => [entry, ...previous.filter((item) => item.url !== url)].slice(0, 80));
    },
    [setHistory],
  );

  const go = useCallback(
    (raw: string) => {
      const target = resolveInput(raw, engine.search);
      if (!target || !active) return;
      patchTab(active.id, (tab) => ({
        ...tab,
        url: target,
        back: [...tab.back.slice(-30), tab.url].filter(Boolean),
        forward: [],
      }));
      remember(target);
      setReloadKey((n) => n + 1);
      setPanel("none");
      onToast("Dounia's Browser", `Scramjet V2 · ${hostOf(target)}`);
    },
    [active, engine.search, mode, onToast, patchTab, remember],
  );

  const step = useCallback(
    (direction: "back" | "forward") => {
      if (!active) return;
      const stack = direction === "back" ? active.back : active.forward;
      const target = stack[stack.length - 1];
      if (!target) {
        onToast("Mi navegador", direction === "back" ? "No hay página anterior." : "No hay página siguiente.");
        return;
      }
      patchTab(active.id, (tab) =>
        direction === "back"
          ? { ...tab, url: target, back: tab.back.slice(0, -1), forward: [...tab.forward, tab.url] }
          : { ...tab, url: target, forward: tab.forward.slice(0, -1), back: [...tab.back, tab.url] },
      );
      setReloadKey((n) => n + 1);
    },
    [active, onToast, patchTab],
  );

  const openTab = useCallback(
    (url = "") => {
      const tab = newTab(url);
      setTabs((previous) => [...previous.slice(0, 7), tab]);
      setActiveId(tab.id);
      setDraft(url);
      setPanel("none");
      if (url) remember(url);
    },
    [remember, setTabs],
  );

  const closeTab = useCallback(
    (id: string) => {
      setTabs((previous) => {
        const remaining = previous.filter((tab) => tab.id !== id);
        if (remaining.length === 0) {
          const fresh = newTab();
          setActiveId(fresh.id);
          return [fresh];
        }
        if (id === activeId) setActiveId(remaining[Math.max(0, remaining.length - 1)].id);
        return remaining;
      });
    },
    [activeId, setTabs],
  );

  /* Atajos de navegador de verdad: Ctrl/⌘ + T, L y W. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const key = event.key.toLowerCase();
      if (key === "t") {
        event.preventDefault();
        openTab();
      } else if (key === "l") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (key === "w" && active) {
        event.preventDefault();
        closeTab(active.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, closeTab, openTab]);

  const currentUrl = active?.url ?? "";
  const bookmarked = currentUrl ? marks.some((mark) => mark.url === currentUrl) : false;

  const toggleMark = useCallback(() => {
    if (!currentUrl) {
      setPanel(panel === "marks" ? "none" : "marks");
      return;
    }
    if (bookmarked) {
      setMarks((previous) => previous.filter((mark) => mark.url !== currentUrl));
      onToast("Marcadores", `${hostOf(currentUrl)} eliminado.`);
      return;
    }
    setMarks((previous) => [
      { url: currentUrl, title: hostOf(currentUrl), at: Date.now() },
      ...previous.filter((mark) => mark.url !== currentUrl),
    ]);
    onToast("Marcadores", `${hostOf(currentUrl)} guardado.`);
  }, [bookmarked, currentUrl, marks, onToast, panel, setMarks]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    onToast("Historial", "Borrado. Los marcadores se mantienen.");
  }, [onToast, setHistory]);

  return (
    <>
      {/* pestañas */}
      <div className="d-tabsbar">
        <div className="d-tabs" role="tablist" aria-label="Pestañas">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`d-tab${tab.id === active?.id ? " on" : ""}`}
              role="tab"
              aria-selected={tab.id === active?.id}
            >
              <button
                type="button"
                className="d-tab-label"
                onClick={() => {
                  setActiveId(tab.id);
                  setPanel("none");
                }}
                title={tab.url || "Pestaña nueva"}
              >
                <span className="d-tab-dot" />
                {tab.url ? hostOf(tab.url) : "Nueva pestaña"}
              </button>
              <button
                type="button"
                className="d-tab-x"
                aria-label="Cerrar pestaña"
                onClick={(event) => {
                  event.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                <IconClose />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="d-tool icon-only" aria-label="Nueva pestaña" onClick={() => openTab()}>
          <IconPlus />
        </button>
      </div>

      {/* barra de direcciones */}
      <div className="d-proxybar">
        <div className="d-navbtns">
          <button
            type="button"
            className="d-tool icon-only"
            aria-label="Atrás"
            onClick={() => step("back")}
            disabled={!active?.back.length}
          >
            ←
          </button>
          <button
            type="button"
            className="d-tool icon-only"
            aria-label="Adelante"
            onClick={() => step("forward")}
            disabled={!active?.forward.length}
          >
            →
          </button>
          <button
            type="button"
            className="d-tool icon-only"
            aria-label="Recargar"
            onClick={() => setReloadKey((n) => n + 1)}
          >
            <IconRefresh />
          </button>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            go(draft);
          }}
        >
          <IconShield style={{ width: 15, height: 15, color: mode === "proxy" ? "#a855f7" : "#52525b" }} />
          <input
            ref={inputRef}
            className="d-proxy-input"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={`Busca en ${engine.name} o escribe una dirección…`}
            spellCheck={false}
            aria-label="Dirección o búsqueda"
          />
          <button type="submit" className="d-btn primary" style={{ height: 34, padding: "0 16px" }}>
            Ir
          </button>
        </form>

        <select
          className="d-engine-select"
          value={engineId}
          onChange={(event) => setEngineId(event.target.value)}
          aria-label="Buscador"
          title="Buscador por defecto"
        >
          {SEARCH_ENGINES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={`d-tool icon-only${mode === "proxy" ? " on" : ""}`}
          aria-label="Cambiar motor de carga"
          title={
            mode === "proxy"
              ? "Motor libcurl (HTTP/2, brotli, zstd) — recomendado"
              : "Carga directa del sitio, sin motor"
          }
          onClick={() => {
            const next: Mode = mode === "proxy" ? "directo" : "proxy";
            setMode(next);
            setReloadKey((n) => n + 1);
            onToast(
              "Motor",
              next === "proxy" ? "libcurl 8.22 · HTTP/2, brotli y zstd." : "Carga directa del sitio.",
            );
          }}
        >
          <IconShield />
        </button>

        <button
          type="button"
          className={`d-tool icon-only${bookmarked ? " on" : ""}`}
          aria-label="Marcador"
          title={bookmarked ? "Quitar marcador" : "Añadir a marcadores"}
          onClick={toggleMark}
        >
          <IconStar />
        </button>

        <button
          type="button"
          className="d-tool icon-only"
          aria-label="Marcadores e historial"
          title="Marcadores e historial"
          onClick={() => setPanel(panel === "marks" ? "history" : panel === "history" ? "none" : "marks")}
        >
          <IconSearch />
        </button>

        {currentUrl && (
          <a className="d-tool icon-only" href={currentUrl} target="_blank" rel="noreferrer noopener" aria-label="Abrir fuera">
            <IconExternal />
          </a>
        )}
      </div>

      {/* barra de marcadores: un clic y estás dentro */}
      <div className="d-marksbar">
        {marks.length === 0 ? (
          <span className="d-marks-empty">
            Pulsa ★ en cualquier página para tenerla aquí a un clic
          </span>
        ) : (
          marks.slice(0, 10).map((mark) => (
            <button
              key={mark.url}
              type="button"
              className="d-mark"
              onClick={() => go(mark.url)}
              title={mark.url}
            >
              <span>{hostOf(mark.url).replace(/^www\./, "").charAt(0).toUpperCase()}</span>
              {hostOf(mark.url).replace(/^www\./, "")}
            </button>
          ))
        )}
      </div>

      {/* panel de marcadores / historial */}
      {panel !== "none" && (
        <div className="d-bpanel">
          <div className="d-bpanel-head">
            <strong>{panel === "marks" ? "Marcadores" : "Historial"}</strong>
            <span />
            {panel === "history" && history.length > 0 && (
              <button type="button" className="d-tool" onClick={clearHistory}>
                Vaciar
              </button>
            )}
            <button type="button" className="d-tool icon-only" aria-label="Cerrar panel" onClick={() => setPanel("none")}>
              <IconClose />
            </button>
          </div>
          <div className="d-bpanel-list">
            {(panel === "marks" ? marks : history).length === 0 && (
              <p className="d-bpanel-empty">
                {panel === "marks"
                  ? "Aún no has guardado nada. Pulsa la estrella en una página."
                  : "Todavía no hay historial en este navegador."}
              </p>
            )}
            {(panel === "marks" ? marks : history).map((item) => (
              <div className="d-brow" key={`${panel}-${item.url}-${item.at}`}>
                <button type="button" className="d-brow-open" onClick={() => go(item.url)} title={item.url}>
                  <strong>{item.title}</strong>
                  <small>{item.url.replace(/^https?:\/\//, "").slice(0, 70)}</small>
                </button>
                <a className="d-tool icon-only" href={item.url} target="_blank" rel="noreferrer noopener" aria-label="Abrir fuera">
                  <IconExternal />
                </a>
                {panel === "marks" && (
                  <button
                    type="button"
                    className="d-tool icon-only danger"
                    aria-label="Quitar marcador"
                    onClick={() => setMarks((previous) => previous.filter((mark) => mark.url !== item.url))}
                  >
                    <IconClose />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* contenido */}
      {currentUrl ? (
        <ScramjetFrame
          key={`${active?.id}-${currentUrl}`}
          url={currentUrl}
          reloadKey={reloadKey}
          onNavigate={(next) => go(next)}
        />
      ) : (
        <div className="d-bhome">
          <div className="d-bhome-inner">
            <span className="d-bhome-mark">
              <IconShield />
            </span>
            <h3>Dounia&apos;s Browser</h3>
            <p>
              Tus pestañas, tus marcadores y tu historial, guardados en este navegador. Todo se
              carga con <b>Scramjet V2</b>, el motor del sistema: service worker, Wisp y libcurl.
            </p>

            <form
              className="d-bhome-search"
              onSubmit={(event) => {
                event.preventDefault();
                go(draft);
              }}
            >
              <IconSearch style={{ width: 16, height: 16, color: "#a855f7" }} />
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={`Busca en ${engine.name} o escribe una dirección…`}
                spellCheck={false}
                aria-label="Buscar o abrir una dirección"
              />
              <button type="submit" className="d-btn primary" style={{ height: 36, padding: "0 18px" }}>
                Ir
              </button>
            </form>

            <div className="d-bhome-grid">
              {(marks.length > 0 ? marks.slice(0, 6) : QUICK_LINKS).map((link) => (
                <button
                  key={link.url}
                  type="button"
                  className="d-bhome-tile"
                  onClick={() => go(link.url)}
                  title={link.url}
                >
                  <span>{hostOf(link.url).replace(/^www\./, "").charAt(0).toUpperCase()}</span>
                  <strong>{hostOf(link.url).replace(/^www\./, "")}</strong>
                </button>
              ))}
            </div>

            {history.length > 0 && (
              <div className="d-bhome-recent">
                <span>Reciente</span>
                {history.slice(0, 4).map((item) => (
                  <button key={`recent-${item.url}`} type="button" onClick={() => go(item.url)}>
                    {item.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
