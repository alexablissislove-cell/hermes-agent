import { describe, expect, it } from "vitest";
import { isDuplicateUpdate, lifecycleAfterAttempt, webhookHealthSummary, webhookPayloadMetadata } from "./webhook";

describe("webhook lifecycle helpers", () => {
  it("moves successful attempts to processed and exhausted attempts to dead-letter", () => {
    expect(lifecycleAfterAttempt(true, 1, 5)).toBe("processed");
    expect(lifecycleAfterAttempt(false, 2, 5)).toBe("retryable");
    expect(lifecycleAfterAttempt(false, 5, 5)).toBe("dead_letter");
  });

  it("keeps replay decisions idempotent and exposes only payload metadata", () => {
    expect(isDuplicateUpdate([10, 11], 11)).toBe(true);
    expect(isDuplicateUpdate([10, 11], 12)).toBe(false);
    expect(webhookPayloadMetadata({ update_id: 12, message: { text: "private" } })).toEqual({ payloadKeys: ["update_id", "message"], payloadSize: 45 });
  });

  it("summarizes webhook drift, pending updates, and last errors", () => {
    expect(webhookHealthSummary({ url: "https://example.test/hook", pending_update_count: 2, last_error_message: "timeout" }, "https://example.test/hook")).toEqual({ urlMatches: true, pendingUpdates: 2, hasLastError: true });
  });
});
