-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "room" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "targetProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Meeting_room_key" UNIQUE ("room"),
    CONSTRAINT "Meeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Meeting_targetProfileId_fkey" FOREIGN KEY ("targetProfileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
