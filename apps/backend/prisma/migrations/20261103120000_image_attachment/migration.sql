-- Schema only. Databases with existing gallery data must run
-- prisma/data-migrations/20261103120000_image_attachment.sql BEFORE
-- `prisma migrate deploy`: it performs this restructure together with the
-- data move and records this migration as applied.

-- DropForeignKey
ALTER TABLE "ProfileImage" DROP CONSTRAINT "ProfileImage_imageId_fkey";

-- DropForeignKey
ALTER TABLE "ProfileImage" DROP CONSTRAINT "ProfileImage_profileId_fkey";

-- DropForeignKey
ALTER TABLE "UserContentImage" DROP CONSTRAINT "UserContentImage_imageId_fkey";

-- DropForeignKey
ALTER TABLE "UserContentImage" DROP CONSTRAINT "UserContentImage_userContentId_fkey";

-- DropTable
DROP TABLE "ProfileImage";

-- DropTable
DROP TABLE "UserContentImage";

-- CreateTable
CREATE TABLE "ImageAttachment" (
    "imageId" TEXT NOT NULL,
    "profileId" TEXT,
    "userContentId" TEXT,
    "position" SERIAL NOT NULL,

    CONSTRAINT "ImageAttachment_pkey" PRIMARY KEY ("imageId"),
    -- exactly one gallery (not expressible in Prisma schema)
    CONSTRAINT "ImageAttachment_one_gallery_check" CHECK (num_nonnulls("profileId", "userContentId") = 1)
);

-- CreateIndex
CREATE UNIQUE INDEX "ImageAttachment_profileId_position_key" ON "ImageAttachment"("profileId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ImageAttachment_userContentId_position_key" ON "ImageAttachment"("userContentId", "position");

-- AddForeignKey
ALTER TABLE "ImageAttachment" ADD CONSTRAINT "ImageAttachment_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAttachment" ADD CONSTRAINT "ImageAttachment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImageAttachment" ADD CONSTRAINT "ImageAttachment_userContentId_fkey" FOREIGN KEY ("userContentId") REFERENCES "UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
