-- DropForeignKey (many-to-many join table)
ALTER TABLE IF EXISTS "_SocialMatchFilterToTag" DROP CONSTRAINT IF EXISTS "_SocialMatchFilterToTag_A_fkey";
ALTER TABLE IF EXISTS "_SocialMatchFilterToTag" DROP CONSTRAINT IF EXISTS "_SocialMatchFilterToTag_B_fkey";

-- DropTable
DROP TABLE IF EXISTS "_SocialMatchFilterToTag";
DROP TABLE IF EXISTS "SocialMatchFilter";
