import { describe, expect, it } from "vitest";
import { escapeTelegramHtml, escapeTelegramMarkdownV2, formatTelegramText } from "./telegramFormatting";

describe("Telegram formatting", () => {
  it("escapes MarkdownV2 special characters", () => {
    expect(escapeTelegramMarkdownV2("price: $5.00 (now)! [sale]")).toBe("price: $5\\.00 \\(now\\)\\! \\[sale\\]");
  });

  it("escapes HTML entities", () => {
    expect(escapeTelegramHtml("<b>& value</b>")).toBe("&lt;b&gt;&amp; value&lt;/b&gt;");
  });

  it("leaves plain text unchanged", () => {
    expect(formatTelegramText("hello *world*", "plain")).toBe("hello *world*");
  });
});
