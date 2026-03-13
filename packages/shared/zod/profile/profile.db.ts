import z from 'zod'
import {
  ConversationParticipantSchema,
  ConversationSchema,
  HiddenProfileSchema,
  LikedProfileSchema,
  LocalizedProfileFieldSchema,
  ProfileImageSchema,
  ProfileSchema,
} from '@zod/generated'
import { TagWithTranslationsSchema } from '@zod/tag/tag.db'
import { GenderSchema, HasKidsSchema } from '@zod/generated'
import {
  datingFields,
  datingPreferencesFields,
  locationFields,
  ownerFields,
  socialFields,
} from './profile.fields'

export const DbProfileSchema = ProfileSchema.extend({
  localized: z.array(LocalizedProfileFieldSchema).default([]),
  tags: z.array(TagWithTranslationsSchema).default([]),
})
export type DbProfile = z.infer<typeof DbProfileSchema>

export const DbProfileWithImagesSchema = DbProfileSchema.extend({
  profileImages: z.array(ProfileImageSchema).default([]),
})
export type DbProfileWithImages = z.infer<typeof DbProfileWithImagesSchema>

export const DbMinimalProfileSchema = z.object({
  id: z.string(),
  publicName: z.string(),
  profileImages: z.array(z.object({ storagePath: z.string() })),
})
export type DbProfileSummary = z.infer<typeof DbMinimalProfileSchema>

export const DbProfileWithContextSchema = DbProfileWithImagesSchema.extend({
  conversationParticipants: z
    .array(
      ConversationParticipantSchema.extend({
        conversation: ConversationSchema,
      })
    )
    .default([]),

  likesReceived: z.array(LikedProfileSchema),
  likesSent: z.array(LikedProfileSchema),
  hiddenBy: z.array(HiddenProfileSchema),
  blockedByProfiles: z.array(ProfileSchema),
  blockedProfiles: z.array(ProfileSchema),
})

export type DbProfileWithContext = z.infer<typeof DbProfileWithContextSchema>

/** Validates that a profile has all dating-critical fields set. Use `.safeParse()` to narrow. */
export const DatingEligibleProfileSchema = z.object({
  id: z.string(),
  isDatingActive: z.literal(true),
  birthday: z.coerce.date(),
  gender: GenderSchema,
  hasKids: HasKidsSchema.nullable(),
  prefAgeMin: z.number().int(),
  prefAgeMax: z.number().int(),
  prefGender: z.array(GenderSchema),
  prefKids: z.array(HasKidsSchema),
})
export type DatingEligibleProfile = z.infer<typeof DatingEligibleProfileSchema>

export const DbOwnerUpdateScalarsSchema = ProfileSchema.pick({
  ...socialFields,
  ...datingFields,
  ...datingPreferencesFields,
  ...locationFields,
  ...ownerFields,
}).partial()

export type DbOwnerUpdateScalars = z.infer<typeof DbOwnerUpdateScalarsSchema>

/** Full profile update input for the service layer (scalars + complex fields). */
export type ProfileUpdateInput = DbOwnerUpdateScalars & {
  tags?: string[]
  introSocialLocalized?: Record<string, string>
  introDatingLocalized?: Record<string, string>
}
