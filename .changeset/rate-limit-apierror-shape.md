---
'@opencupid/backend': patch
---

Return ApiError-shaped body for 429 rate-limit responses so frontend handlers that narrow on `success === false` recognize them correctly (#1362)
