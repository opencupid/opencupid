import { z } from 'zod';
import { TrustReasonSchema } from '../inputTypeSchemas/TrustReasonSchema'

/////////////////////////////////////////
// PROFILE TRUST FLAG SCHEMA
/////////////////////////////////////////

export const ProfileTrustFlagSchema = z.object({
  reason: TrustReasonSchema,
  id: z.cuid(),
  profileId: z.string(),
  flaggedAt: z.coerce.date(),
  clearedAt: z.coerce.date().nullable(),
  clearedBy: z.string().nullable(),
  evidence: z.string(),
  flaggedBy: z.string(),
})

export type ProfileTrustFlag = z.infer<typeof ProfileTrustFlagSchema>

export default ProfileTrustFlagSchema;
