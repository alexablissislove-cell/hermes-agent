import { describe, expect, it } from "vitest";
import { getManagedBrightDataConfig, getManagedOpenAIKey, getManagedTelegramBotToken, getManagedTelegramWebhookSecret, getRuntimeCredentialStatus } from "./runtimeCredentials";

describe("managed runtime credentials", () => {
  it("maps the configured Telegram, OpenAI, and Bright Data keys", () => {
    const env = {
      HTTP_telegram_API_Bot: "telegram-token",
      Telegram_Bot_Credentials: "telegram-profile",
      Openai_api: "openai-token",
      BRIGHTDATA_PROXY_HOST: "proxy.example",
      BRIGHTDATA_PROXY_PORT: "44445",
      BRIGHTDATA_ZONE: "zone-a",
      BRIGHTDATA_USERNAME: "user-a",
      BRIGHTDATA_PASSWORD: "password-a",
    };

    expect(getManagedTelegramBotToken(env)).toBe("telegram-token");
    expect(getManagedOpenAIKey(env)).toBe("openai-token");
    expect(getManagedTelegramWebhookSecret({ TELEGRAM_WEBHOOK_SECRET: "webhook-secret" })).toBe("webhook-secret");
    expect(getManagedBrightDataConfig(env)).toMatchObject({ host: "proxy.example", port: 44445, zone: "zone-a" });
    expect(getRuntimeCredentialStatus(env)).toEqual({
      telegramBotConfigured: true,
      telegramProfileConfigured: true,
      openAIConfigured: true,
      brightDataConfigured: true,
    });
  });

  it("fails closed for partial or invalid Bright Data configuration", () => {
    expect(getManagedBrightDataConfig({ BRIGHTDATA_PROXY_HOST: "proxy", BRIGHTDATA_PROXY_PORT: "not-a-port", BRIGHTDATA_ZONE: "zone", BRIGHTDATA_USERNAME: "user", BRIGHTDATA_PASSWORD: "pass" })).toBeNull();
    expect(getManagedBrightDataConfig({ BRIGHTDATA_PROXY_HOST: "proxy", BRIGHTDATA_PROXY_PORT: "70000", BRIGHTDATA_ZONE: "zone", BRIGHTDATA_USERNAME: "user", BRIGHTDATA_PASSWORD: "pass" })).toBeNull();
    expect(getManagedBrightDataConfig({ BRIGHTDATA_PROXY_HOST: "proxy" })).toBeNull();
  });

  it("fails closed when managed credential values are absent", () => {
    const env = {};
    expect(getManagedTelegramBotToken(env)).toBe("");
    expect(getManagedOpenAIKey(env)).toBe("");
    expect(getManagedBrightDataConfig(env)).toBeNull();
    expect(getRuntimeCredentialStatus(env)).toEqual({
      telegramBotConfigured: false,
      telegramProfileConfigured: false,
      openAIConfigured: false,
      brightDataConfigured: false,
    });
  });
});
