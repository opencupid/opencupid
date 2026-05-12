import { z } from 'zod';

/////////////////////////////////////////
// PUSH SUBSCRIPTION SCHEMA
/////////////////////////////////////////

export const PushSubscriptionSchema = z.object({
  id: z.cuid(),
  userId: z.string(),
  endpoint: z.string(),
  p256dh: z.string(),
  auth: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deviceInfo: z.string().nullable(),
  lastSeen: z.coerce.date().nullable(),
})

export type PushSubscription = z.infer<typeof PushSubscriptionSchema>

export default PushSubscriptionSchema;
