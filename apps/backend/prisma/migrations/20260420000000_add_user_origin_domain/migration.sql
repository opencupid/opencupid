-- Add User.originDomain (required) with a three-step rollout so existing rows
-- don't violate the NOT NULL constraint during deploy.
--
-- Backfill is driven by the `app.origin_domain` session variable, NOT a
-- hard-coded literal. Before running `prisma migrate deploy`, the deployer
-- must set it on the target database so the DO block below can read it:
--
--   psql "$DATABASE_URL" -c "ALTER DATABASE app SET app.origin_domain = '$DOMAIN'"
--
-- If the variable is unset or empty, the migration aborts before touching any
-- data — no accidental 'example.org' landing in production rows. Clean up
-- the setting after the migration:
--
--   psql "$DATABASE_URL" -c "ALTER DATABASE app RESET app.origin_domain"

ALTER TABLE "User" ADD COLUMN "originDomain" TEXT;

DO $$
DECLARE
  v_domain TEXT := current_setting('app.origin_domain', true);
BEGIN
  IF v_domain IS NULL OR v_domain = '' THEN
    RAISE EXCEPTION 'app.origin_domain session variable must be set before running this migration. See migration.sql header for the ALTER DATABASE command.';
  END IF;
  UPDATE "User" SET "originDomain" = v_domain WHERE "originDomain" IS NULL;
END
$$;

ALTER TABLE "User" ALTER COLUMN "originDomain" SET NOT NULL;
