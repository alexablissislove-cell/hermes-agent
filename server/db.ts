import { and, desc, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { alertThresholds, gatewayConfigs, gatewayLogs, gatewayMetrics, securityRules, users, webhookDeliveries, type InsertUser } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date();
  updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role !== undefined || user.openId === ENV.ownerOpenId) {
    values.role = user.role ?? "admin";
    updateSet.role = values.role;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getGatewayConfig() {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(gatewayConfigs).orderBy(desc(gatewayConfigs.id)).limit(1);
  return rows[0];
}

export async function saveGatewayConfig(input: typeof gatewayConfigs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await getGatewayConfig();
  if (current) {
    await db.update(gatewayConfigs).set({ ...input, updatedAt: new Date() }).where(eq(gatewayConfigs.id, current.id));
    return { ...current, ...input };
  }
  const result = await db.insert(gatewayConfigs).values(input);
  return { ...input, id: Number(result[0].insertId) };
}

export async function getSecurityRules() {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(securityRules).orderBy(desc(securityRules.id)).limit(1);
  return rows[0];
}

export async function saveSecurityRules(input: typeof securityRules.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await getSecurityRules();
  if (current) {
    await db.update(securityRules).set({ ...input, updatedAt: new Date() }).where(eq(securityRules.id, current.id));
    return { ...current, ...input };
  }
  const result = await db.insert(securityRules).values(input);
  return { ...input, id: Number(result[0].insertId) };
}

export async function getLatestMetrics(limit = 30) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gatewayMetrics).orderBy(desc(gatewayMetrics.recordedAt)).limit(limit);
}

export async function getRecentLogs(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(gatewayLogs).orderBy(desc(gatewayLogs.createdAt)).limit(limit);
}

export async function appendGatewayLog(input: typeof gatewayLogs.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(gatewayLogs).values(input);
}

export async function getAlertThresholds() {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(alertThresholds).orderBy(desc(alertThresholds.id)).limit(1);
  return rows[0];
}

export async function saveAlertThresholds(input: typeof alertThresholds.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await getAlertThresholds();
  if (current) {
    await db.update(alertThresholds).set({ ...input, updatedAt: new Date() }).where(eq(alertThresholds.id, current.id));
    return { ...current, ...input };
  }
  const result = await db.insert(alertThresholds).values(input);
  return { ...input, id: Number(result[0].insertId) };
}

export async function getWebhookDeliveries(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(webhookDeliveries).orderBy(desc(webhookDeliveries.receivedAt)).limit(limit);
}

export async function getWebhookDelivery(updateId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(webhookDeliveries).where(eq(webhookDeliveries.updateId, updateId)).limit(1);
  return rows[0];
}

export async function hasRecentLog(message: string) {
  const db = await getDb();
  if (!db) return false;
  const rows = await db.select({ id: gatewayLogs.id }).from(gatewayLogs).where(and(eq(gatewayLogs.message, message), gt(gatewayLogs.createdAt, new Date(Date.now() - 60_000)))).limit(1);
  return rows.length > 0;
}
