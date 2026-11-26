-- One-off data migration for 20261126123501_add_email_preference (#1727) and
-- 20261126150000_drop_legacy_email_opt_ins (#1728).
--
-- Run BEFORE `prisma migrate deploy` on any database that has users
-- (production, dev), with the backend and worker stopped:
--
--   psql "$DATABASE_URL" -f apps/backend/prisma/data-migrations/20261126150000_email_preference.sql
--   npx prisma migrate deploy        # reports both migrations as already applied
--
-- Empty databases skip this file; `prisma migrate deploy` applies the schema
-- migrations directly.
--
-- In one transaction this puts the database into the post-migration shape: it
-- creates EmailPreference, copies the legacy opt-in flags into it, drops the
-- legacy columns and NearbySignupOptOut, and records both Prisma migrations as
-- applied. Any error rolls everything back. Running the two migrations through
-- `migrate deploy` instead would drop the legacy data before it is copied.
--
-- Mapping, one row per user and scope:
--   notifications = User.emailNotificationsOptIn
--   reminders     = User.emailNotificationsOptIn AND no NearbySignupOptOut row
--                   (the old flag also suppressed the nearby digest)
--   newsletter    = false for everyone: newsletterOptIn defaulted to true and
--                   was never asked for, so no stored value is valid consent.

\set ON_ERROR_STOP on
BEGIN;

-- 1) New enums and table (same DDL as 20261126123501_add_email_preference)
CREATE TYPE "EmailScope" AS ENUM ('notifications', 'reminders', 'newsletter');
CREATE TYPE "EmailPreferenceSource" AS ENUM ('default', 'settings', 'unsubscribe_link', 'data_migration');

CREATE TABLE "EmailPreference" (
    "userId" TEXT NOT NULL,
    "scope" "EmailScope" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" "EmailPreferenceSource" NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailPreference_pkey" PRIMARY KEY ("userId","scope")
);

CREATE INDEX "EmailPreference_scope_granted_idx" ON "EmailPreference"("scope", "granted");

ALTER TABLE "EmailPreference" ADD CONSTRAINT "EmailPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) Copy the legacy flags
INSERT INTO "EmailPreference" ("userId", "scope", "granted", "source", "updatedAt")
SELECT u."id", 'notifications', u."emailNotificationsOptIn", 'data_migration', NOW()
FROM "User" u;

INSERT INTO "EmailPreference" ("userId", "scope", "granted", "source", "updatedAt")
SELECT u."id",
       'reminders',
       u."emailNotificationsOptIn" AND NOT EXISTS (
         SELECT 1 FROM "Profile" p
         JOIN "NearbySignupOptOut" o ON o."profileId" = p."id"
         WHERE p."userId" = u."id"
       ),
       'data_migration',
       NOW()
FROM "User" u;

INSERT INTO "EmailPreference" ("userId", "scope", "granted", "source", "updatedAt")
SELECT u."id", 'newsletter', false, 'data_migration', NOW()
FROM "User" u;

-- 3) Drop the legacy structure (same DDL as 20261126150000_drop_legacy_email_opt_ins)
ALTER TABLE "NearbySignupOptOut" DROP CONSTRAINT "NearbySignupOptOut_profileId_fkey";

ALTER TABLE "User" DROP COLUMN "emailNotificationsOptIn",
DROP COLUMN "newsletterOptIn";

DROP TABLE "NearbySignupOptOut";

-- 4) Migration reconciliation
--
-- The steps above put the database directly into the post-migration shape, so
-- the Prisma migrations would fail if `prisma migrate deploy` tried to run
-- their SQL afterwards. Record them as applied so deploy treats them as no-ops.
-- Each checksum must match the SHA-256 of its migration file; verify with:
--   sha256sum apps/backend/prisma/migrations/20261126123501_add_email_preference/migration.sql \
--             apps/backend/prisma/migrations/20261126150000_drop_legacy_email_opt_ins/migration.sql

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
  'd0542fa2d329ac354eca16d8bf6fe2546b33e145ffd233b54af7d927ce54c9d3',
  now(),
  '20261126123501_add_email_preference',
  NULL,
  NULL,
  now(),
  1
), (
  gen_random_uuid()::text,
  '214c3c92a8cfc3030680c6475e9513e453014a886d96f2cf578e5123468d05a3',
  now(),
  '20261126150000_drop_legacy_email_opt_ins',
  NULL,
  NULL,
  now(),
  1
);

COMMIT;
