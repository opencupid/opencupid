---
'@opencupid/backend': patch
---

Stamp `__o` cookie in the `/refresh` handler so users with pre-existing active sessions get their home-brand marker backfilled without having to log out and back in (#1340).
