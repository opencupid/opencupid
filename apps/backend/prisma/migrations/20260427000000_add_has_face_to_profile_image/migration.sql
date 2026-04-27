-- AlterTable
ALTER TABLE "ProfileImage" ADD COLUMN "hasFace" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "hasFace" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "ProfileImage_profileId_position_idx" ON "ProfileImage"("profileId", "position");
