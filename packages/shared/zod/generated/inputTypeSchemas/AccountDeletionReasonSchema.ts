import { z } from 'zod';

export const AccountDeletionReasonSchema = z.enum(['technical_issue','not_a_good_fit','bad_experience','other']);

export type AccountDeletionReasonType = `${z.infer<typeof AccountDeletionReasonSchema>}`

export default AccountDeletionReasonSchema;
