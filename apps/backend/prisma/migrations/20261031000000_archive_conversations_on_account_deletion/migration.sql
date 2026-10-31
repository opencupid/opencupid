-- Make Conversation profile FK columns nullable with SetNull on delete.
-- When a profile is deleted, conversations survive (profileAId/profileBId/initiatorProfileId
-- become NULL) rather than being cascade-deleted. This preserves the surviving
-- participant's ConversationParticipant row, preventing P2025 errors on
-- markConversationRead. Conversations are set to ARCHIVED in deleteAccount()
-- before profile deletion, so they are filtered from the inbox query.

-- DropForeignKey
ALTER TABLE "public"."Conversation" DROP CONSTRAINT "Conversation_initiatorProfileId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Conversation" DROP CONSTRAINT "Conversation_profileAId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Conversation" DROP CONSTRAINT "Conversation_profileBId_fkey";

-- AlterTable
ALTER TABLE "public"."Conversation" ALTER COLUMN "profileAId" DROP NOT NULL,
ALTER COLUMN "profileBId" DROP NOT NULL,
ALTER COLUMN "initiatorProfileId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_profileAId_fkey" FOREIGN KEY ("profileAId") REFERENCES "public"."Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_profileBId_fkey" FOREIGN KEY ("profileBId") REFERENCES "public"."Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_initiatorProfileId_fkey" FOREIGN KEY ("initiatorProfileId") REFERENCES "public"."Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
