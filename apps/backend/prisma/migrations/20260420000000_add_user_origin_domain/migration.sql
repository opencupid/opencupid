-- Add User.originDomain (required) with a three-step rollout so existing rows
-- don't violate the NOT NULL constraint during deploy.
--
-- Deploy note: before running `prisma migrate deploy` in a new environment,
-- substitute the UPDATE's default (currently 'example.org') with that
-- environment's actual DOMAIN env var. This one-shot backfill targets
-- pre-existing rows only; new users set originDomain = req.hostname at
-- registration time.

ALTER TABLE "User" ADD COLUMN "originDomain" TEXT;

UPDATE "User" SET "originDomain" = 'example.org' WHERE "originDomain" IS NULL;

ALTER TABLE "User" ALTER COLUMN "originDomain" SET NOT NULL;
