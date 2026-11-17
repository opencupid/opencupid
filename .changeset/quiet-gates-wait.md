---
'@opencupid/frontend': minor
'@opencupid/backend': minor
---

Magic-link page asks the user to click Continue before logging in, so email link scanners that prefetch the link no longer spend the one-time token. `GET /auth/verify-token` now returns an empty 200; login is `POST /auth/verify-token`.
