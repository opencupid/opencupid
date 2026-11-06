import { z } from 'zod';

export const AccountDeletionReasonSchema = z.enum(['found_connection','not_a_good_fit','bad_experience','other']);

export type AccountDeletionReasonType = `${z.infer<typeof AccountDeletionReasonSchema>}`

export default AccountDeletionReasonSchema;
