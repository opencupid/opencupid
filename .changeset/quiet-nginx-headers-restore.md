---
'@opencupid/frontend': patch
---

Restore CSP and other security headers on SPA-served paths. nginx's per-location `add_header` was suppressing the server-level stack on every HTML response.
