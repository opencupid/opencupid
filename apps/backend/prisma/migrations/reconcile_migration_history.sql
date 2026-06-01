-- Migration history reconciliation script
--
-- Run this script on existing installations before running `prisma migrate deploy`.
-- It replaces all accumulated migration history entries with the two consolidated
-- migrations whose effects existing installations have already applied:
--   1. 20250704205603_init                — full schema from current schema.prisma
--   2. 20260415000000_add_custom_indexes  — pg_trgm + partial indexes that aren't
--                                           expressible in Prisma schema syntax
--
-- The on-disk database structure of existing installations already matches what
-- these two migrations produce, so after reconciliation the next
-- `prisma migrate deploy` only needs to apply genuinely new migrations
-- (e.g. 20260601000000_add_usercontent_trgm_index, which restores the trgm
-- index on UserContent.content that no existing installation has yet).
--
-- Usage:
--   psql $DATABASE_URL -f reconcile_migration_history.sql

BEGIN;

-- Remove all previously recorded migration entries
DELETE FROM "_prisma_migrations";

-- Record the consolidated init migration as already applied
INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
) VALUES (
  gen_random_uuid()::text,
  '96610de43666283e91d30759b5b03d62ea1b93148dcc358e5cde6aa9688358c3',
  now(),
  '20250704205603_init',
  NULL,
  NULL,
  now(),
  1
);

-- Record the custom-indexes migration as already applied
INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
) VALUES (
  gen_random_uuid()::text,
  'fb6567710ccbc30bed2ab87026eb6a0a6beb0c33fc1f12893cb09bff2d6666c2',
  now(),
  '20260415000000_add_custom_indexes',
  NULL,
  NULL,
  now(),
  1
);

COMMIT;
