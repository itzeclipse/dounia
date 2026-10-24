"use client";

/**
 * Motor Scramjet V2 de Dounia OS.
 *
 * Arranca una sola vez por pestaña y devuelve el Controller ya listo:
 *   1. registra el service worker (scope raíz) que intercepta las peticiones
 *   2. carga el núcleo de Scramjet y el controller API
 *   3. crea el transporte libcurl apuntando al servidor Wisp de Dounia
 *      (`/wisp/`, montado en el propio servidor de Next)
 *
 * A partir de ahí, `controller.createFrame(iframe)` convierte cualquier iframe
 * en una pestaña proxeada: todas las apps y juegos del sistema pasan por aquí.
 */

export interface ScramjetFrameHandle {
  id: string;
  go(url: string): void;
  back(): void;
  forward(): void;
  reload(): void;
}

export interface ScramjetController {
  prefix: string;
  wait(): Promise<void>;
  createFrame(element?: HTMLIFrameElement | null): ScramjetFrameHandle;
}

interface ScramjetApi {
  Controller: new (init: {
    serviceworker: ServiceWorker;
    transport: unknown;
    config?: Record<string, string>;
  }) => ScramjetController;
  VERSION?: string;
}

interface WindowWithScramjet extends Window {
  $scramjetController?: ScramjetApi;
}

export interface ScramjetEngine {
  controller: ScramjetController;
  prefix: string;
}

const ASSETS = {
  serviceWorker: "/api/sj/sw.js",
  core: "/api/sj/scramjet.js",
  controllerApi: "/api/sj/controller.api.js",
  transport: "/api/sj/libcurl-transport.mjs",
  config: {
    scramjetPath: "/api/sj/scramjet.js",
    injectPath: "/api/sj/controller.inject.js",
    wasmPath: "/api/sj/scramjet.wasm",
  },
};

let enginePromise: Promise<ScramjetEngine> | null = null;

/** Endpoint Wisp del propio proyecto (mismo origen, mismo puerto). */
export function wispEndpoint(): string {
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}/wisp/`;
}

function loadScript(src: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-dounia-sj="${key}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.dataset.douniaSj = key;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(script);
  });
}

async function boot(): Promise<ScramjetEngine> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Este navegador no soporta service workers, y Scramjet los necesita.");
  }

  const registration = await navigator.serviceWorker.register(ASSETS.serviceWorker, { scope: "/" });
  await navigator.serviceWorker.ready;
  const serviceworker = registration.active ?? (await navigator.serviceWorker.ready).active;
  if (!serviceworker) throw new Error("El service worker de Scramjet no llegó a activarse.");

  await loadScript(ASSETS.core, "core");
  await loadScript(ASSETS.controllerApi, "controller");

  const api = (window as WindowWithScramjet).$scramjetController;
  if (!api) throw new Error("Scramjet no expuso su controller API.");

  const dynamicImport = new Function("url", "return import(url)") as (
    url: string,
  ) => Promise<{ default?: unknown; LibcurlClient?: unknown }>;
  const transportModule = await dynamicImport(ASSETS.transport);
  const LibcurlClient = (transportModule.default ?? transportModule.LibcurlClient) as
    | (new (options: { wisp: string }) => { init(): Promise<void> })
    | undefined;
  if (!LibcurlClient) throw new Error("El transporte libcurl no está disponible.");

  const transport = new LibcurlClient({ wisp: wispEndpoint() });
  await transport.init();

  const controller = new api.Controller({
    serviceworker,
    transport,
    config: ASSETS.config,
  });
  await controller.wait();

  return { controller, prefix: controller.prefix };
}

/** Devuelve el motor listo (o lo arranca si es la primera vez). */
export function ensureScramjet(): Promise<ScramjetEngine> {
  if (!enginePromise) {
    enginePromise = boot().catch((error) => {
      enginePromise = null; // permite reintentar
      throw error;
    });
  }
  return enginePromise;
}

/** Crea un frame proxeado dentro del iframe indicado. */
export async function createScramjetFrame(
  element: HTMLIFrameElement,
  url: string,
): Promise<ScramjetFrameHandle> {
  const { controller } = await ensureScramjet();
  const frame = controller.createFrame(element);
  frame.go(url);
  return frame;
}
