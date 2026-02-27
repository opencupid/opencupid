-- CreateEnum
CREATE TYPE "public"."ActivitySegment" AS ENUM ('new', 'returning', 'frequent', 'dormant');

-- CreateTable
CREATE TABLE "public"."UserSessionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "UserSessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserActivitySummary" (
    "userId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "activeDays28" INTEGER NOT NULL DEFAULT 0,
    "sessions28" INTEGER NOT NULL DEFAULT 0,
    "segment" "public"."ActivitySegment" NOT NULL DEFAULT 'dormant',
    "demotionStreak" INTEGER NOT NULL DEFAULT 0,
    "segmentUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserActivitySummary_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "UserSessionLog_userId_startedAt_idx" ON "public"."UserSessionLog"("userId", "startedAt");

-- AddForeignKey
ALTER TABLE "public"."UserSessionLog" ADD CONSTRAINT "UserSessionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserActivitySummary" ADD CONSTRAINT "UserActivitySummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
