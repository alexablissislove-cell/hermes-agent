const markdownV2Specials = /([_\*\[\]\(\)~`>#+\-=|{}.!])/g;

export function escapeTelegramMarkdownV2(text: string) {
  return text.replace(/\\/g, "\\\\").replace(markdownV2Specials, "\\$1");
}

export function escapeTelegramHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function formatTelegramText(text: string, parseMode: "plain" | "markdown" | "html") {
  if (parseMode === "markdown") return escapeTelegramMarkdownV2(text);
  if (parseMode === "html") return escapeTelegramHtml(text);
  return text;
}
