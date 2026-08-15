export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  telegramBotToken: process.env.HTTP_telegram_API_Bot ?? process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramBotProfile: process.env.Telegram_Bot_Credentials ?? "",
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET ?? process.env.TELEGRAM_SECRET_TOKEN ?? process.env.HTTP_telegram_API_Secret ?? "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? process.env.Openai_api ?? "",
};
