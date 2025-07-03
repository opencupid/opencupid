import { DatingFilterSchema } from '@zod/generated';
import { z } from 'zod'

export const datingFilterFields = {
  prefAgeMin: true,
  prefAgeMax: true,
  prefGender: true,
  prefKids: true,
} as const;


// API -> client dating preferences DTO
export const DatingFilterDTOSchema = DatingFilterSchema.pick({
  ...datingFilterFields,
})
export type DatingFilterDTO = z.infer<typeof DatingFilterDTOSchema>;


// client -> API DTO dating preferences update payload
export const UpdateDatingFilterPayloadSchema = DatingFilterSchema.pick({
  ...datingFilterFields,
}).partial()
export type UpdateDatingFilterPayload = z.infer<typeof UpdateDatingFilterPayloadSchema>;
