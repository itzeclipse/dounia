/**
 * El paquete @mercuryworkshop/wisp-js no publica tipos para su entrypoint de
 * servidor. Declaramos solo lo que usamos: `server.routeRequest`, que atiende
 * un upgrade HTTP y lo convierte en un túnel Wisp.
 */
declare module "@mercuryworkshop/wisp-js/server" {
  import type { IncomingMessage } from "node:http";
  import type { Duplex } from "node:stream";

  export interface WispServerOptions {
    wisp_version?: 1 | 2;
    ping_interval?: number;
    allow_loopback_ips?: boolean;
    allow_private_ips?: boolean;
    allow_direct_ip?: boolean;
    [key: string]: unknown;
  }

  export const server: {
    routeRequest(
      request: IncomingMessage,
      socket: Duplex,
      head: Buffer,
      options?: WispServerOptions,
    ): void;
  };
}
