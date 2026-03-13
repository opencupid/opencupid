// TODO: review usage; copied for both db and dto layers
import { z } from 'zod'
import { ProfileSchema, UserRoleSchema, UserSchema } from '../generated'
import { OwnerProfileSchema } from '@zod/profile/profile.dto'

export const JwtPayloadSchema = z.object({
  userId: z.string().cuid(),
  profileId: z.string().cuid(),
  tokenVersion: z.number().int(),
})
export type JwtPayload = z.infer<typeof JwtPayloadSchema>

export const UserIdentifierSchema = z.object({
  email: z.string().optional(),
  phonenumber: z.string().optional(),
})
export type UserIdentifier = z.infer<typeof UserIdentifierSchema>

export const UserIdentifyPayloadSchema = UserIdentifierSchema.extend({
  captchaSolution: z.string().min(1, 'Captcha solution is required'),
  language: z.string(),
}).refine((data) => !!data.email || !!data.phonenumber, {
  message: 'Either email or phone number is required.',
  path: ['email'], // mark the error on the email field (or 'phonenumber')
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
  language: z.string().min(2).max(5),
})
export type UpdateUserLanguagePayload = z.infer<typeof UpdateUserLanguagePayloadSchema>

export const VerifyTokenPayloadSchema = z.object({
  token: z.string().length(6),
})
export type VerifyTokenPayload = z.infer<typeof VerifyTokenPayloadSchema>

export const RefreshTokenPayloadSchema = z.object({
  refreshToken: z.string().uuid(),
})
export type RefreshTokenPayload = z.infer<typeof RefreshTokenPayloadSchema>

export const UserWithProfileSchema = UserSchema.extend({
  profile: OwnerProfileSchema,
})

export type UserWithProfile = z.infer<typeof UserWithProfileSchema>
