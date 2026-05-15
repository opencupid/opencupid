-- DropForeignKey
ALTER TABLE "ProfileImage" DROP CONSTRAINT "ProfileImage_userId_fkey";

-- DropIndex
DROP INDEX "ProfileImage_userId_idx";

-- AlterTable
ALTER TABLE "ProfileImage" ALTER COLUMN "profileId" SET NOT NULL;
ALTER TABLE "ProfileImage" DROP COLUMN "userId";
