import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getGatewayConfig: vi.fn(),
  getDb: vi.fn(),
  appendGatewayLog: vi.fn().mockResolvedValue(undefined),
  transitionWebhookDelivery: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./db", () => mocks);
vi.mock("./telegramGateway", () => ({ processTelegramUpdate: vi.fn().mockResolvedValue({ ok: true }) }));

import { isDuplicateUpdate, isWebhookSecretValid, registerTelegramWebhook, updateIdFrom } from "./webhook";

type Handler = (req: any, res: any) => Promise<void>;

function createRoute() {
  let handler: Handler | undefined;
  const app = { post: vi.fn((_path: string, next: Handler) => { handler = next; }) };
  registerTelegramWebhook(app as any);
  if (!handler) throw new Error("Webhook handler was not registered");
  return handler;
}

function response() {
  const state = { statusCode: 200, body: undefined as unknown };
  return {
    state,
    status(code: number) { state.statusCode = code; return this; },
    json(body: unknown) { state.body = body; return this; },
  };
}

describe("Telegram webhook helpers", () => {
  it("accepts a non-negative integer update_id", () => {
    expect(updateIdFrom({ update_id: 42 })).toBe(42);
  });

  it("rejects malformed update ids", () => {
    expect(updateIdFrom({})).toBeUndefined();
    expect(updateIdFrom({ update_id: -1 })).toBeUndefined();
    expect(updateIdFrom({ update_id: 1.5 })).toBeUndefined();
    expect(updateIdFrom({ update_id: "42" })).toBeUndefined();
    expect(updateIdFrom(null)).toBeUndefined();
  });

  it("requires a configured secret to match exactly and detects duplicates", () => {
    expect(isWebhookSecretValid("", "anything")).toBe(true);
    expect(isWebhookSecretValid("hermes-secret", "hermes-secret")).toBe(true);
    expect(isWebhookSecretValid("hermes-secret", "wrong-secret")).toBe(false);
    expect(isDuplicateUpdate([10, 11, 12], 11)).toBe(true);
    expect(isDuplicateUpdate([10, 11, 12], 13)).toBe(false);
  });
});

describe("POST /api/webhooks/telegram", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getGatewayConfig.mockResolvedValue({ enabled: true, botToken: "bot-token", webhookSecret: "hermes-secret" });
    mocks.getDb.mockResolvedValue({
      insert: () => ({ values: vi.fn().mockResolvedValue(undefined) }),
      select: () => ({ from: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue([]) }) }) }),
    });
  });

  it("accepts and persists a valid Telegram update", async () => {
    const res = response();
    await createRoute()({ body: { update_id: 42, message: { text: "hello" } }, header: () => "hermes-secret" }, res);
    expect(res.state.statusCode).toBe(200);
    expect(res.state.body).toEqual({ ok: true, updateId: 42, processed: true });
  });

  it("rejects an invalid secret before persistence", async () => {
    const res = response();
    await createRoute()({ body: { update_id: 43 }, header: () => "wrong" }, res);
    expect(res.state.statusCode).toBe(401);
    expect(res.state.body).toMatchObject({ ok: false, error: "Invalid webhook secret" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects an update without update_id", async () => {
    const res = response();
    await createRoute()({ body: { message: { text: "missing id" } }, header: () => "hermes-secret" }, res);
    expect(res.state.statusCode).toBe(400);
    expect(res.state.body).toMatchObject({ ok: false, error: "Telegram update_id is required" });
  });

  it("acknowledges a duplicate delivery without inserting it again", async () => {
    const insert = vi.fn().mockRejectedValue(new Error("duplicate key"));
    mocks.getDb.mockResolvedValue({
      insert: () => ({ values: insert }),
      select: () => ({ from: () => ({ where: () => ({ limit: vi.fn().mockResolvedValue([{ updateId: 44 }]) }) }) }),
    });
    const res = response();
    await createRoute()({ body: { update_id: 44 }, header: () => "hermes-secret" }, res);
    expect(res.state.statusCode).toBe(200);
    expect(res.state.body).toEqual({ ok: true, duplicate: true });
    expect(insert).toHaveBeenCalledOnce();
  });
});
