import { ProfileSchema } from '@zod/generated'
import { z } from 'zod'
import { LocationSchema } from '../dto/location.dto'
import { PublicTagSchema } from '../tag/tag.dto'
import { datingPreferencesFields } from '@zod/profile/profile.fields'

// client -> API DTO dating preferences update payload
export const UpdateDatingPreferencesPayloadSchema = ProfileSchema.pick({
  ...datingPreferencesFields,
}).partial()
export type UpdateDatingPreferencesPayload = z.infer<typeof UpdateDatingPreferencesPayloadSchema>

/**
 * @deprecated The persistent SocialMatchFilter model has been retired.
 * Browse filtering is now entirely ephemeral and client-side. This schema
 * is kept only so stale frontends can still parse the no-op response from
 * the deprecated `GET/PATCH /find/social/filter` shim endpoints.
 *
 * TODO(cleanup): remove together with the shim endpoints once all clients
 * have been updated and dashboards confirm no traffic is hitting the path.
 */
export const SocialMatchFilterDTOSchema = z.object({
  location: LocationSchema,
  radius: z.number().optional(),
  tags: z.array(PublicTagSchema).default([]),
})
/** @deprecated see `SocialMatchFilterDTOSchema` */
export type SocialMatchFilterDTO = z.infer<typeof SocialMatchFilterDTOSchema>
