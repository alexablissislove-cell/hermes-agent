import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getGatewayConfig: vi.fn(),
  transitionWebhookDelivery: vi.fn().mockResolvedValue(undefined),
  appendGatewayLog: vi.fn().mockResolvedValue(undefined),
  invokeLLM: vi.fn(),
}));

vi.mock("./db", () => mocks);
vi.mock("./_core/llm", () => ({ invokeLLM: mocks.invokeLLM }));

import { __test__messageFromUpdate, processTelegramUpdate } from "./telegramGateway";

describe("Telegram gateway worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HTTP_telegram_API_Bot = "managed-token";
    process.env.OPENAI_API_KEY = "";
    process.env.Openai_api = "";
    mocks.getGatewayConfig.mockResolvedValue({ enabled: true, requestTimeoutMs: 5000, allowedChatIds: [] });
    mocks.invokeLLM.mockResolvedValue({ choices: [{ message: { content: "Hello from Hermes" } }] });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, result: { message_id: 1 } }), { status: 200, headers: { "content-type": "application/json" } })));
  });

  it("extracts text messages and chat identifiers", () => {
    expect(__test__messageFromUpdate({ update_id: 1, message: { text: " hello ", chat: { id: 123 }, from: { first_name: "Ada" } } })).toEqual({ chatId: "123", text: "hello", sender: "Ada" });
    expect(__test__messageFromUpdate({ update_id: 2, message: { chat: { id: 123 } } })).toBeNull();
  });

  it("calls the server-side LLM and sends a Telegram response", async () => {
    const result = await processTelegramUpdate(10, { update_id: 10, message: { text: "hello", chat: { id: 123 } } });
    expect(result).toEqual({ ok: true, chatId: "123" });
    expect(mocks.invokeLLM).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/sendMessage"), expect.objectContaining({ method: "POST" }));
    expect(mocks.transitionWebhookDelivery).toHaveBeenCalledWith(10, "processing", expect.any(Object));
    expect(mocks.transitionWebhookDelivery).toHaveBeenCalledWith(10, "processed", expect.any(Object));
  });

  it("rejects non-allowlisted chats without calling AI", async () => {
    mocks.getGatewayConfig.mockResolvedValue({ enabled: true, requestTimeoutMs: 5000, allowedChatIds: ["999"] });
    const result = await processTelegramUpdate(11, { update_id: 11, message: { text: "hello", chat: { id: 123 } } });
    expect(result).toEqual({ ok: false, reason: "chat_not_allowed" });
    expect(mocks.invokeLLM).not.toHaveBeenCalled();
    expect(mocks.transitionWebhookDelivery).toHaveBeenCalledWith(11, "rejected", expect.any(Object));
  });
});
