/*
  Warnings:

  - You are about to drop the `DatingPreferences` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "DatingPreferences";

-- CreateTable
CREATE TABLE "SocialMatchFilter" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "country" TEXT,
    "cityId" TEXT,
    "radius" INTEGER DEFAULT 50,

    CONSTRAINT "SocialMatchFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SocialMatchFilterToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SocialMatchFilterToTag_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "SocialMatchFilter_profileId_key" ON "SocialMatchFilter"("profileId");

-- CreateIndex
CREATE INDEX "_SocialMatchFilterToTag_B_index" ON "_SocialMatchFilterToTag"("B");

-- AddForeignKey
ALTER TABLE "_SocialMatchFilterToTag" ADD CONSTRAINT "_SocialMatchFilterToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "SocialMatchFilter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SocialMatchFilterToTag" ADD CONSTRAINT "_SocialMatchFilterToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
