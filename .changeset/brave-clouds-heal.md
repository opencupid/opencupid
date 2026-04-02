---
'@opencupid/frontend': patch
'@opencupid/backend': patch
---

Fix infinite image upload retry loop caused by ERR_BAD_RESPONSE being treated as a network error, and tolerate minor JPEG spec violations in Sharp image processing
