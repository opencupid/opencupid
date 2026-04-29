---
'@opencupid/frontend': minor
---

Add Umami analytics tracker, gated on UMAMI_URL and UMAMI_WEBSITE_ID env vars. Loaded from main.ts after mount, mirroring the OpenReplay setup; no script tag is emitted when either var is empty.
