# Bright Data Fallback Research

Bright Data search results identified the following official documentation:

- Proxy errors troubleshooting: https://docs.brightdata.com/proxy-networks/errorCatalog — the result states that dynamically adjusted limits can lift faster when failed requests are retried and success rates recover.
- Browser API error codes: https://docs.brightdata.com/scraping-automation/scraping-browser/error-codes — the result identifies proxy connection timeouts and recommends retrying after some time.
- Proxy configuration options: https://docs.brightdata.com/proxy-networks/config-options — the result states that username parameters control country targeting, IP rotation, session handling, DNS resolution, and routing behavior.
- Residential FAQ: https://docs.brightdata.com/proxy-networks/residential/faqs — the result notes that a session IP can remain persistent for up to five minutes of idle time; longer-lived sessions need an appropriate keep-alive strategy.

Configuration implications: classify proxy connection timeouts as retryable with bounded exponential backoff and jitter; honor an upstream `Retry-After` value when provided; use a circuit breaker to avoid hammering a degraded route; rotate or renew the Bright Data session after repeated failures; preserve the original error and route decision in logs; and never mark a request successful without a verified upstream response.
