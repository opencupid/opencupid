---
'@opencupid/backend': patch
'@opencupid/frontend': patch
'@opencupid/shared': patch
---

Silent cookie migration to domain-scoped __session/__refresh cookies ahead of SPA subdomain split. Every authenticated response now sets the new domain-scoped cookie shape (driven by `appConfig.DOMAIN`) and emits a delete for the legacy host-only variant, so active users are migrated in-place without being logged out (#1351)
