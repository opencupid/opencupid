import { z } from 'zod';
import { EmailScopeSchema } from '../inputTypeSchemas/EmailScopeSchema'
import { EmailPreferenceSourceSchema } from '../inputTypeSchemas/EmailPreferenceSourceSchema'

/////////////////////////////////////////
// EMAIL PREFERENCE SCHEMA
/////////////////////////////////////////

/**
 * One row per user and scope, written when the user is created.
 * Who/when/how for consent (GDPR Art. 7(1)): userId, updatedAt, source.
 */
export const EmailPreferenceSchema = z.object({
  scope: EmailScopeSchema,
  source: EmailPreferenceSourceSchema,
  userId: z.string(),
  granted: z.boolean(),
  updatedAt: z.coerce.date(),
})

export type EmailPreference = z.infer<typeof EmailPreferenceSchema>

export default EmailPreferenceSchema;
