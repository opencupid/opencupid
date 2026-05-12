-- AlterEnum
ALTER TYPE "ContentKind" ADD VALUE 'community';

-- CreateTable
CREATE TABLE "CommunityContent" (
    "userContentId" TEXT NOT NULL,
    "yearFounded" INTEGER,

    CONSTRAINT "CommunityContent_pkey" PRIMARY KEY ("userContentId")
);

-- AddForeignKey
ALTER TABLE "CommunityContent" ADD CONSTRAINT "CommunityContent_userContentId_fkey" FOREIGN KEY ("userContentId") REFERENCES "UserContent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
