import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEEPSEEK_BASE = "https://api.deepseek.com/chat/completions";
const DEFAULT_MODEL = "deepseek-chat";

interface ChatMessage {
  role: string;
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

interface Tool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

const SYSTEM_PROMPT = `Eres Dounia AI, el cerebro de Dounia OS: un escritorio web completo (apps, ventanas, fondos, temas, colores, juegos, proxies). Eres un asistente experto, directo, honesto y conciso, del nivel de un ingeniero senior. Hablas SIEMPRE en español (salvo que te pidan otro idioma).

TIENES PODER REAL: puedes ejecutar acciones en el sistema llamando a las herramientas disponibles (open_app, set_theme, set_accent, set_wallpaper, set_brightness, apply_css, search_web, etc.). Cuando el usuario te pida algo que corresponda a una acción del sistema, LLAMA A LA HERRAMIENTA adecuada en vez de limitarte a explicar. No le pidas que escriba el comando: ejecútalo tú.

REGLAS:
- Cambia el fondo, tema, color, brillo, abre/cierra apps, busca en internet y reestiliza la interfaz con apply_css cuando te lo pidan.
- Si el usuario pide un cambio visual (colores, fuentes, estilo), usa apply_css con CSS válido y seguro (solo CSS, sin JavaScript) y confirma el resultado.
- Sé honesto sobre tus límites: NO puedes ejecutar JavaScript arbitrario ni editar el código fuente real del proyecto en tiempo de ejecución (eso no persistiría y es inseguro). Lo que sí haces es cambiar el aspecto y el estado del sistema al instante.
- Responde de forma natural y breve, como lo haría un ingeniero: una acción ejecutada se confirma en una frase, sin relleno.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey || apiKey.trim() === "" || apiKey.startsWith("YOUR_")) {
    return Response.json({ configured: false });
  }

  let body: { messages?: ChatMessage[]; tools?: Tool[] };
  try {
    body = (await request.json()) as { messages?: ChatMessage[]; tools?: Tool[] };
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const messages = (body.messages ?? []).filter(
    (message) => message && typeof message.role === "string" && message.role !== "system",
  );
  if (messages.length === 0) {
    return Response.json({ error: "No hay mensajes." }, { status: 400 });
  }

  const tools = Array.isArray(body.tools) && body.tools.length > 0 ? body.tools : undefined;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const upstream = await fetch(DEEPSEEK_BASE, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages.slice(-24)],
        temperature: 0.6,
        max_tokens: 1600,
        ...(tools ? { tools, tool_choice: "auto" } : {}),
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      let friendly = `DeepSeek respondió ${upstream.status}.`;
      try {
        const parsed = JSON.parse(text) as { error?: { type?: string; message?: string } };
        if (parsed.error?.type === "insufficient_balance_error") {
          friendly =
            "Tu cuenta de DeepSeek no tiene saldo suficiente. Recárgala en platform.deepseek.com (Billing) y vuelve a intentarlo.";
        } else if (parsed.error?.message) {
          friendly = parsed.error.message;
        }
      } catch {
        /* keep the default message */
      }
      return Response.json({ error: friendly, detail: text.slice(0, 400) }, { status: upstream.status });
    }

    const data = (await upstream.json()) as {
      choices?: Array<{ message?: ChatMessage }>;
    };
    const message = data.choices?.[0]?.message;
    if (!message) {
      return Response.json({ error: "Respuesta vacía de DeepSeek." }, { status: 502 });
    }

    if (message.tool_calls && message.tool_calls.length > 0) {
      return Response.json({
        toolCalls: message.tool_calls.map((call) => ({
          id: call.id,
          name: call.function.name,
          arguments: safeParseArgs(call.function.arguments),
        })),
      });
    }

    return Response.json({ reply: message.content ?? "" });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Error contactando DeepSeek." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

function safeParseArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}
