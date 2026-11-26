-- One-off data migration for 20261126123501_add_email_preference.
--
-- Copies the old opt-in flags into EmailPreference. Run AFTER
-- `prisma migrate deploy` and right after the new backend is up:
--
--   npx prisma migrate deploy
--   # deploy the backend
--   psql "$DATABASE_URL" -f apps/backend/prisma/data-migrations/20261126123501_add_email_preference.sql
--
-- Until it runs, existing users have no rows and receive no suppressible
-- email (a missing row means "not granted"). Users created by the new backend
-- already have rows, and choices made since the deploy (settings, unsubscribe
-- links) win: ON CONFLICT DO NOTHING keeps every existing row, so the script is
-- safe to re-run. The old columns and NearbySignupOptOut are dropped in a later
-- schema migration.
--
-- Mapping:
--   notifications = User.emailNotificationsOptIn
--   reminders     = User.emailNotificationsOptIn AND no NearbySignupOptOut row
--                   (the old flag also suppressed the nearby digest)
--   newsletter    = false for everyone: newsletterOptIn defaulted to true and
--                   was never asked for, so no stored value is valid consent.

\set ON_ERROR_STOP on
BEGIN;

INSERT INTO "EmailPreference" ("userId", "scope", "granted", "source", "updatedAt")
SELECT u."id", 'notifications', u."emailNotificationsOptIn", 'data_migration', NOW()
FROM "User" u
ON CONFLICT ("userId", "scope") DO NOTHING;

INSERT INTO "EmailPreference" ("userId", "scope", "granted", "source", "updatedAt")
SELECT u."id",
       'reminders',
       u."emailNotificationsOptIn" AND o."profileId" IS NULL,
       'data_migration',
       NOW()
FROM "User" u
LEFT JOIN "Profile" p ON p."userId" = u."id"
LEFT JOIN "NearbySignupOptOut" o ON o."profileId" = p."id"
ON CONFLICT ("userId", "scope") DO NOTHING;

INSERT INTO "EmailPreference" ("userId", "scope", "granted", "source", "updatedAt")
SELECT u."id", 'newsletter', false, 'data_migration', NOW()
FROM "User" u
ON CONFLICT ("userId", "scope") DO NOTHING;

COMMIT;
