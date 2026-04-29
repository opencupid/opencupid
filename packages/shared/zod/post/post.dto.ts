import { z } from 'zod'
import { PostSchema, PostTypeSchema } from '../generated'
import { ProfileSummarySchema } from '../profile/profile.dto'
import { ConversationContextSchema } from '../interaction/interactionContext.dto'
import { LocationSchema } from '@zod/dto/location.dto'
import {
  userContentPublicFields,
  userContentOwnerFields,
  CreateUserContentPayloadShape,
  UpdateUserContentPayloadShape,
  UserContentQueryShape,
  NearbyQueryShape,
} from '../userContent/userContent.dto'

const publicPostFields = {
  ...userContentPublicFields,
  type: true,
} as const

const ownerPostFields = {
  ...userContentOwnerFields,
  type: true,
} as const

export const PublicPostSchema = PostSchema.pick(publicPostFields).extend({
  isOwn: z.boolean().optional(),
})
export type PublicPost = z.infer<typeof PublicPostSchema>

export const OwnerPostSchema = PostSchema.pick(ownerPostFields).extend({
  postedBy: ProfileSummarySchema,
  location: LocationSchema.nullable().optional(),
  isOwn: z.boolean().default(true),
})
export type OwnerPost = z.infer<typeof OwnerPostSchema>

export const PublicPostWithProfileSchema = PublicPostSchema.extend({
  postedBy: ProfileSummarySchema,
  location: LocationSchema.nullable().optional(),
  isOwn: z.boolean().default(false),
})
export type PublicPostWithProfile = z.infer<typeof PublicPostWithProfileSchema>

export const PublicPostDetailSchema = PublicPostWithProfileSchema.extend({
  postedBy: ProfileSummarySchema.merge(ConversationContextSchema),
})
export type PublicPostDetail = z.infer<typeof PublicPostDetailSchema>

export const PostSummarySchema = z.object({
  id: z.string(),
  type: PostTypeSchema,
  content: z.string(),
  location: LocationSchema,
  postedBy: ProfileSummarySchema,
})
export type PostSummary = z.infer<typeof PostSummarySchema>

export const CreatePostPayloadSchema = z.object({
  ...CreateUserContentPayloadShape,
  type: PostTypeSchema,
})
export type CreatePostPayload = z.infer<typeof CreatePostPayloadSchema>

export const UpdatePostPayloadSchema = z.object({
  ...UpdateUserContentPayloadShape,
  type: PostTypeSchema.optional(),
})
export type UpdatePostPayload = z.infer<typeof UpdatePostPayloadSchema>

export const PostParamsSchema = z.object({
  id: z.string().cuid(),
})
export type PostParams = z.infer<typeof PostParamsSchema>

export const PostQuerySchema = z.object({
  ...UserContentQueryShape,
  type: PostTypeSchema.optional(),
})
export type PostQuery = z.infer<typeof PostQuerySchema>
export type PostQueryInput = z.input<typeof PostQuerySchema>

export const NearbyPostQuerySchema = PostQuerySchema.extend(NearbyQueryShape)
export type NearbyPostQuery = z.infer<typeof NearbyPostQuerySchema>
export type NearbyPostQueryInput = z.input<typeof NearbyPostQuerySchema>

export type PostScope = 'all' | 'nearby' | 'recent' | 'my'
