---
'@opencupid/backend': patch
---

Collapse Prisma migrations into the initial `_init` migration plus a single `add_search_trgm_indexes` migration. No runtime behaviour change; existing installations must run `prisma/migrations/reconcile_migration_history.sql` once before the next `prisma migrate deploy` (#1457).
