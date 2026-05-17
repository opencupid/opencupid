-- DropIndex
DROP INDEX "ProfileImage_profileId_position_idx";

-- DropIndex
DROP INDEX "ProfileImage_storagePath_key";

-- AlterTable
ALTER TABLE "ProfileImage" DROP CONSTRAINT "ProfileImage_pkey",
DROP COLUMN "altText",
DROP COLUMN "blurhash",
DROP COLUMN "contentHash",
DROP COLUMN "createdAt",
DROP COLUMN "hasFace",
DROP COLUMN "height",
DROP COLUMN "id",
DROP COLUMN "isFlagged",
DROP COLUMN "isModerated",
DROP COLUMN "mimeType",
DROP COLUMN "position",
DROP COLUMN "storagePath",
DROP COLUMN "updatedAt",
DROP COLUMN "url",
DROP COLUMN "width",
ADD COLUMN     "imageId" TEXT NOT NULL,
ADD CONSTRAINT "ProfileImage_pkey" PRIMARY KEY ("imageId");

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "ownerProfileId" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "contentHash" TEXT,
    "blurhash" TEXT,
    "hasFace" BOOLEAN NOT NULL DEFAULT false,
    "isModerated" BOOLEAN NOT NULL DEFAULT false,
    "isFlagged" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserContentImage" (
    "imageId" TEXT NOT NULL,
    "userContentId" TEXT NOT NULL,

    CONSTRAINT "UserContentImage_pkey" PRIMARY KEY ("imageId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Image_storagePath_key" ON "Image"("storagePath");

-- CreateIndex
CREATE INDEX "Image_ownerProfileId_idx" ON "Image"("ownerProfileId");

-- CreateIndex
CREATE INDEX "UserContentImage_userContentId_idx" ON "UserContentImage"("userContentId");

-- CreateIndex
CREATE INDEX "ProfileImage_profileId_idx" ON "ProfileImage"("profileId");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_ownerProfileId_fkey" FOREIGN KEY ("ownerProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileImage" ADD CONSTRAINT "ProfileImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentImage" ADD CONSTRAINT "UserContentImage_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContentImage" ADD CONSTRAINT "UserContentImage_userContentId_fkey" FOREIGN KEY ("userContentId") REFERENCES "UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
