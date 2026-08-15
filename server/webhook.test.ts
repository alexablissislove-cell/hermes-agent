import { describe, expect, it } from "vitest";
import { updateIdFrom } from "./webhook";

describe("Telegram webhook update validation", () => {
  it("accepts a non-negative integer update_id", () => {
    expect(updateIdFrom({ update_id: 42 })).toBe(42);
  });

  it("rejects missing, negative, fractional, and non-numeric update ids", () => {
    expect(updateIdFrom({})).toBeUndefined();
    expect(updateIdFrom({ update_id: -1 })).toBeUndefined();
    expect(updateIdFrom({ update_id: 1.5 })).toBeUndefined();
    expect(updateIdFrom({ update_id: "42" })).toBeUndefined();
    expect(updateIdFrom(null)).toBeUndefined();
  });
});
