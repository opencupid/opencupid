-- Backfill phone-only accounts with synthetic placeholder emails before tightening
-- the constraint. Format: <userId>@phone.migrated.local — easy to query later.
UPDATE "User"
SET email = id || '@phone.migrated.local'
WHERE email IS NULL;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" SET NOT NULL;
