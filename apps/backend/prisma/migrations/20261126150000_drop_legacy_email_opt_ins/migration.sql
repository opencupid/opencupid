-- Contract step of 20261126123501_add_email_preference: the flags now live in
-- EmailPreference. Deploy only after that PR's one-off data migration has run,
-- and at least 7 days later, so unsubscribe links carrying the old
-- nearby_signups scope have expired.

-- DropForeignKey
ALTER TABLE "NearbySignupOptOut" DROP CONSTRAINT "NearbySignupOptOut_profileId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "emailNotificationsOptIn",
DROP COLUMN "newsletterOptIn";

-- DropTable
DROP TABLE "NearbySignupOptOut";
