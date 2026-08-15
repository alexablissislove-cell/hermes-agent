import { beforeAll, describe, expect, it, vi } from "vitest";

const rows = [{ id: 7, updateId: 9001, status: "accepted", payload: { update_id: 9001 } }];
const dbMock = {
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      orderBy: vi.fn(() => ({ limit: vi.fn().mockResolvedValue(rows) })),
      where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue(rows) })),
    })),
  })),
};

vi.mock("drizzle-orm/mysql2", () => ({ drizzle: vi.fn(() => dbMock) }));

describe("webhook delivery inspection helpers", () => {
  let getWebhookDeliveries: typeof import("./db").getWebhookDeliveries;
  let getWebhookDelivery: typeof import("./db").getWebhookDelivery;

  beforeAll(async () => {
    process.env.DATABASE_URL = "mysql://test";
    const db = await import("./db");
    getWebhookDeliveries = db.getWebhookDeliveries;
    getWebhookDelivery = db.getWebhookDelivery;
  });

  it("returns recent persisted webhook deliveries", async () => {
    await expect(getWebhookDeliveries(10)).resolves.toEqual(rows);
  });

  it("returns a persisted delivery by update id", async () => {
    await expect(getWebhookDelivery(9001)).resolves.toEqual(rows[0]);
  });
});
