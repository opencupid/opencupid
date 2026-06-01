---
'@opencupid/backend': patch
---

Collapse Prisma migrations into the initial `_init` migration plus `add_custom_indexes` (pg_trgm + partial indexes that aren't expressible in Prisma schema syntax), and add a follow-up `add_usercontent_trgm_index` migration that restores the trgm index on `UserContent.content` (lost when the `Post` table was replaced). Existing installations must run `prisma/migrations/reconcile_migration_history.sql` once before the next `prisma migrate deploy`; the deploy then only applies the new UserContent trgm index. No runtime behaviour change (#1457).
