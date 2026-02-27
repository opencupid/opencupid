-- CreateEnum
CREATE TYPE "public"."ActivitySegment" AS ENUM ('new', 'returning', 'frequent', 'dormant');

-- CreateTable
CREATE TABLE "public"."ProfileSessionLog" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileSessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfileActivitySummary" (
    "profileId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "activeDays28" INTEGER NOT NULL DEFAULT 0,
    "sessions28" INTEGER NOT NULL DEFAULT 0,
    "segment" "public"."ActivitySegment" NOT NULL DEFAULT 'dormant',
    "demotionStreak" INTEGER NOT NULL DEFAULT 0,
    "segmentUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileActivitySummary_pkey" PRIMARY KEY ("profileId")
);

-- CreateIndex
CREATE INDEX "ProfileSessionLog_profileId_startedAt_idx" ON "public"."ProfileSessionLog"("profileId", "startedAt");

-- AddForeignKey
ALTER TABLE "public"."ProfileSessionLog" ADD CONSTRAINT "ProfileSessionLog_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileActivitySummary" ADD CONSTRAINT "ProfileActivitySummary_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
