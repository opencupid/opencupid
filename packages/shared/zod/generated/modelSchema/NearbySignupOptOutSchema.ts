import { z } from 'zod';

/////////////////////////////////////////
// NEARBY SIGNUP OPT OUT SCHEMA
/////////////////////////////////////////

/**
 * A row means the profile opted out of nearby-signups emails.
 */
export const NearbySignupOptOutSchema = z.object({
  profileId: z.string(),
  createdAt: z.coerce.date(),
})

export type NearbySignupOptOut = z.infer<typeof NearbySignupOptOutSchema>

export default NearbySignupOptOutSchema;
