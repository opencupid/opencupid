---
'@opencupid/backend': patch
'@opencupid/frontend': patch
'@opencupid/shared': patch
---

Restore end-to-end rate limiting on API routes:

- Re-register the `./plugins/rate-limiter` plugin so per-route `rateLimitConfig(...)` options are enforced again. The registration was dropped in PR #287 (Map view, 2025-09-01), which left every rate-limited route silently unlimited.
- Return `ApiError`-shaped 429 responses (`{ success: false, message }`) so frontend handlers that narrow on `success === false` recognise them correctly.
- Route the 429 toast through the `bus` + `AppNotifier` pattern (new `api:rate_limit` event) instead of having the error-classification utility reach for `useToast` directly. The toast copy moves to the translated `uicomponents.error.rate_limit` key (en + hu), and a stable toast id collapses repeat 429s during a burst into a single on-screen notice.
