/*
  Warnings:

  - You are about to drop the `ProfileTag` table. If the table is not empty, all the data it contains will be lost.

*/

-- CreateTable
CREATE TABLE "_ProfileTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProfileTags_AB_pkey" PRIMARY KEY ("A","B")
);


-- Migrate data from ProfileTag to _ProfileTags
INSERT INTO "_ProfileTags" ("A", "B")
SELECT "profileId", "tagId"
FROM "ProfileTag"
WHERE "profileId" IS NOT NULL AND "tagId" IS NOT NULL;


-- DropForeignKey
ALTER TABLE "ProfileTag" DROP CONSTRAINT "ProfileTag_profileId_fkey";

-- DropForeignKey
ALTER TABLE "ProfileTag" DROP CONSTRAINT "ProfileTag_tagId_fkey";

-- DropTable
DROP TABLE "ProfileTag";


-- CreateIndex
CREATE INDEX "_ProfileTags_B_index" ON "_ProfileTags"("B");

-- AddForeignKey
ALTER TABLE "_ProfileTags" ADD CONSTRAINT "_ProfileTags_A_fkey" FOREIGN KEY ("A") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfileTags" ADD CONSTRAINT "_ProfileTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
