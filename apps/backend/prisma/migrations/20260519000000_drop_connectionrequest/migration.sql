-- DropForeignKey
ALTER TABLE "ConnectionRequest" DROP CONSTRAINT "ConnectionRequest_fromUserId_fkey";
ALTER TABLE "ConnectionRequest" DROP CONSTRAINT "ConnectionRequest_toUserId_fkey";

-- DropTable
DROP TABLE "ConnectionRequest";

-- DropEnum
DROP TYPE "ConnectionType";
DROP TYPE "ConnectionStatus";
