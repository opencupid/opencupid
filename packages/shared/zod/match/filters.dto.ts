import { ProfileSchema, SocialMatchFilterSchema, TagSchema } from '@zod/generated';
import { z } from 'zod'
import { LocationSchema, LocationPayloadSchema } from '../dto/location.dto';
import { PublicTagSchema } from '../tag/tag.dto';
import { TagWithTranslationsSchema } from '../tag/tag.db';

export const datingPreferencesFields = {
  prefAgeMin: true,
  prefAgeMax: true,
  prefGender: true,
  prefKids: true,
} as const;


// API -> client dating preferences DTO
export const DatingPreferencesDTOSchema = ProfileSchema.pick({
  ...datingPreferencesFields,
})
export type DatingPreferencesDTO = z.infer<typeof DatingPreferencesDTOSchema>;


// client -> API DTO dating preferences update payload
export const UpdateDatingPreferencesPayloadSchema = ProfileSchema.pick({
  ...datingPreferencesFields,
}).partial()
export type UpdateDatingPreferencesPayload = z.infer<typeof UpdateDatingPreferencesPayloadSchema>;

export const SocialMatchFilterWithTagsSchema = SocialMatchFilterSchema.extend({
  tags: z.array(TagWithTranslationsSchema), // or z.array(z.string()) if you only want IDs
})

export type SocialMatchFilterWithTags = z.infer<typeof SocialMatchFilterWithTagsSchema>

export const SocialMatchFilterDTOSchema = z.object({
  location: LocationSchema.nullable(),
  radius: z.number().optional(),
  tags: z.array(PublicTagSchema).default([]),
})
export type SocialMatchFilterDTO = z.infer<typeof SocialMatchFilterDTOSchema>


export const UpdateSocialMatchFilterPayloadSchema = z.object({
  location: LocationPayloadSchema.optional(),
  radius: z.number().optional(),
  tags: z.array(z.string()).default([]), // or z.array(PublicTagSchema).optional().default([]) if you want full tag objects
}).partial()
export type UpdateSocialMatchFilterPayload = z.infer<typeof UpdateSocialMatchFilterPayloadSchema>;

