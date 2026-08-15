import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { describeBrightDataConfig, getBrightDataProxyConfig, redactSecret } from "./credentials";

describe("Bright Data secret configuration", () => {
  it("has the required server-side proxy fields without exposing values", () => {
    const config = getBrightDataProxyConfig();
    expect(config, "Bright Data proxy credentials must be configured").not.toBeNull();
    expect(describeBrightDataConfig(config).configured).toBe(true);
    expect(redactSecret(config?.password)).not.toContain(config?.password ?? "__missing__");
  });

  it("can reach a lightweight API through the configured proxy with the supplied mapping", () => {
    const config = getBrightDataProxyConfig();
    expect(config).not.toBeNull();
    expect(process.env.BRIGHTDATA_COUNTRY).toBe("us");
    expect(process.env.BRIGHTDATA_TARGET_IP).toBe("176.100.143.130");
    if (!config) return;

    const proxy = `http://${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@${config.host}:${config.port}`;
    let result = "";
    try {
      result = execFileSync(
        "curl",
        ["--silent", "--show-error", "--fail", "--max-time", "10", "https://api.ipify.org?format=json"],
        {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
          env: { ...process.env, https_proxy: proxy, HTTPS_PROXY: proxy },
        },
      ).trim();
    } catch {
      throw new Error("Bright Data proxy smoke test failed without exposing credential details");
    }

    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain(config.password);
  }, 20_000);
});
