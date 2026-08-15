import { describe, expect, it } from "vitest";
import { getManagedTelegramBotToken } from "./runtimeCredentials";
import { telegramRequest } from "./telegramGateway";

describe("Telegram Bot API secret configuration", () => {
  it("resolves the server-side Telegram token without exposing its value", () => {
    const token = getManagedTelegramBotToken();
    expect(token, "A server-side Telegram bot token must be configured").toBeTruthy();
    expect(token.length).toBeGreaterThan(10);
    expect(JSON.stringify({ configured: Boolean(token) })).not.toContain(token);
  });

  it.skipIf(process.env.HERMES_LIVE_INTEGRATION !== "1")(
    "authenticates with getMe without exposing the token",
    async () => {
      const token = getManagedTelegramBotToken();
      const { response, body } = await telegramRequest(token, "getMe", undefined, 20_000);

      expect(response.ok).toBe(true);
      expect(body).toMatchObject({ ok: true });
      expect(JSON.stringify(body)).not.toContain(token);
    },
    20_000,
  );
});
