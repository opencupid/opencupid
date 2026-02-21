-- AlterTable
ALTER TABLE "public"."Conversation" ADD COLUMN     "jitsiRoomId" TEXT;

-- AlterTable
ALTER TABLE "public"."ConversationParticipant" ADD COLUMN     "isCallable" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "public"."Profile" ADD COLUMN     "isCallable" BOOLEAN NOT NULL DEFAULT true;
