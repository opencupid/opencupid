-- CreateTable
CREATE TABLE "NearbySignupOptOut" (
    "profileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NearbySignupOptOut_pkey" PRIMARY KEY ("profileId")
);

-- AddForeignKey
ALTER TABLE "NearbySignupOptOut" ADD CONSTRAINT "NearbySignupOptOut_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
