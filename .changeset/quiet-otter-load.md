---
'@opencupid/frontend': patch
---

Replace Umami init polling with a load-event promise so identify/track calls before the script loads are queued reliably and silently dropped on script load failure rather than hanging.
