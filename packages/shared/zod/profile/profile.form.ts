import z from 'zod'

import { LocationSchema } from '@zod/dto/location.dto'
import { PublicTagSchema } from '@zod/tag/tag.dto'
import {
  GenderSchema,
  PronounsSchema,
  RelationshipStatusSchema,
  HasKidsSchema,
} from '@zod/generated'
import { LocalizedStringSchema } from './profile.dto'
import { PublicProfileImageSchema } from './profileimage.dto'
import { DatingPreferencesFormSchema } from '@zod/match/filters.form'

// Social profile fields
const SocialFormSchema = z.object({
  publicName: z.string().default(''),
  languages: z.string().array().default([]),
  isSocialActive: z.boolean().default(true),
})

// Dating profile fields (personal attributes, not match preferences)
const DatingProfileFormSchema = z.object({
  birthday: z.coerce.date().nullable().default(null),
  gender: GenderSchema.nullable().default('unspecified'),
  pronouns: PronounsSchema.nullable().default('unspecified'),
  relationship: RelationshipStatusSchema.nullable().default(null),
  hasKids: HasKidsSchema.nullable().default(null),
  isDatingActive: z.boolean().default(false),
})

// Localized text + tags + location (form-only fields, not on Profile table)
const ProfileFormExtrasSchema = z.object({
  introSocialLocalized: LocalizedStringSchema,
  introDatingLocalized: LocalizedStringSchema,
  tags: z.array(PublicTagSchema).default([]),
  location: LocationSchema.default(LocationSchema.parse({})),
})

// Edit form: social + dating profile + extras
export const EditProfileFormSchema = SocialFormSchema.merge(DatingProfileFormSchema).merge(
  ProfileFormExtrasSchema
)
export type EditProfileForm = z.infer<typeof EditProfileFormSchema>

// Create form: edit form + dating match preferences
export const CreateProfileFormSchema = EditProfileFormSchema.merge(DatingPreferencesFormSchema)
export type CreateProfileForm = z.infer<typeof CreateProfileFormSchema>

// this is used for editing fields in the profile edit modals. only neccessary
// because we use EditField.vue to implement the in-place modal, we're not
// actually touching the profile images
export type EditFieldProfileFormWithImages = EditProfileForm & {
  profileImages: z.infer<typeof PublicProfileImageSchema>[]
}

export const ProfileFormToPayloadTransform = EditProfileFormSchema.transform((data) => {
  const { location, ...rest } = data
  return {
    ...rest,
    tags: data.tags.map((tag) => tag.id),
    country: data.location.country,
    cityName: data.location.cityName,
    lat: data.location.lat,
    lon: data.location.lon,
  }
})

export const CreateProfileFormToPayloadTransform = CreateProfileFormSchema.transform((data) => {
  const { location, ...rest } = data
  return {
    ...rest,
    tags: data.tags.map((tag) => tag.id),
    country: data.location.country,
    cityName: data.location.cityName,
    lat: data.location.lat,
    lon: data.location.lon,
  }
})
