import z from 'zod'

import { LocationSchema } from '@zod/dto/location.dto'
import { PublicTagSchema } from '@zod/tag/tag.dto'
import { ProfileSchema } from '@zod/generated'
import { editableFields, LocalizedStringSchema } from './profile.dto'
import { PublicProfileImageSchema } from './profileimage.dto'
import { DatingPreferencesFormSchema } from '@zod/match/filters.form'

// Onboarding form schema
export const EditProfileFormSchema = ProfileSchema.pick({
  ...editableFields,
}).extend({
  publicName: z.string().default(''),
  birthday: z.coerce.date().nullable().default(null),
  gender: z.string().nullable().default('unspecified'),
  pronouns: z.string().nullable().default('unspecified'),
  relationship: z.string().nullable().default(null),
  hasKids: z.string().nullable().default(null),
  languages: z.string().array().default([]),
  isDatingActive: z.boolean().default(false),
  isSocialActive: z.boolean().default(true),

  introSocialLocalized: LocalizedStringSchema,
  introDatingLocalized: LocalizedStringSchema,

  tags: z.array(PublicTagSchema).default([]),
  location: LocationSchema.default({ country: '', cityName: '' }),
})
export type EditProfileForm = z.infer<typeof EditProfileFormSchema>

// Profile creation form — extends edit form with dating preference fields
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
