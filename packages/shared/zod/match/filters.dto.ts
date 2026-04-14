import { ProfileSchema } from '@zod/generated'
import { z } from 'zod'
import { datingPreferencesFields } from '@zod/profile/profile.fields'

// client -> API DTO dating preferences update payload
export const UpdateDatingPreferencesPayloadSchema = ProfileSchema.pick({
  ...datingPreferencesFields,
}).partial()
export type UpdateDatingPreferencesPayload = z.infer<typeof UpdateDatingPreferencesPayloadSchema>

