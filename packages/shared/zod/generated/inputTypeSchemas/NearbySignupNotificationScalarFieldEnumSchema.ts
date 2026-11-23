import { z } from 'zod';

export const NearbySignupNotificationScalarFieldEnumSchema = z.enum(['id','profileId','sentAt','newCount','newProfileIds']);

export default NearbySignupNotificationScalarFieldEnumSchema;
