---
'@opencupid/frontend': patch
---

Fix redirect to /onboarding being skipped after fresh registration due to two races: fire-and-forget auth:login event and KeepAlive skipping onMounted
