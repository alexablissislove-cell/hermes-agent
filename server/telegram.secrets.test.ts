import { describe, expect, it } from "vitest";

describe("Telegram Bot API secret configuration", () => {
  it("authenticates with getMe without exposing the token", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN || process.env.HTTP_telegram_API_Bot;
    expect(token, "A server-side Telegram bot token must be configured").toBeTruthy();
    if (!token) return;

    const response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(token)}/getMe`);
    const body = await response.json().catch(() => ({ ok: false }));

    expect(response.ok).toBe(true);
    expect(body).toMatchObject({ ok: true });
    expect(JSON.stringify(body)).not.toContain(token);
  }, 20_000);
});
