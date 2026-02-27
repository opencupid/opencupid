-- Backfill UserActivitySummary for all existing users.
-- All existing users start as 'dormant' since we have no prior session data.
INSERT INTO "public"."UserActivitySummary" (
  "userId",
  "firstSeenAt",
  "lastSeenAt",
  "activeDays28",
  "sessions28",
  "segment",
  "demotionStreak",
  "segmentUpdatedAt"
)
SELECT
  "id",
  "createdAt",
  "createdAt",
  0,
  0,
  'dormant'::"public"."ActivitySegment",
  0,
  NOW()
FROM "public"."User"
ON CONFLICT ("userId") DO NOTHING;
