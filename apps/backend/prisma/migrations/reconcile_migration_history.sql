-- Migration history reconciliation script
--
-- Run this ONCE on existing installations BEFORE `prisma migrate deploy`, after
-- the pg_trgm GIN indexes were consolidated into the init migration (PR:
-- "declare pg_trgm GIN indexes in schema.prisma").
--
-- What changed on disk:
--   * 20250704205603_init                — now also creates pg_trgm + both GIN
--                                          trigram indexes (moved here from the
--                                          two migrations below)
--   * 20260415000000_add_custom_indexes  — trimmed to the two partial indexes
--                                          only (WHERE-clause; not expressible
--                                          in Prisma schema syntax)
--   * 20260601000000_add_usercontent_trgm_index — DELETED (its lone index now
--                                          lives in init)
--   * 20260910183019_add_usercontent_tags — comment trimmed: the note explaining
--                                          which DROP INDEX lines to strip is
--                                          obsolete now that the indexes are
--                                          declared in schema.prisma
--
-- Existing databases already contain every one of these indexes, so their
-- schema is unchanged. This script only reconciles the _prisma_migrations
-- bookkeeping: it sets the recorded checksums of the two edited migrations to
-- match their new file contents and removes the row for the deleted migration.
-- The next `prisma migrate deploy` then accepts init + add_custom_indexes as
-- already-applied and applies only genuinely new migrations.
--
-- Idempotent: safe to re-run, and a no-op on rows that are already correct.
-- New databases never need it — they build the consolidated history from empty.
--
-- Usage:
--   psql $DATABASE_URL -f reconcile_migration_history.sql

BEGIN;

UPDATE "_prisma_migrations"
   SET checksum = '404242cec5f761cdc37d79f7b7ad5036fbd64d376b6d1aae228055cc761365cc'
 WHERE migration_name = '20250704205603_init';

UPDATE "_prisma_migrations"
   SET checksum = '4ba9d579dac23367936af7f3646b5512edb2450503ab86450dc009bb8f0993d9'
 WHERE migration_name = '20260415000000_add_custom_indexes';

UPDATE "_prisma_migrations"
   SET checksum = 'b2775337cb2c00b5feb0881b88f13d2809959548cb79944bebeb66e2176d6668'
 WHERE migration_name = '20260910183019_add_usercontent_tags';

DELETE FROM "_prisma_migrations"
 WHERE migration_name = '20260601000000_add_usercontent_trgm_index';

COMMIT;
