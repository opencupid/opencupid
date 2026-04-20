---
'@opencupid/frontend': patch
---

Tag frontend Sentry events with `frontend_origin` set to `__APP_CONFIG__.DOMAIN`, so dashboards/alerts are brand-attributable without URL parsing.
