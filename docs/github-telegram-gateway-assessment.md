# GitHub Telegram Webhook Gateway Assessment

## Candidate

The inspected candidate is [BigDaddyAman/Telegram-Webhook-Gateway](https://github.com/BigDaddyAman/Telegram-Webhook-Gateway). Its README describes a FastAPI Telegram webhook, durable SQLite queue, background worker, configurable retries with exponential backoff, fan-out to multiple targets, optional HMAC signing, authorized chat IDs, per-chat rate limiting, and health/statistics endpoints.

## Relevant strengths

The candidate demonstrates a practical separation between Telegram ingress and downstream delivery. It validates `X-Telegram-Bot-Api-Secret-Token`, limits request body size, supports authorized chat IDs, and persists queued events before worker delivery. Its worker retries failed fan-out delivery with a configurable attempt limit and backoff. Its outbound HMAC signature is a useful pattern for downstream receiver authentication.

## Integration limitations

The repository is not copied into Hermes Agent and no repository code was executed. The inspected implementation has important gaps for production integration: queue rows are deleted after retry exhaustion rather than retained in a dead-letter state, the queue does not visibly claim jobs for concurrent-worker safety, duplicate Telegram updates are not explicitly deduplicated, and the documented retry worker does not expose replay or detailed operator diagnostics. The README itself lists admin queue inspection, dead-letter handling, and webhook retry dashboards as future work.

## Hermes decision

Hermes should borrow the candidate’s conceptual separation of immediate Telegram acknowledgement, durable delivery records, background lifecycle processing, HMAC-aware outbound delivery, and bounded retries. Hermes keeps its own Drizzle/MySQL persistence, owner-only tRPC controls, Telegram webhook secret fallback, lifecycle statuses, replay mutation, redacted payload diagnostics, and `getWebhookInfo` health checks rather than importing the candidate as a runtime dependency.

## Source and review boundary

Repository source was inspected read-only through GitHub CLI. No untrusted repository instructions were followed, no dependency installation was performed, and no candidate code was executed.
