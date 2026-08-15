import { describe, expect, it } from "vitest";
import { verifyOpenAIConnection } from "./openai";

describe("OpenAI managed credential", () => {
  it("authenticates against the models endpoint with the current managed key without exposing it", async () => {
    const result = await verifyOpenAIConnection();
    expect(result.configured).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.modelCount).toBeGreaterThan(0);
  }, 20_000);
});
