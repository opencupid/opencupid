---
'@opencupid/backend': patch
---

Keep the session cookie as long as the refresh token, so users idle for more than 30 days can be refreshed instead of logging in again (#1723)
