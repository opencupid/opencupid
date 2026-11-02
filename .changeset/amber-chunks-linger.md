---
'@opencupid/frontend': patch
---

Keep previous releases' hashed assets on a persistent volume and serve them as an nginx fallback, so browser tabs opened before a deploy can still lazy-load their route chunks instead of failing with "Importing a module script failed". Production deployments must set `FRONTEND_ASSET_ARCHIVE` to a persistent host directory.
