import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { webhookDeliveries } from "../drizzle/schema";
import { appendGatewayLog, getDb, getGatewayConfig } from "./db";
import { ENV } from "./_core/env";

export function updateIdFrom(body: unknown) {
  if (!body || typeof body !== "object") return undefined;
  const value = (body as { update_id?: unknown }).update_id;
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : undefined;
}

export function isWebhookSecretValid(expectedSecret: string, receivedSecret: string) {
  return !expectedSecret || expectedSecret === receivedSecret;
}

export function isDuplicateUpdate(existingUpdateIds: number[], updateId: number) {
  return existingUpdateIds.includes(updateId);
}

export function registerTelegramWebhook(app: Express) {
  app.post("/api/webhooks/telegram", async (req: Request, res: Response) => {
    const config = await getGatewayConfig();
    const updateId = updateIdFrom(req.body);
    const botToken = config?.botToken?.trim() || ENV.telegramBotToken;
    if (!config?.enabled || !botToken) {
      res.status(503).json({ ok: false, error: "Gateway is not enabled or configured" });
      return;
    }
    const expectedSecret = config?.webhookSecret?.trim() || ENV.telegramWebhookSecret;
    const receivedSecret = req.header("X-Telegram-Bot-Api-Secret-Token") ?? "";
    if (!isWebhookSecretValid(expectedSecret ?? "", receivedSecret)) {
      await appendGatewayLog({ level: "warn", message: "Rejected Telegram webhook: invalid secret token", context: { updateId } });
      res.status(401).json({ ok: false, error: "Invalid webhook secret" });
      return;
    }
    if (updateId === undefined) {
      await appendGatewayLog({ level: "warn", message: "Rejected Telegram webhook: missing update_id", context: { bodyType: typeof req.body } });
      res.status(400).json({ ok: false, error: "Telegram update_id is required" });
      return;
    }
    const db = await getDb();
    if (!db) {
      res.status(503).json({ ok: false, error: "Database unavailable" });
      return;
    }
    try {
      await db.insert(webhookDeliveries).values({ updateId, status: "accepted", payload: req.body as Record<string, unknown> });
    } catch {
      const existing = await db.select({ updateId: webhookDeliveries.updateId }).from(webhookDeliveries).where(eq(webhookDeliveries.updateId, updateId)).limit(1);
      if (isDuplicateUpdate(existing.map(row => row.updateId), updateId)) {
        await appendGatewayLog({ level: "debug", message: "Ignored duplicate Telegram update", context: { updateId } });
        res.status(200).json({ ok: true, duplicate: true });
        return;
      }
      await appendGatewayLog({ level: "error", message: "Failed to persist Telegram webhook delivery", context: { updateId } });
      res.status(500).json({ ok: false, error: "Failed to persist webhook delivery" });
      return;
    }
    await appendGatewayLog({ level: "info", message: "Accepted Telegram webhook update", context: { updateId } });
    res.status(200).json({ ok: true, updateId });
  });
}
