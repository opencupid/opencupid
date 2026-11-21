---
'@opencupid/frontend': minor
'@opencupid/backend': minor
---

Email link scanners that prefetch the magic link no longer spend the one-time token. Login is now `POST /auth/verify-token` (the GET route is removed). The magic-link page logs in straight away in the browser that requested the link, and anywhere else asks the user to click Continue first.
