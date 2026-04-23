---
'@opencupid/backend': patch
---

Re-register the rate-limiter plugin so per-route `rateLimitConfig(...)` options are enforced again. The registration was accidentally dropped in PR #287 (Map view, 2025-09-01), which left every rate-limited route silently unlimited.
