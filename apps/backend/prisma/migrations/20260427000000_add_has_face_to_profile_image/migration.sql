-- AlterTable
ALTER TABLE "ProfileImage" ADD COLUMN "hasFace" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "hasFace" BOOLEAN NOT NULL DEFAULT false;
