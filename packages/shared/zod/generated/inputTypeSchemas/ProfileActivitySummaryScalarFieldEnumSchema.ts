import { z } from 'zod';

export const ProfileActivitySummaryScalarFieldEnumSchema = z.enum(['profileId','lastSeenAt','activeDays28','sessions28','segment','demotionStreak','segmentUpdatedAt']);

export default ProfileActivitySummaryScalarFieldEnumSchema;
