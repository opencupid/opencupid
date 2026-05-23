-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('GOING', 'MAYBE');

-- CreateTable
CREATE TABLE "EventAttendance" (
    "eventContentId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'GOING',
    "rsvpedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAttendance_pkey" PRIMARY KEY ("eventContentId","profileId")
);

-- CreateIndex
CREATE INDEX "EventAttendance_profileId_status_idx" ON "EventAttendance"("profileId", "status");

-- CreateIndex
CREATE INDEX "EventAttendance_eventContentId_status_idx" ON "EventAttendance"("eventContentId", "status");

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_eventContentId_fkey" FOREIGN KEY ("eventContentId") REFERENCES "EventContent"("userContentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendance" ADD CONSTRAINT "EventAttendance_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
