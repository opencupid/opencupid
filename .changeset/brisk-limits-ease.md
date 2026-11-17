---
'@opencupid/backend': patch
---

Relax the rate limit on `/auth/send-magic-link` and `/auth/verify-token` from 5 requests per 15 minutes to 5 per 3 minutes, and return `code: AUTH_RATE_LIMITED` in their 429 responses
