-- CreateTable
CREATE TABLE "NearbySignupNotification" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "newCount" INTEGER NOT NULL,
    "newProfileIds" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "NearbySignupNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NearbySignupNotification_profileId_sentAt_idx" ON "NearbySignupNotification"("profileId", "sentAt");

-- AddForeignKey
ALTER TABLE "NearbySignupNotification" ADD CONSTRAINT "NearbySignupNotification_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
