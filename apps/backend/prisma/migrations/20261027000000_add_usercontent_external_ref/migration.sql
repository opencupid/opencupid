-- AlterTable
ALTER TABLE "UserContent" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalSource" TEXT;

-- AlterTable
ALTER TABLE "EventContent" ADD COLUMN     "externalUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "UserContent_externalSource_externalId_key" ON "UserContent"("externalSource", "externalId");
