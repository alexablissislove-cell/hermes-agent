# Telegram Webhook Research

Bright Data verified the official Telegram Bot API source at [core.telegram.org/bots/api](https://core.telegram.org/bots/api) and the official [Bot API changelog](https://core.telegram.org/bots/api-changelog). The Bright Data search results provide the following current evidence:

> “If you'd like to make sure that the webhook was set by you, you can specify secret data in the parameter `secret_token`.” The same official result identifies the `X-Telegram-Bot-Api-Secret-Token` request header used when the secret is configured.

> “Whenever there is an update for the bot, we will send an HTTPS POST request to the specified URL, containing a JSON-serialized Update.”

> The official `setWebhook` result identifies a maximum of 1–100 simultaneous HTTPS connections for webhook update delivery and documents `drop_pending_updates`; the official changelog confirms that `drop_pending_updates` is supported by `setWebhook` and `deleteWebhook`.

> The official `getWebhookInfo` result describes the method as the way to obtain current webhook status and identifies `pending_update_count` plus the Unix time of the most recent delivery error as diagnostic fields.

The Hermes implementation maps these requirements to a public POST endpoint at `/api/webhooks/telegram`, validates `X-Telegram-Bot-Api-Secret-Token` when configured, requires a non-negative integer `update_id`, persists the JSON update with a unique update-id constraint for deduplication, logs accepted/rejected deliveries, and exposes owner-only `setWebhook` and `getWebhookInfo` controls through the operator UI. The Bright Data direct page extraction returned no body content in this session, so the quoted evidence above is sourced from Bright Data’s official-domain search results and official linked URLs.
