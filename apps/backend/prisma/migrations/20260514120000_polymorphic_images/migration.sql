-- Polymorphic Images: rename ProfileImage → Image, drop profileId column,
-- introduce ProfileImage / UserContentImage join tables.
--
-- This migration is destructive: any existing rows in ProfileImage will have
-- their profile linkage erased. It is intended only for dev/CI databases that
-- are re-seeded or have throwaway data. Production uses
-- prisma/data-migrations/20260514_polymorphic_images_prod.sql which preserves
-- data and writes its own _prisma_migrations row.

BEGIN;

-- 1. Drop the old FK and index that reference profileId
ALTER TABLE "ProfileImage" DROP CONSTRAINT IF EXISTS "ProfileImage_profileId_fkey";
DROP INDEX IF EXISTS "ProfileImage_profileId_position_idx";

-- 2. Rename ProfileImage → Image (renames the table; PK constraint and indexes follow)
ALTER TABLE "ProfileImage" RENAME TO "Image";
ALTER INDEX "ProfileImage_pkey" RENAME TO "Image_pkey";
ALTER INDEX "ProfileImage_storagePath_key" RENAME TO "Image_storagePath_key";
ALTER INDEX "ProfileImage_userId_idx" RENAME TO "Image_userId_idx";
ALTER TABLE "Image" RENAME CONSTRAINT "ProfileImage_userId_fkey" TO "Image_userId_fkey";

-- 3. Drop the legacy profileId column from Image
ALTER TABLE "Image" DROP COLUMN "profileId";

-- 4. Create the new ProfileImage join table
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

-- 5. Create the UserContentImage join table
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

COMMIT;
