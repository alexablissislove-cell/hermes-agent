import { ProxyAgent } from "undici";
import { invokeLLM } from "./_core/llm";
import { appendGatewayLog, getGatewayConfig, transitionWebhookDelivery } from "./db";
import { formatTelegramText } from "./telegramFormatting";
import { getManagedBrightDataConfig, getManagedOpenAIKey, getManagedTelegramBotToken } from "./runtimeCredentials";

type TelegramUpdate = {
  update_id: number;
  message?: {
    text?: string;
    chat?: { id?: number | string; type?: string };
    from?: { first_name?: string; username?: string };
  };
};

type TelegramApiResponse<T> = { ok: boolean; result?: T; description?: string; parameters?: { retry_after?: number } };

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function proxyDispatcher() {
  const proxy = getManagedBrightDataConfig();
  if (!proxy) return undefined;
  const auth = `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}`;
  return new ProxyAgent(`http://${auth}@${proxy.host}:${proxy.port}`);
}

function requestInit(init: RequestInit = {}): RequestInit & { dispatcher?: ProxyAgent } {
  const dispatcher = proxyDispatcher();
  return dispatcher ? { ...init, dispatcher } : init;
}

export async function telegramRequest<T>(botToken: string, method: string, payload?: Record<string, unknown>, timeoutMs = 10000): Promise<{ response: Response; body: TelegramApiResponse<T> }> {
  let lastError: unknown;
  for (const useProxy of [true, false]) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, useProxy ? requestInit({
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload ?? {}),
        signal: controller.signal,
      }) : {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload ?? {}),
        signal: controller.signal,
      });
      const body = await response.json().catch(() => ({ ok: false, description: "Telegram returned a non-JSON response" })) as TelegramApiResponse<T>;
      return { response, body };
    } catch (error) {
      lastError = error;
      if (!useProxy) throw error;
      await appendGatewayLog({ level: "warn", message: "Bright Data Telegram route failed; retrying direct", context: { method } });
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Telegram request failed");
}

function contentToText(content: unknown) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content.map(part => {
    if (typeof part === "string") return part;
    if (part && typeof part === "object" && "text" in part && typeof (part as { text?: unknown }).text === "string") return (part as { text: string }).text;
    return "";
  }).join("\n").trim();
}

async function invokeHermesModel(prompt: string) {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are Hermes, a concise Telegram gateway assistant. Reply with plain text, no Markdown tables." },
      { role: "user", content: prompt },
    ],
  });
  const text = contentToText(response.choices[0]?.message?.content);
  if (!text) throw new Error("Managed LLM returned an empty response");
  return text;
}

async function callOpenAI(prompt: string, timeoutMs: number) {
  const key = getManagedOpenAIKey();
  if (!key) return invokeHermesModel(prompt);

  const baseUrl = (process.env.OPENAI_API_BASE_URL || process.env.OPENAI_API_BASE || "https://api.openai.com/v1").replace(/\/+$/, "");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/chat/completions`, requestInit({
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.HERMES_OPENAI_MODEL || "gpt-5-mini",
          messages: [
            { role: "system", content: "You are Hermes, a concise Telegram gateway assistant. Reply with plain text, no Markdown tables." },
            { role: "user", content: prompt },
          ],
          max_completion_tokens: 700,
        }),
        signal: controller.signal,
      }));
    } catch (proxyError) {
      await appendGatewayLog({ level: "warn", message: "Bright Data OpenAI route failed; retrying direct", context: { error: proxyError instanceof Error ? proxyError.message.slice(0, 120) : "transport failure" } });
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: process.env.HERMES_OPENAI_MODEL || "gpt-5-mini",
          messages: [
            { role: "system", content: "You are Hermes, a concise Telegram gateway assistant. Reply with plain text, no Markdown tables." },
            { role: "user", content: prompt },
          ],
          max_completion_tokens: 700,
        }),
        signal: controller.signal,
      });
    }
    const body = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
    if (!response.ok) {
      const details = body.error?.message || `OpenAI request failed with HTTP ${response.status}`;
      if (/credit|quota|billing|rate.?limit|too many requests|429|401|403/i.test(details)) {
        await appendGatewayLog({ level: "warn", message: "Raw OpenAI route unavailable; using managed Hermes model fallback", context: { status: response.status, reason: details.slice(0, 160) } });
        return invokeHermesModel(prompt);
      }
      throw new Error(details);
    }
    const text = contentToText(body.choices?.[0]?.message?.content);
    if (!text) throw new Error("OpenAI returned an empty response");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function messageFromUpdate(payload: Record<string, unknown>) {
  const update = payload as unknown as TelegramUpdate;
  const chatId = update.message?.chat?.id;
  const text = update.message?.text?.trim();
  if (chatId === undefined || !text) return null;
  return { chatId: String(chatId), text, sender: update.message?.from?.username || update.message?.from?.first_name || "Telegram user" };
}

export async function processTelegramUpdate(updateId: number, payload: Record<string, unknown>) {
  const config = await getGatewayConfig();
  const botToken = config?.botToken?.trim() || getManagedTelegramBotToken();
  if (!config?.enabled || !botToken) {
    await transitionWebhookDelivery(updateId, "failed", { errorMessage: "Gateway disabled or Telegram credential unavailable", incrementAttempt: true, processedAt: new Date() });
    return { ok: false, reason: "gateway_not_ready" } as const;
  }

  const message = messageFromUpdate(payload);
  if (!message) {
    await transitionWebhookDelivery(updateId, "processed", { processedAt: new Date(), incrementAttempt: true });
    await appendGatewayLog({ level: "debug", message: "Telegram update processed without a text message", context: { updateId } });
    return { ok: true, ignored: true } as const;
  }

  const allowed = Array.isArray(config.allowedChatIds) ? config.allowedChatIds.map(String).filter(Boolean) : [];
  if (allowed.length > 0 && !allowed.includes(message.chatId)) {
    await transitionWebhookDelivery(updateId, "rejected", { errorMessage: "Chat ID is not in the configured allowlist", incrementAttempt: true, processedAt: new Date() });
    await appendGatewayLog({ level: "warn", message: "Rejected Telegram message from unallowed chat", context: { updateId, chatId: message.chatId } });
    return { ok: false, reason: "chat_not_allowed" } as const;
  }

  await transitionWebhookDelivery(updateId, "processing", { processingStartedAt: new Date(), incrementAttempt: true });
  const prompt = `${message.sender} sent this Telegram message:\n\n${message.text}`;
  try {
    const reply = await callOpenAI(prompt, config.requestTimeoutMs ?? 10000);
    const sent = await telegramRequest(botToken, "sendMessage", { chat_id: message.chatId, text: formatTelegramText(reply, "plain") }, config.requestTimeoutMs ?? 10000);
    if (!sent.response.ok || !sent.body.ok) throw new Error(sent.body.description || `Telegram sendMessage failed with HTTP ${sent.response.status}`);
    await transitionWebhookDelivery(updateId, "processed", { processedAt: new Date(), errorMessage: null });
    await appendGatewayLog({ level: "info", message: "Telegram update processed and response sent", context: { updateId, chatId: message.chatId } });
    return { ok: true, chatId: message.chatId } as const;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown Telegram processing error";
    const retryable = /timeout|aborted|429|rate|temporar|502|503|504/i.test(errorMessage);
    await transitionWebhookDelivery(updateId, retryable ? "retryable" : "failed", { errorMessage: errorMessage.slice(0, 1000), nextAttemptAt: retryable ? new Date(Date.now() + 30_000) : null });
    await appendGatewayLog({ level: "error", message: "Telegram update processing failed", context: { updateId, retryable, error: errorMessage.slice(0, 300) } });
    return { ok: false, retryable, reason: errorMessage } as const;
  }
}

export function __test__messageFromUpdate(payload: Record<string, unknown>) {
  return messageFromUpdate(payload);
}
