---
'@opencupid/frontend': minor
'@opencupid/backend': minor
---

Refactor push notifications: extract utility to lib/utils, move subscription logic to dedicated Pinia store, derive checkbox state from browser permissions, add DELETE /push/subscription endpoint with rate limiting, auto-cleanup stale 410 subscriptions (#push-refactor)
