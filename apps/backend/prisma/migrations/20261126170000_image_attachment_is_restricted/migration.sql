-- AlterTable
ALTER TABLE "ImageAttachment" ADD COLUMN "isRestricted" BOOLEAN NOT NULL DEFAULT false;

-- Only profile galleries define who may see a restricted image
-- (not expressible in Prisma schema)
ALTER TABLE "ImageAttachment" ADD CONSTRAINT "ImageAttachment_restricted_profile_only_check"
  CHECK (NOT "isRestricted" OR "profileId" IS NOT NULL);
