import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json, double } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const gatewayConfigs = mysqlTable("gateway_configs", {
  id: int("id").autoincrement().primaryKey(),
  botToken: text("botToken"),
  webhookUrl: text("webhookUrl"),
  allowedChatIds: json("allowedChatIds").$type<string[]>().notNull(),
  rateLimitPerMinute: int("rateLimitPerMinute").notNull().default(30),
  maxConnections: int("maxConnections").notNull().default(100),
  requestTimeoutMs: int("requestTimeoutMs").notNull().default(10000),
  webhookSecret: varchar("webhookSecret", { length: 128 }),
  enabled: boolean("enabled").notNull().default(false),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const securityRules = mysqlTable("security_rules", {
  id: int("id").autoincrement().primaryKey(),
  apiKeys: json("apiKeys").$type<string[]>().notNull(),
  ipAllowlist: json("ipAllowlist").$type<string[]>().notNull(),
  accessControlRules: json("accessControlRules").$type<Array<{ subject: string; permission: string; enabled: boolean }>>().notNull(),
  lastTokenRotationAt: timestamp("lastTokenRotationAt"),
  requireSignedWebhooks: boolean("requireSignedWebhooks").notNull().default(true),
  updatedBy: int("updatedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const gatewayMetrics = mysqlTable("gateway_metrics", {
  id: int("id").autoincrement().primaryKey(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  uptimeSeconds: int("uptimeSeconds").notNull().default(0),
  messagesPerSecond: double("messagesPerSecond").notNull().default(0),
  activeConnections: int("activeConnections").notNull().default(0),
  latencyMs: double("latencyMs").notNull().default(0),
  errorRate: double("errorRate").notNull().default(0),
  errorCount: int("errorCount").notNull().default(0),
});

export const gatewayLogs = mysqlTable("gateway_logs", {
  id: int("id").autoincrement().primaryKey(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  level: mysqlEnum("level", ["info", "warn", "error", "debug"]).notNull().default("info"),
  message: text("message").notNull(),
  context: json("context").$type<Record<string, unknown> | null>(),
});

export const alertThresholds = mysqlTable("alert_thresholds", {
  id: int("id").autoincrement().primaryKey(),
  latencyMs: double("latencyMs").notNull().default(800),
  errorRate: double("errorRate").notNull().default(0.05),
  messagesPerSecond: double("messagesPerSecond").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  updatedBy: int("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const webhookDeliveries = mysqlTable("webhook_deliveries", {
  id: int("id").autoincrement().primaryKey(),
  updateId: int("updateId").notNull().unique(),
  receivedAt: timestamp("receivedAt").defaultNow().notNull(),
  status: mysqlEnum("status", ["received", "accepted", "processing", "processed", "retryable", "duplicate", "rejected", "failed", "dead_letter"]).notNull(),
  attemptCount: int("attemptCount").notNull().default(0),
  lastAttemptAt: timestamp("lastAttemptAt"),
  processingStartedAt: timestamp("processingStartedAt"),
  processedAt: timestamp("processedAt"),
  nextAttemptAt: timestamp("nextAttemptAt"),
  payload: json("payload").$type<Record<string, unknown>>().notNull(),
  errorMessage: text("errorMessage"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type GatewayConfig = typeof gatewayConfigs.$inferSelect;
export type SecurityRule = typeof securityRules.$inferSelect;
export type GatewayMetric = typeof gatewayMetrics.$inferSelect;
export type GatewayLog = typeof gatewayLogs.$inferSelect;
export type AlertThreshold = typeof alertThresholds.$inferSelect;
