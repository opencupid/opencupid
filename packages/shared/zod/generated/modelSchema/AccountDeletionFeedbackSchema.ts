import { z } from 'zod';
import { AccountDeletionReasonSchema } from '../inputTypeSchemas/AccountDeletionReasonSchema'

/////////////////////////////////////////
// ACCOUNT DELETION FEEDBACK SCHEMA
/////////////////////////////////////////

export const AccountDeletionFeedbackSchema = z.object({
  reason: AccountDeletionReasonSchema,
  id: z.cuid(),
  comment: z.string().nullable(),
  createdAt: z.coerce.date(),
})

export type AccountDeletionFeedback = z.infer<typeof AccountDeletionFeedbackSchema>

export default AccountDeletionFeedbackSchema;
