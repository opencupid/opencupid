import { z } from 'zod'
import {
  EmailScopeSchema,
  type EmailScopeType,
} from '../generated/inputTypeSchemas/EmailScopeSchema'

export { EmailScopeSchema, type EmailScopeType as EmailScope }

/** Every email scope, in display order. */
export const EMAIL_SCOPES = EmailScopeSchema.options

/**
 * The value each scope starts with when a user is created. Newsletter is
 * opt-in, so it starts off; service and reminder emails start on and can be
 * turned off in settings or from any email's unsubscribe link.
 */
export const EMAIL_SCOPE_DEFAULTS: Readonly<Record<EmailScopeType, boolean>> = {
  notifications: true,
  reminders: true,
  newsletter: false,
}

/** Whether each scope is granted, keyed by scope. */
export const EmailPreferencesSchema = z.record(EmailScopeSchema, z.boolean())
export type EmailPreferences = z.infer<typeof EmailPreferencesSchema>

export const UpdateEmailPreferencesSchema = z.partialRecord(EmailScopeSchema, z.boolean())
export type UpdateEmailPreferences = z.infer<typeof UpdateEmailPreferencesSchema>
