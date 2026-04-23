---
'@opencupid/backend': patch
---

Fix rate limiting on API routes:

- Re-register the `./plugins/rate-limiter` plugin so per-route `rateLimitConfig(...)` options are enforced again. The registration was dropped in PR #287 (Map view, 2025-09-01), which left every rate-limited route silently unlimited.
- Return `ApiError`-shaped 429 responses (`{ success: false, message }`) so frontend handlers that narrow on `success === false` recognise them correctly.
