import { z } from 'zod';
import { ActivitySegmentSchema } from '../inputTypeSchemas/ActivitySegmentSchema'

/////////////////////////////////////////
// PROFILE ACTIVITY SUMMARY SCHEMA
/////////////////////////////////////////

export const ProfileActivitySummarySchema = z.object({
  segment: ActivitySegmentSchema,
  profileId: z.string(),
  firstSeenAt: z.coerce.date(),
  lastSeenAt: z.coerce.date(),
  activeDays28: z.number().int(),
  sessions28: z.number().int(),
  demotionStreak: z.number().int(),
  segmentUpdatedAt: z.coerce.date(),
})

export type ProfileActivitySummary = z.infer<typeof ProfileActivitySummarySchema>

export default ProfileActivitySummarySchema;
