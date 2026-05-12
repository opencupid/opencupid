import { z } from 'zod';
import { GenderSchema } from '../inputTypeSchemas/GenderSchema'
import { PronounsSchema } from '../inputTypeSchemas/PronounsSchema'
import { RelationshipStatusSchema } from '../inputTypeSchemas/RelationshipStatusSchema'
import { HasKidsSchema } from '../inputTypeSchemas/HasKidsSchema'

/////////////////////////////////////////
// PROFILE SCHEMA
/////////////////////////////////////////

export const ProfileSchema = z.object({
  gender: GenderSchema.nullable(),
  pronouns: PronounsSchema.nullable(),
  relationship: RelationshipStatusSchema.nullable(),
  hasKids: HasKidsSchema.nullable(),
  prefGender: GenderSchema.array(),
  prefKids: HasKidsSchema.array(),
  id: z.cuid(),
  publicName: z.string(),
  country: z.string(),
  cityName: z.string(),
  isSocialActive: z.boolean(),
  isDatingActive: z.boolean(),
  isActive: z.boolean(),
  isReported: z.boolean(),
  isBlocked: z.boolean(),
  isOnboarded: z.boolean(),
  isCallable: z.boolean(),
  hasFace: z.boolean(),
  userId: z.string(),
  work: z.string(),
  languages: z.string().array(),
  birthday: z.coerce.date().nullable(),
  prefAgeMin: z.number().int().nullable(),
  prefAgeMax: z.number().int().nullable(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Profile = z.infer<typeof ProfileSchema>

export default ProfileSchema;
