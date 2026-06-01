---
'@opencupid/backend': patch
---

Collapse Prisma migrations into the initial `_init` migration plus the `add_search_trgm_indexes` migration, and add a follow-up `add_usercontent_trgm_index` migration that restores the trgm index on `UserContent.content` (lost when the `Post` table was replaced). Existing installations must run `prisma/migrations/reconcile_migration_history.sql` once before the next `prisma migrate deploy`; the deploy then only applies the new UserContent trgm index. No runtime behaviour change (#1457).
