// TODO: review usage; copied for both db and dto layers
import { z } from 'zod'
import {
  AccountDeletionReasonSchema,
  ProfileSchema,
  UserRoleSchema,
  UserSchema,
} from '../generated'
import { fallbackLocale, normalizeLocale } from '../../i18n/locales'

// These schemas run in both runtimes and cannot read FALLBACK_LOCALE, so a
// stored language falls back to the built-in locale rather than the configured one.

export const JwtPayloadSchema = z.object({
  userId: z.string().cuid(),
  profileId: z.string().cuid(),
  tokenVersion: z.number().int(),
})
export type JwtPayload = z.infer<typeof JwtPayloadSchema>

export const UserIdentifierSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
})
export type UserIdentifier = z.infer<typeof UserIdentifierSchema>

/**
 * In-app path to land on after login (the deep link the user was heading to
 * when they were sent to the login page). Same-origin absolute paths only.
 */
export const LoginRedirectSchema = z
  .string()
  .max(512)
  .regex(/^\/(?![/\\])/, 'Must be an in-app path')

export const UserIdentifyPayloadSchema = UserIdentifierSchema.extend({
  captchaSolution: z.string().min(1, 'Captcha solution is required'),
  language: z.string().transform((lang) => normalizeLocale(lang, fallbackLocale)),
  redirect: LoginRedirectSchema.optional(),
})
export type UserIdentifyPayload = z.infer<typeof UserIdentifyPayloadSchema>

export const SessionProfileSchema = ProfileSchema.pick({
  id: true,
  isDatingActive: true,
  isSocialActive: true,
  isActive: true,
}).extend({
  isDatingActive: z.boolean().default(false),
  isSocialActive: z.boolean().default(false),
  isActive: z.boolean().default(false),
})
export type SessionProfile = z.infer<typeof SessionProfileSchema>

export const SessionDataSchema = z.object({
  userId: z.string(),
  profileId: z.string(),
  tokenVersion: z.number().int(),
  lang: z.string().default('en'),
  roles: z.array(UserRoleSchema),
  hasActiveProfile: z.boolean().default(false),
  profile: SessionProfileSchema,
})
export type SessionData = z.infer<typeof SessionDataSchema>

export const SettingsUserSchema = UserSchema.pick({
  email: true,
  phonenumber: true,
  language: true,
  newsletterOptIn: true,
  isPushNotificationEnabled: true,
})
export type SettingsUser = z.infer<typeof SettingsUserSchema>

export const LoginUserSchema = UserSchema.pick({
  id: true,
  email: true,
  phonenumber: true,
  language: true,
  newsletterOptIn: true,
  isPushNotificationEnabled: true,
})
export type LoginUser = z.infer<typeof LoginUserSchema>

export const UpdateUserLanguagePayloadSchema = z.object({
  language: z
    .string()
    .min(2)
    .max(5)
    .transform((lang) => normalizeLocale(lang, fallbackLocale)),
})
export type UpdateUserLanguagePayload = z.infer<typeof UpdateUserLanguagePayloadSchema>

export const VerifyTokenPayloadSchema = z.object({
  token: z.string().length(6),
})
export type VerifyTokenPayload = z.infer<typeof VerifyTokenPayloadSchema>

// Identifier typed by the user to confirm account deletion. The route checks
// it against the authenticated user's email (or phonenumber) case-insensitively.
export const DeleteAccountPayloadSchema = z.object({
  confirmIdentifier: z.string().min(1),
})
export type DeleteAccountPayload = z.infer<typeof DeleteAccountPayloadSchema>

export const ACCOUNT_DELETION_COMMENT_MAX_LENGTH = 2000

// Exit survey submitted after account deletion. A free-text comment belongs
// with the "other" reason only, where it is mandatory.
export const AccountDeletionFeedbackPayloadSchema = z.discriminatedUnion('reason', [
  z.object({ reason: AccountDeletionReasonSchema.exclude(['other']) }),
  z.object({
    reason: z.literal(AccountDeletionReasonSchema.enum.other),
    comment: z.string().trim().min(1).max(ACCOUNT_DELETION_COMMENT_MAX_LENGTH),
  }),
])
export type AccountDeletionFeedbackPayload = z.infer<typeof AccountDeletionFeedbackPayloadSchema>
