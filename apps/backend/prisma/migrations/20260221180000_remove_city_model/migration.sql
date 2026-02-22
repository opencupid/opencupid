-- DropForeignKey
ALTER TABLE "public"."Profile" DROP CONSTRAINT IF EXISTS "Profile_cityId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SocialMatchFilter" DROP CONSTRAINT IF EXISTS "SocialMatchFilter_cityId_fkey";

-- AlterTable
ALTER TABLE "public"."Profile" DROP COLUMN "cityId";

-- AlterTable
ALTER TABLE "public"."SocialMatchFilter" DROP COLUMN "cityId";

-- DropTable
DROP TABLE "public"."City";
