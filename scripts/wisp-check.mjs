/**
 * Comprobación real del servidor Wisp de Dounia OS.
 *
 * Abre un WebSocket a ws://<host>/wisp/, crea un stream TCP a example.com:80,
 * envía una petición HTTP a mano y verifica que vuelve el HTML. Si esto pasa,
 * el transporte que necesita Scramjet está funcionando de verdad.
 *
 * Uso: node scripts/wisp-check.mjs [ws://localhost:3000/wisp/]
 */
import { client as wisp } from "@mercuryworkshop/wisp-js/client";

const endpoint = process.argv[2] ?? "ws://localhost:3000/wisp/";
const target = "example.com";
const port = 80;

let finished = false;
const finish = (message, code = 0) => {
  if (finished) return;
  finished = true;
  console.log(message);
  process.exit(code);
};

const timer = setTimeout(() => finish("TIMEOUT: el Wisp no respondió en 15s", 1), 15_000);

const conn = new wisp.ClientConnection(endpoint);

conn.onopen = () => {
  console.log(`conectado a ${endpoint}`);
  const stream = conn.create_stream(target, port);
  let received = "";

  stream.onmessage = (data) => {
    received += new TextDecoder().decode(data);
    if (received.length > 2_000) stream.close?.();
  };
  stream.onclose = () => {
    clearTimeout(timer);
    if (/Example Domain/.test(received)) {
      finish(`OK: ${received.length} bytes de ${target} a través de Wisp y TCP`);
    } else {
      finish(`RESPUESTA INESPERADA (${received.length} bytes): ${received.slice(0, 120)}`, 1);
    }
  };

  stream.send(
    new TextEncoder().encode(
      `GET / HTTP/1.1\r\nHost: ${target}\r\nUser-Agent: dounia-wisp-check\r\nConnection: close\r\n\r\n`,
    ),
  );
};

conn.onerror = () => {
  clearTimeout(timer);
  finish("ERROR: no se pudo abrir el WebSocket de Wisp", 1);
};
