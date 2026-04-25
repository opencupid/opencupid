-- CreateEnum
CREATE TYPE "TrustReason" AS ENUM ('PROFILE_UNVETTED', 'SPAM_BURST');

-- CreateTable
CREATE TABLE "ProfileTrustFlag" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "reason" "TrustReason" NOT NULL,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "evidence" TEXT NOT NULL,
    "flaggedBy" TEXT NOT NULL,

    CONSTRAINT "ProfileTrustFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileTrustFlag_profileId_clearedAt_idx"
    ON "ProfileTrustFlag" ("profileId", "clearedAt");

-- CreateIndex (partial, active-flag lookups)
CREATE INDEX "ProfileTrustFlag_active_idx"
    ON "ProfileTrustFlag" ("profileId")
    WHERE "clearedAt" IS NULL;

-- AddForeignKey
ALTER TABLE "ProfileTrustFlag"
    ADD CONSTRAINT "ProfileTrustFlag_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "Profile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterEnum (ConversationStatus) — Postgres requires ALTER TYPE ... ADD VALUE per value.
-- New enum values are not visible in the same transaction that adds them, so any DDL
-- that references 'DISCARDED' (e.g. the partial unique index on Conversation) must live
-- in a later migration — see 20260423000001_conversation_active_pair_index.
ALTER TYPE "ConversationStatus" ADD VALUE 'PENDING';
ALTER TYPE "ConversationStatus" ADD VALUE 'DISCARDED';
