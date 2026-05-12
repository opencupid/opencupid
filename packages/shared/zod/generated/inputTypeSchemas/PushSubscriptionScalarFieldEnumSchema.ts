import { z } from 'zod';

export const PushSubscriptionScalarFieldEnumSchema = z.enum(['id','userId','endpoint','p256dh','auth','createdAt','updatedAt','deviceInfo','lastSeen']);

export default PushSubscriptionScalarFieldEnumSchema;
