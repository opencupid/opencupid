// TODO: review usage; copied for both db and dto layers
import { z } from 'zod'
import { ProfileSchema, UserRoleSchema, UserSchema } from '../generated'
import { OwnerProfileSchema } from '@zod/profile/profile.dto'

export const JwtPayloadSchema = z.object({
  userId: z.string().cuid(),
  profileId: z.string().cuid(),
})


// JWT payload verified and set on request.user
// const RequestUserSchema = z.object({
//   userId: z.string().cuid(),
//   profileId: z.string().cuid(),
// })
// export type RequestUser = z.infer<typeof RequestUserSchema>




export const AuthIdentifierSchema = z.object({
  email: z.string().optional(),
  phonenumber: z.string().optional(),
})


// TODO rename this, it's more than just an auth identifier. more like a CreateUserPayload
export const AuthIdentifierCaptchaInputSchema = AuthIdentifierSchema
  .extend({
    captchaSolution: z.string().min(1, 'Captcha solution is required'),
    language: z.string(),
  })
  .refine(
    (data) => !!data.email || !!data.phonenumber,
    {
      message: 'Either email or phone number is required.',
      path: ['email'], // mark the error on the email field (or 'phonenumber')
    }
  )
export type AuthIdentifierCaptchaInput = z.infer<typeof AuthIdentifierCaptchaInputSchema>
export type AuthIdentifier = z.infer<typeof AuthIdentifierSchema>
export type JwtPayload = z.infer<typeof JwtPayloadSchema>

export const SessionProfileSchema = ProfileSchema.pick({
  id: true,
  isDatingActive: true,
  isSocialActive: true,
  isActive: true,
})
export type SessionProfile = z.infer<typeof SessionProfileSchema>

export const SessionDataSchema = z.object({
  userId: z.string(),
  profileId: z.string(),
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
})
export type SettingsUser = z.infer<typeof SettingsUserSchema>

export const LoginUserSchema = UserSchema.pick({
  id: true,
  email: true,
  phonenumber: true,
  language: true,
})
export type LoginUser = z.infer<typeof LoginUserSchema>




export const OtpSendReturnSchema = UserSchema.pick({
  id: true,
  email: true,
  phonenumber: true,
  language: true,
})
export type OtpSendReturn = z.infer<typeof OtpSendReturnSchema>

export const OtpLoginInputSchema = z.object({
  userId: z.string().cuid(),
  otp: z.string().min(6, 'OTP must be at least 6 characters long').max(6, 'OTP must be exactly 6 characters long'),
})
export type OtpLogin = z.infer<typeof OtpLoginInputSchema>


export const UserWithProfileSchema = UserSchema.extend({
  profile: OwnerProfileSchema,
})

export type UserWithProfile = z.infer<typeof UserWithProfileSchema>