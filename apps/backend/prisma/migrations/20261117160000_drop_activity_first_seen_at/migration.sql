-- firstSeenAt duplicated Profile.createdAt (a profile is created at the first login)
-- and was read nowhere; account age now comes from Profile.createdAt.
ALTER TABLE "ProfileActivitySummary" DROP COLUMN "firstSeenAt";
