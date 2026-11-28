---
'@opencupid/backend': patch
---

Apply pending database migrations automatically on deploy via a Compose `pre_start` hook on the backend service; the worker now waits for the backend to start.
