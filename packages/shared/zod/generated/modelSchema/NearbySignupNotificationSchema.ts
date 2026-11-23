import { z } from 'zod';

/////////////////////////////////////////
// NEARBY SIGNUP NOTIFICATION SCHEMA
/////////////////////////////////////////

/**
 * One row per nearby-signups digest email sent. Append-only; the next run's
 * reference time and the per-dormancy cap are derived from these rows.
 */
export const NearbySignupNotificationSchema = z.object({
  id: z.cuid(),
  profileId: z.string(),
  sentAt: z.coerce.date(),
  /**
   * How many new nearby profiles triggered the email.
   */
  newCount: z.number().int(),
  /**
   * Snapshot of who was counted, for attribution; not a relation.
   */
  newProfileIds: z.string().array(),
})

export type NearbySignupNotification = z.infer<typeof NearbySignupNotificationSchema>

export default NearbySignupNotificationSchema;
