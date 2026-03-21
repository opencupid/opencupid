---
'@opencupid/frontend': patch
---

Gate DevAutoLogin component on DEV_AUTH_BYPASS_ENABLED runtime flag to prevent 404s when the backend bypass endpoint is not enabled
