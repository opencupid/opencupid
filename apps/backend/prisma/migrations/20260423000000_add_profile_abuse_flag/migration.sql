-- CreateEnum
CREATE TYPE "AbuseReason" AS ENUM ('SPAM_BURST');

-- CreateTable
CREATE TABLE "ProfileAbuseFlag" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "reason" "AbuseReason" NOT NULL,
    "flaggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearedAt" TIMESTAMP(3),
    "evidence" JSONB NOT NULL,
    "flaggedBy" TEXT NOT NULL,

    CONSTRAINT "ProfileAbuseFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProfileAbuseFlag_profileId_clearedAt_idx" ON "ProfileAbuseFlag"("profileId", "clearedAt");

-- AddForeignKey
ALTER TABLE "ProfileAbuseFlag" ADD CONSTRAINT "ProfileAbuseFlag_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Partial index for active (uncleared) flags — keeps active-flag lookups O(1)
CREATE INDEX "ProfileAbuseFlag_active_idx"
  ON "ProfileAbuseFlag" ("profileId")
  WHERE "clearedAt" IS NULL;
