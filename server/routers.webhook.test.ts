import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getGatewayConfig: vi.fn(),
  appendGatewayLog: vi.fn().mockResolvedValue(undefined),
  getAlertThresholds: vi.fn(),
  getLatestMetrics: vi.fn(),
  getRecentLogs: vi.fn(),
  getSecurityRules: vi.fn(),
  getWebhookDeliveries: vi.fn(),
  getWebhookDeliveryDiagnostics: vi.fn().mockResolvedValue([]),
  replayWebhookDelivery: vi.fn(),
  saveAlertThresholds: vi.fn(),
  saveGatewayConfig: vi.fn(),
  saveSecurityRules: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { ENV } from "./_core/env";
import { appRouter } from "./routers";

type CallerContext = Parameters<typeof appRouter.createCaller>[0];

function createContext(): CallerContext {
  return {
    user: {
      id: 1,
      openId: ENV.ownerOpenId,
      name: "Owner",
      email: "owner@example.test",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as CallerContext["req"],
    res: {} as CallerContext["res"],
  };
}

describe("hermes.webhook.register", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    dbMocks.getGatewayConfig.mockResolvedValue({
      enabled: true,
      botToken: "test-bot-token",
      webhookUrl: "https://example.test/api/webhooks/telegram",
      webhookSecret: null,
    });
  });

  it("sends the managed webhook secret when the database secret is absent", async () => {
    const previous = ENV.telegramWebhookSecret;
    ENV.telegramWebhookSecret = "managed-webhook-secret";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    try {
      await appRouter.createCaller(createContext()).hermes.webhook.register();
      const request = fetchMock.mock.calls[0]?.[1];
      const body = JSON.parse(String(request?.body));
      expect(body.secret_token).toBe("managed-webhook-secret");
    } finally {
      ENV.telegramWebhookSecret = previous;
    }
  });

  it("replays a failed delivery through the owner-only mutation", async () => {
    dbMocks.replayWebhookDelivery.mockResolvedValue({ updateId: 44, status: "received" });
    const result = await appRouter.createCaller(createContext()).hermes.webhook.replay({ updateId: 44 });
    expect(result).toMatchObject({ updateId: 44, status: "received" });
    expect(dbMocks.replayWebhookDelivery).toHaveBeenCalledWith(44);
  });

  it("returns health checks from the Telegram getWebhookInfo response", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, result: { url: "https://example.test/api/webhooks/telegram", pending_update_count: 0 } }), { status: 200 }));
    const result = await appRouter.createCaller(createContext()).hermes.webhook.health();
    expect(result.ok).toBe(true);
    expect(result.checks).toEqual(expect.arrayContaining([expect.objectContaining({ name: "Telegram API", status: "pass" }), expect.objectContaining({ name: "Pending updates", status: "pass" })]));
    expect(fetchMock).toHaveBeenCalled();
  });

  it("omits secret_token when neither database nor environment provides one", async () => {
    const previous = ENV.telegramWebhookSecret;
    ENV.telegramWebhookSecret = "";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    try {
      await appRouter.createCaller(createContext()).hermes.webhook.register();
      const request = fetchMock.mock.calls[0]?.[1];
      const body = JSON.parse(String(request?.body));
      expect(body).not.toHaveProperty("secret_token");
    } finally {
      ENV.telegramWebhookSecret = previous;
    }
  });
});
