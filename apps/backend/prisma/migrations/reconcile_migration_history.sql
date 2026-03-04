-- Migration history reconciliation script
--
-- Run this script on existing installations before running `prisma migrate deploy`.
-- It replaces all accumulated migration history entries with the single consolidated
-- init migration introduced as part of the pre-release cleanup.
--
-- Usage:
--   psql $DATABASE_URL -f reconcile_migration_history.sql

-- Remove all previously recorded migration entries
DELETE FROM "_prisma_migrations";

-- Record the new consolidated init migration as already applied
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
  '50f40c86f4764b40046d6a22cc4eb42d1efb9e07345bc42c7940a5088deb6081',
  now(),
  '20250704205603_init',
  NULL,
  NULL,
  now(),
  1
);
