import { z } from 'zod';
import { UserRoleSchema } from '../inputTypeSchemas/UserRoleSchema'

/////////////////////////////////////////
// USER SCHEMA
/////////////////////////////////////////

export const UserSchema = z.object({
  roles: UserRoleSchema.array(),
  id: z.cuid(),
  email: z.string(),
  phonenumber: z.string().nullable(),
  tokenVersion: z.number().int(),
  loginToken: z.string().nullable(),
  loginTokenExp: z.coerce.date().nullable(),
  isActive: z.boolean(),
  isBlocked: z.boolean(),
  isRegistrationConfirmed: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lastLoginAt: z.coerce.date().nullable(),
  language: z.string(),
  originDomain: z.string(),
  newsletterOptIn: z.boolean(),
  emailNotificationsOptIn: z.boolean(),
  isPushNotificationEnabled: z.boolean(),
})

export type User = z.infer<typeof UserSchema>

export default UserSchema;
