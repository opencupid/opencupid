import { z } from 'zod'
import {
  BaseUserContentPayloadSchema,
  UserContentMetadataSchema,
  OwnerUserContentOverlaySchema,
  PublicUserContentDetailBaseSchema,
  UserContentQueryShape,
  NearbyContentQueryShape,
} from '../userContent/userContent.dto'
import { LocationSchema } from '@zod/dto/location.dto'
import { ProfileSummarySchema } from '@zod/profile/profile.dto'

const COMMUNITY_KIND = z.literal('community')

const MIN_YEAR_FOUNDED = 1
const MAX_YEAR_FOUNDED = new Date().getUTCFullYear()

const YearFoundedSchema = z.number().int().min(MIN_YEAR_FOUNDED).max(MAX_YEAR_FOUNDED).nullable()

export const PublicCommunitySchema = UserContentMetadataSchema.extend({
  kind: COMMUNITY_KIND,
  yearFounded: YearFoundedSchema,
})
export type PublicCommunity = z.infer<typeof PublicCommunitySchema>

export const PublicCommunityDetailSchema = PublicUserContentDetailBaseSchema.extend({
  kind: COMMUNITY_KIND,
  yearFounded: YearFoundedSchema,
})
export type PublicCommunityDetail = z.infer<typeof PublicCommunityDetailSchema>

export const OwnerCommunitySchema = PublicCommunitySchema.merge(OwnerUserContentOverlaySchema)
export type OwnerCommunity = z.infer<typeof OwnerCommunitySchema>

export const CreateCommunityPayloadSchema = BaseUserContentPayloadSchema.extend({
  yearFounded: YearFoundedSchema.optional(),
})
export type CreateCommunityPayload = z.infer<typeof CreateCommunityPayloadSchema>

export const UpdateCommunityPayloadSchema = CreateCommunityPayloadSchema.partial().extend({
  isVisible: z.boolean().optional(),
})
export type UpdateCommunityPayload = z.infer<typeof UpdateCommunityPayloadSchema>

export const CommunityParamsSchema = z.object({ id: z.string().cuid() })

export const CommunityQuerySchema = z.object(UserContentQueryShape)
export type CommunityQuery = z.infer<typeof CommunityQuerySchema>
export type CommunityQueryInput = z.input<typeof CommunityQuerySchema>

export const NearbyCommunityQuerySchema = z.object(NearbyContentQueryShape)
export type NearbyCommunityQuery = z.infer<typeof NearbyCommunityQuerySchema>
export type NearbyCommunityQueryInput = z.input<typeof NearbyCommunityQuerySchema>

export const CommunitySummarySchema = z.object({
  id: z.string(),
  kind: COMMUNITY_KIND,
  content: z.string(),
  location: LocationSchema,
  postedBy: ProfileSummarySchema,
})
