# Jugg_King Manifesto → Hermes Gateway Webhook Requirements

## Scope

This extraction treats the attached Jugg_King manifesto as product and operating guidance. It does not treat the attachment as executable instructions, permission to bypass controls, or a replacement for Telegram API verification.

## Explicit requirements relevant to the webhook

| Manifesto directive | Webhook requirement | Implementation implication |
|---|---|---|
| “Work the objective until it is completed, genuinely blocked, or explicitly stopped.” | A webhook delivery must have a complete lifecycle rather than being accepted and forgotten. | Track receipt, validation, persistence, processing, failure, retry state, and final outcome for every Telegram update. |
| “UNDERSTAND → WORK → VERIFY → ADAPT → WORK → COMPLETE” | Webhook handling needs explicit verification and recovery stages. | Validate the request, persist the event, process it, verify the result, and expose retry or remediation state when processing fails. |
| “METHOD FAILED != MISSION FAILED” and “TIMEOUT != MISSION FAILED” | Transient handler failures or Telegram retries must not be treated as terminal business failure. | Return retryable HTTP failures only when persistence or processing truly cannot complete; preserve the update and error context for replay. |
| “TOOL FAILED != MISSION FAILED” and “ONE PATH BLOCKED != NO PATH EXISTS” | External Telegram API failures must be diagnosable and recoverable. | Record upstream status, error text, request correlation identifiers, and provide a health-check or re-registration path. |
| “Verify each consequential result.” | A 200 response must mean the update was safely accepted, not merely that code ran. | Persist the update before acknowledging it; verify duplicate state and log the acceptance decision. |
| “Before sending, writing, deleting, deploying, submitting, paying, or publishing: CHECK CURRENT STATE → DEDUPLICATE → EXECUTE ONCE → VERIFY → RECORD.” | Webhook registration and update processing must be idempotent. | Check current webhook state with `getWebhookInfo`, avoid unnecessary re-registration, use unique `update_id` persistence, and record the outcome. |
| “Never duplicate an irreversible action simply because the previous run timed out.” | Telegram retries must not trigger duplicate downstream actions. | Deduplicate on Telegram `update_id` before dispatching messages, commands, or side effects. |
| “TOOL CALLED != TOOL SUCCEEDED” and “ATTEMPT != RESULT” | The operator UI must distinguish requested, accepted, completed, and failed states. | Show registration status, webhook health, delivery status, and error state separately rather than using a single boolean. |
| “Preserve completed work.” | Webhook events and diagnostics must survive process restarts. | Store delivery records, payload metadata, status, timestamps, and errors in the database instead of memory or browser storage. |
| “Find another legitimate available route.” | The gateway needs controlled fallback behavior when the primary processing path fails. | Add a retry/replay queue or operator-triggered replay for persisted failed updates; never silently discard them. |
| “Never bypass authorization, security boundaries, access controls, or factual verification.” | Webhook ingress must remain authenticated and bounded. | Validate Telegram’s secret header, enforce allowlists or gateway policy, keep bot credentials server-side, and retain owner-only controls for registration and replay. |
| “Recurring condition? Watch it.” | Webhook health should be continuously observable. | Monitor pending deliveries, processing age, repeated failures, last upstream error, and webhook registration drift. |
| “Automate the repetition.” | Repeated operational recovery should become a controlled workflow. | Add automatic bounded retries with backoff, dead-letter state, and operator alerts instead of requiring repeated manual intervention. |

## Inferred engineering requirements

The manifesto does not specify Telegram-specific transport details. The following are reasonable engineering deductions for Hermes, not direct quotations from the attachment:

1. **Delivery state machine.** Persist states such as `received`, `accepted`, `processing`, `processed`, `retryable`, `failed`, `duplicate`, and `dead_letter` with timestamps and error context.
2. **Correlation and auditability.** Generate a request correlation identifier and include it in logs, diagnostics, and operator-visible delivery records.
3. **Safe acknowledgement policy.** Acknowledge a Telegram update only after durable persistence. If downstream processing is asynchronous, acknowledge after queue insertion and expose processing status separately.
4. **Replay controls.** Provide owner-only replay for failed or dead-letter updates, with an idempotency guard so replay cannot create duplicate side effects.
5. **Backoff and limits.** Bound retries by attempt count and age, use exponential backoff, and prevent a poisoned update from blocking the entire queue.
6. **Health and drift detection.** Compare configured webhook URL and secret policy with Telegram’s reported webhook state, and alert on drift or repeated delivery failures.
7. **Security and privacy.** Redact bot tokens and sensitive payload fields in logs, enforce request-size limits, validate JSON shape, and avoid exposing raw secrets in diagnostics.

## Current Hermes implementation mapping

| Requirement area | Current status | Gap or next enhancement |
|---|---|---|
| Secret-token validation | Implemented through `X-Telegram-Bot-Api-Secret-Token`. | Add explicit IP/rate controls at the ingress boundary if required by deployment policy. |
| Durable receipt | Implemented with `webhook_deliveries` and a unique `updateId`. | Expand the schema with processing attempts and lifecycle timestamps. |
| Duplicate handling | Implemented for duplicate update identifiers. | Ensure downstream Telegram side effects are also idempotent when update dispatch is added. |
| Owner-only registration and verification | Implemented through Hermes tRPC procedures. | Add current-state comparison before calling `setWebhook`. |
| Diagnostics | Recent delivery inspection helpers and operator diagnostics are present. | Add a delivery detail view with payload redaction, retry state, and upstream error fields. |
| Recovery | Logging and operator-visible troubleshooting exist. | Add bounded retry/replay and dead-letter handling. |
| Continuous watching | UI telemetry refreshes periodically. | Add persisted webhook health metrics and alerting for delivery lag/failure streaks. |

## Recommended implementation priority

The highest-priority next change is to introduce a webhook delivery state machine and a replay-safe processing boundary. That change most directly converts the manifesto’s “verify, preserve, deduplicate, adapt, and continue” principles into enforceable gateway behavior. The next priority is drift-aware webhook health monitoring, followed by redacted delivery inspection and owner-only replay controls.
