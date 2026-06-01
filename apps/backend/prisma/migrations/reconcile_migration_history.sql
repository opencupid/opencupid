-- Migration history reconciliation script
--
-- Run this script on existing installations before running `prisma migrate deploy`.
-- It replaces all accumulated migration history entries with the two consolidated
-- migrations whose effects existing installations have already applied:
--   1. 20250704205603_init                     — full schema from current schema.prisma
--   2. 20260415000000_add_search_trgm_indexes  — pg_trgm extension + GIN index on LocalizedProfileField
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
  '26ff652904dee161b516caedeae816d8d399bf5b4fdbb1e3b2fe02b3f2c93a4b',
  now(),
  '20250704205603_init',
  NULL,
  NULL,
  now(),
  1
);

-- Record the trigram-index migration as already applied
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
  '80dcbbdefa4323dcdf49095912b059d598439e34a3b9e87ca08505af41f09f49',
  now(),
  '20260415000000_add_search_trgm_indexes',
  NULL,
  NULL,
  now(),
  1
);

COMMIT;
