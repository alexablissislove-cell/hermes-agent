import { getBrightDataProxyConfig, type BrightDataProxyConfig } from "./credentials";

export function getManagedTelegramBotToken(env: NodeJS.ProcessEnv = process.env) {
  return env.HTTP_telegram_API_Bot?.trim() || env.TELEGRAM_BOT_TOKEN?.trim() || "";
}

export function getManagedTelegramProfile(env: NodeJS.ProcessEnv = process.env) {
  return env.Telegram_Bot_Credentials?.trim() || "";
}

export function getManagedOpenAIKey(env: NodeJS.ProcessEnv = process.env) {
  return env.OPENAI_API_KEY?.trim() || env.Openai_api?.trim() || "";
}

export function getManagedTelegramWebhookSecret(env: NodeJS.ProcessEnv = process.env) {
  return env.TELEGRAM_WEBHOOK_SECRET?.trim() || env.TELEGRAM_SECRET_TOKEN?.trim() || env.HTTP_telegram_API_Secret?.trim() || "";
}

export function getManagedBrightDataConfig(env: NodeJS.ProcessEnv = process.env): BrightDataProxyConfig | null {
  return getBrightDataProxyConfig(env);
}

export function getRuntimeCredentialStatus(env: NodeJS.ProcessEnv = process.env) {
  return {
    telegramBotConfigured: Boolean(getManagedTelegramBotToken(env)),
    telegramProfileConfigured: Boolean(getManagedTelegramProfile(env)),
    openAIConfigured: Boolean(getManagedOpenAIKey(env)),
    brightDataConfigured: Boolean(getManagedBrightDataConfig(env)),
  } as const;
}
