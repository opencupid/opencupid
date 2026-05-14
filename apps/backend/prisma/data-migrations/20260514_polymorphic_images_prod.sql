-- Production migration for polymorphic images.
--
-- This file is NOT inside prisma/migrations/ and Prisma will not run it
-- automatically. The deployer runs it manually during the release window, in
-- a transaction. It preserves existing ProfileImage data, then writes a row
-- into _prisma_migrations so that `prisma migrate status` reports the
-- corresponding committed Prisma migration as already applied.
--
-- BEFORE RUNNING: replace <SHA256_OF_MIGRATION_SQL> below with the actual
-- checksum of:
--   apps/backend/prisma/migrations/20260514120000_polymorphic_images/migration.sql
-- Compute with: sha256sum migration.sql

BEGIN;

-- 1. Drop the old FK and index on profileId
ALTER TABLE "ProfileImage" DROP CONSTRAINT IF EXISTS "ProfileImage_profileId_fkey";
DROP INDEX IF EXISTS "ProfileImage_profileId_position_idx";

-- 2. Rename ProfileImage → Image
ALTER TABLE "ProfileImage" RENAME TO "Image";
ALTER INDEX "ProfileImage_pkey" RENAME TO "Image_pkey";
ALTER INDEX "ProfileImage_storagePath_key" RENAME TO "Image_storagePath_key";
ALTER INDEX "ProfileImage_userId_idx" RENAME TO "Image_userId_idx";
ALTER TABLE "Image" RENAME CONSTRAINT "ProfileImage_userId_fkey" TO "Image_userId_fkey";

-- 3. Create the new ProfileImage join table (legacy profileId still on Image)
CREATE TABLE "ProfileImage" (
    "id"        TEXT NOT NULL,
    "imageId"   TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    CONSTRAINT "ProfileImage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ProfileImage_imageId_key" ON "ProfileImage"("imageId");
CREATE INDEX "ProfileImage_profileId_idx" ON "ProfileImage"("profileId");
ALTER TABLE "ProfileImage"
  ADD CONSTRAINT "ProfileImage_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfileImage"
  ADD CONSTRAINT "ProfileImage_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Create the UserContentImage join table
CREATE TABLE "UserContentImage" (
    "id"            TEXT NOT NULL,
    "imageId"       TEXT NOT NULL,
    "userContentId" TEXT NOT NULL,
    CONSTRAINT "UserContentImage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserContentImage_imageId_key" ON "UserContentImage"("imageId");
CREATE INDEX "UserContentImage_userContentId_idx" ON "UserContentImage"("userContentId");
ALTER TABLE "UserContentImage"
  ADD CONSTRAINT "UserContentImage_imageId_fkey"
    FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserContentImage"
  ADD CONSTRAINT "UserContentImage_userContentId_fkey"
    FOREIGN KEY ("userContentId") REFERENCES "UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Backfill ProfileImage join rows from the legacy profileId column
INSERT INTO "ProfileImage" ("id", "imageId", "profileId")
SELECT
  'pi_' || id,
  id,
  "profileId"
FROM "Image"
WHERE "profileId" IS NOT NULL;

-- 6. Verify counts before destroying the source data
DO $$
DECLARE
  src_count int;
  dst_count int;
BEGIN
  SELECT count(*) INTO src_count FROM "Image" WHERE "profileId" IS NOT NULL;
  SELECT count(*) INTO dst_count FROM "ProfileImage";
  IF src_count <> dst_count THEN
    RAISE EXCEPTION 'ProfileImage backfill mismatch: src=%, dst=%', src_count, dst_count;
  END IF;
END $$;

-- 7. Drop the legacy profileId column from Image
ALTER TABLE "Image" DROP COLUMN "profileId";

-- 8. Record the equivalent Prisma migration as applied
INSERT INTO "_prisma_migrations"
  ("id", "checksum", "finished_at", "migration_name",
   "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES
  (gen_random_uuid()::text,
   '<SHA256_OF_MIGRATION_SQL>',
   now(),
   '20260514120000_polymorphic_images',
   NULL, NULL, now(), 1);

COMMIT;
