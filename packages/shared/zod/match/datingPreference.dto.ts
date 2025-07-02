import { DatingPreferencesSchema } from '@zod/generated';
import { z } from 'zod'

export const datingPreferencesFields = {
  prefAgeMin: true,
  prefAgeMax: true,
  prefGender: true,
  prefKids: true,
} as const;


// API -> client dating preferences DTO
export const DatingPreferencesDTOSchema = DatingPreferencesSchema.pick({
  ...datingPreferencesFields,
})
export type DatingPreferencesDTO = z.infer<typeof DatingPreferencesDTOSchema>;


// client -> API DTO dating preferences update payload
export const UpdateDatingPreferencesPayloadSchema = DatingPreferencesSchema.pick({
  ...datingPreferencesFields,
}).partial()
export type UpdateDatingPreferencesPayload = z.infer<typeof UpdateDatingPreferencesPayloadSchema>;
