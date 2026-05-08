import { z } from 'zod'
import { PostTypeSchema } from '../generated'
import {
  BaseUserContentPayloadSchema,
  LeanUserContentSchema,
  OwnerUserContentOverlaySchema,
  PublicUserContentDetailBaseSchema,
  UserContentQueryShape,
  NearbyContentQueryShape,
} from '../userContent/userContent.dto'

const POST_KIND = z.literal('post')

export const PublicPostSchema = LeanUserContentSchema.extend({
  kind: POST_KIND,
  type: PostTypeSchema,
})
export type PublicPost = z.infer<typeof PublicPostSchema>

export const PublicPostWithProfileSchema = PublicPostSchema
export type PublicPostWithProfile = PublicPost

export const PublicPostDetailSchema = PublicUserContentDetailBaseSchema.extend({
  kind: POST_KIND,
  type: PostTypeSchema,
})
export type PublicPostDetail = z.infer<typeof PublicPostDetailSchema>

export const OwnerPostSchema = PublicPostSchema.merge(OwnerUserContentOverlaySchema)
export type OwnerPost = z.infer<typeof OwnerPostSchema>

// TODO(post-summary-schema) #1446: `location` and `postedBy` are `z.any()` —
// runtime validation is disabled for the two richest fields. The backend
// `mapPostSummary` produces concrete shapes (LocationSchema /
// ProfileSummarySchema), so swapping these in would catch DTO drift.
// Deferred: mapPostSummary's input includes a partial profile shape that
// doesn't quite line up with ProfileSummarySchema today; reconciling
// belongs in the same follow-up that simplifies the mapper-input types.
export const PostSummarySchema = z.object({
  id: z.string(),
  kind: POST_KIND,
  type: PostTypeSchema,
  content: z.string(),
  location: z.any(),
  postedBy: z.any(),
})
export type PostSummary = z.infer<typeof PostSummarySchema>

export const CreatePostPayloadSchema = BaseUserContentPayloadSchema.extend({
  type: PostTypeSchema,
})
export type CreatePostPayload = z.infer<typeof CreatePostPayloadSchema>

export const UpdatePostPayloadSchema = CreatePostPayloadSchema.partial().extend({
  isVisible: z.boolean().optional(),
})
export type UpdatePostPayload = z.infer<typeof UpdatePostPayloadSchema>

export const PostParamsSchema = z.object({ id: z.string().cuid() })
export type PostParams = z.infer<typeof PostParamsSchema>

export const PostQuerySchema = z.object({
  ...UserContentQueryShape,
  type: PostTypeSchema.optional(),
})
export type PostQuery = z.infer<typeof PostQuerySchema>
export type PostQueryInput = z.input<typeof PostQuerySchema>

export const NearbyPostQuerySchema = z.object({
  ...NearbyContentQueryShape,
  type: PostTypeSchema.optional(),
})
export type NearbyPostQuery = z.infer<typeof NearbyPostQuerySchema>
export type NearbyPostQueryInput = z.input<typeof NearbyPostQuerySchema>

export type PostScope = 'all' | 'nearby' | 'recent' | 'my'
