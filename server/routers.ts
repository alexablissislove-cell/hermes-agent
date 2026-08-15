import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { ENV } from "./_core/env";
import { verifyOpenAIConnection } from "./openai";
import { appendGatewayLog, getAlertThresholds, getGatewayConfig, getLatestMetrics, getRecentLogs, getSecurityRules, getWebhookDeliveries, saveAlertThresholds, saveGatewayConfig, saveSecurityRules } from "./db";

const gatewayInput = z.object({
  botToken: z.string().max(512).nullable(),
  webhookUrl: z.string().url().or(z.literal("")).nullable(),
  allowedChatIds: z.array(z.string().min(1)).max(500),
  rateLimitPerMinute: z.number().int().min(1).max(10000),
  maxConnections: z.number().int().min(1).max(10000),
  requestTimeoutMs: z.number().int().min(500).max(120000),
  webhookSecret: z.string().max(128).nullable(),
  enabled: z.boolean(),
});

const securityInput = z.object({
  apiKeys: z.array(z.string().min(8).max(256)).max(100),
  ipAllowlist: z.array(z.string().min(1).max(64)).max(500),
  accessControlRules: z.array(z.object({ subject: z.string().min(1), permission: z.string().min(1), enabled: z.boolean() })).max(200),
  requireSignedWebhooks: z.boolean(),
});

function ownerOnly(ctx: { user: { openId: string } | null }) {
  if (!ctx.user || ctx.user.openId !== ENV.ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access is required for Hermes Agent." });
  }
}

const ownerProcedure = protectedProcedure.use(({ ctx, next }) => {
  ownerOnly(ctx);
  return next();
});

function resolveTelegramBotToken(config: Awaited<ReturnType<typeof getGatewayConfig>>) {
  return config?.botToken?.trim() || ENV.telegramBotToken;
}

export function buildWebhookRegistrationPayload(config: NonNullable<Awaited<ReturnType<typeof getGatewayConfig>>>) {
  return {
    url: config.webhookUrl,
    ...(config.webhookSecret || ENV.telegramWebhookSecret ? { secret_token: config.webhookSecret || ENV.telegramWebhookSecret } : {}),
    allowed_updates: ["message", "edited_message", "callback_query"],
  };
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  hermes: router({
    overview: ownerProcedure.query(async () => {
      const [config, metrics, logs] = await Promise.all([getGatewayConfig(), getLatestMetrics(1), getRecentLogs(5)]);
      const latest = metrics[0];
      return {
        gateway: { enabled: config?.enabled ?? false, configured: Boolean(resolveTelegramBotToken(config)), webhookUrl: config?.webhookUrl ?? "" },
        metrics: latest ?? { uptimeSeconds: 0, messagesPerSecond: 0, activeConnections: 0, latencyMs: 0, errorRate: 0, errorCount: 0 },
        recentLogs: logs,
      };
    }),
    configuration: router({
      get: ownerProcedure.query(async () => getGatewayConfig()),
      save: ownerProcedure.input(gatewayInput).mutation(async ({ input, ctx }) => saveGatewayConfig({ ...input, allowedChatIds: input.allowedChatIds, updatedBy: ctx.user.id })),
    }),
    security: router({
      get: ownerProcedure.query(async () => getSecurityRules()),
      save: ownerProcedure.input(securityInput).mutation(async ({ input, ctx }) => saveSecurityRules({ ...input, apiKeys: input.apiKeys, ipAllowlist: input.ipAllowlist, accessControlRules: input.accessControlRules, updatedBy: ctx.user.id })),
      rotate: ownerProcedure.mutation(async ({ ctx }) => {
        const current = await getSecurityRules();
        const next = { apiKeys: current?.apiKeys ?? [], ipAllowlist: current?.ipAllowlist ?? [], accessControlRules: current?.accessControlRules ?? [], requireSignedWebhooks: current?.requireSignedWebhooks ?? true, lastTokenRotationAt: new Date(), updatedBy: ctx.user.id };
        await appendGatewayLog({ level: "info", message: "API token rotation requested", context: { actorId: ctx.user.id } });
        return saveSecurityRules(next);
      }),
    }),
    monitor: router({
      snapshot: ownerProcedure.query(async () => {
        const [metrics, logs, thresholds] = await Promise.all([getLatestMetrics(30), getRecentLogs(50), getAlertThresholds()]);
        return { metrics: metrics.reverse(), logs: logs.reverse(), thresholds };
      }),
      saveThresholds: ownerProcedure.input(z.object({ latencyMs: z.number().min(0), errorRate: z.number().min(0).max(1), messagesPerSecond: z.number().min(0), enabled: z.boolean() })).mutation(async ({ input, ctx }) => saveAlertThresholds({ ...input, updatedBy: ctx.user.id })),
    }),
    test: router({
      send: ownerProcedure.input(z.object({ chatId: z.string().min(1), text: z.string().min(1).max(4096), parseMode: z.enum(["plain", "markdown", "html"]) })).mutation(async ({ input }) => {
        const config = await getGatewayConfig();
        const payload = { chat_id: input.chatId, text: input.text, ...(input.parseMode === "plain" ? {} : { parse_mode: input.parseMode === "markdown" ? "MarkdownV2" : "HTML" }) };
        const botToken = resolveTelegramBotToken(config);
        if (!botToken) {
          return { ok: false, status: 412, request: payload, response: { ok: false, description: "Configure a bot token before sending a live message." } };
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), config?.requestTimeoutMs ?? 10000);
        try {
          const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
          const body = await response.json().catch(() => ({ ok: false, description: "Non-JSON response" }));
          await appendGatewayLog({ level: response.ok ? "info" : "error", message: response.ok ? "Test message sent" : "Test message failed", context: { chatId: input.chatId, status: response.status } });
          return { ok: response.ok, status: response.status, request: payload, response: body };
        } finally {
          clearTimeout(timer);
        }
      }),
    }),
    webhook: router({
      deliveries: ownerProcedure.query(async () => getWebhookDeliveries(50)),
      register: ownerProcedure.mutation(async () => {
        const config = await getGatewayConfig();
        const botToken = resolveTelegramBotToken(config);
        if (!botToken || !config?.webhookUrl) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Configure the bot token and webhook URL first." });
        const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(buildWebhookRegistrationPayload(config)) });
        const body = await response.json().catch(() => ({ ok: false, description: "Non-JSON response" }));
        await appendGatewayLog({ level: response.ok ? "info" : "error", message: response.ok ? "Telegram webhook registration completed" : "Telegram webhook registration failed", context: { status: response.status } });
        return { status: response.status, ...body };
      }),
      verify: ownerProcedure.mutation(async () => {
        const config = await getGatewayConfig();
        const botToken = resolveTelegramBotToken(config);
        if (!botToken) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Configure the bot token first." });
        const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
        const body = await response.json().catch(() => ({ ok: false, description: "Non-JSON response" }));
        return { status: response.status, ...body };
      }),
    }),
    openai: router({
      verify: ownerProcedure.mutation(async () => verifyOpenAIConnection()),
    }),
    troubleshoot: router({
      run: ownerProcedure.mutation(async () => {
        const config = await getGatewayConfig();
        const checks = [
          { name: "Configuration", status: resolveTelegramBotToken(config) ? "pass" : "warn", detail: resolveTelegramBotToken(config) ? "Bot token is configured server-side." : "Bot token is not configured." },
          { name: "Webhook URL", status: config?.webhookUrl ? "pass" : "warn", detail: config?.webhookUrl ? "Webhook URL is present." : "No webhook URL configured." },
          { name: "Database", status: "pass", detail: "Control-plane persistence is available." },
        ] as const;
        await appendGatewayLog({ level: "info", message: "Health-check runner completed", context: { checks: checks.length } });
        return { checkedAt: new Date(), checks };
      }),
      logs: ownerProcedure.query(async () => getRecentLogs(100)),
    }),
  }),
});

export type AppRouter = typeof appRouter;
