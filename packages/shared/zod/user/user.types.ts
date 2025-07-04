import { z } from "zod"

import { ProfileSchema, UserRoleSchema, UserSchema } from "@zod/generated"
import { AuthIdentifierSchema, JwtPayloadSchema } from "./user.dto"

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
  lang: z.string().default("en"),
  roles: z.array(UserRoleSchema),
  hasActiveProfile: z.boolean().default(false),
  profile: SessionProfileSchema,
})

export type SessionData = z.infer<typeof SessionDataSchema>


const LoginUserSchema = UserSchema.pick({
  id: true,
  email: true,
  phonenumber: true,
  language: true,
  isRegistrationConfirmed: true,
})

export type LoginUser = z.infer<typeof LoginUserSchema>

export type AuthIdentifier = z.infer<typeof AuthIdentifierSchema>

export type JwtPayload = z.infer<typeof JwtPayloadSchema>
// sdfsd@dfg.com