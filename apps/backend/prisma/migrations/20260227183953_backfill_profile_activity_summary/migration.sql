-- Backfill ProfileActivitySummary for every existing profile.
-- Uses User.createdAt (via Profile.userId → User.id) as the firstSeenAt/lastSeenAt
-- and marks everyone as dormant initially.
INSERT INTO "ProfileActivitySummary" ("profileId", "firstSeenAt", "lastSeenAt", "activeDays28", "sessions28", "segment", "demotionStreak", "segmentUpdatedAt")
SELECT p."id", u."createdAt", u."createdAt", 0, 0, 'dormant', 0, NOW()
FROM "Profile" p
JOIN "User" u ON u."id" = p."userId"
ON CONFLICT ("profileId") DO NOTHING;
