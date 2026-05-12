import { z } from 'zod';

export const ProfileTrustFlagScalarFieldEnumSchema = z.enum(['id','profileId','reason','flaggedAt','clearedAt','clearedBy','evidence','flaggedBy']);

export default ProfileTrustFlagScalarFieldEnumSchema;
