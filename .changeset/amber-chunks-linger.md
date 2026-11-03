---
'@opencupid/frontend': patch
---

Keep the content-hashed bundle files of the last 10 releases under `/assets/build/` on a persistent volume, so browser tabs opened before a deploy can still lazy-load their route chunks instead of failing with "Importing a module script failed". Production compose files should mount a named volume per frontend service at `/var/www/assets/build`.
