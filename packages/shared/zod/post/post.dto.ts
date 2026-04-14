import { z } from 'zod'
import { PostSchema, PostTypeSchema } from '../generated'
import { ProfileSummarySchema } from '../profile/profile.dto'
import { ConversationContextSchema } from '../interaction/interactionContext.dto'
import { DbMinimalProfileSchema } from '../profile/profile.db'
import { LocationSchema } from '@zod/dto/location.dto'

// Base fields that are public
const publicPostFields = {
  id: true,
  content: true,
  type: true,
  createdAt: true,
  updatedAt: true,
  postedById: true,
  country: true,
  cityName: true,
  lat: true,
  lon: true,
} as const

// Owner fields (includes all public fields)
const ownerPostFields = {
  ...publicPostFields,
  isDeleted: true,
  isVisible: true,
} as const

export const PostWithProfileSchema = PostSchema.extend({
  postedBy: DbMinimalProfileSchema,
})
export type PostWithProfile = z.infer<typeof PostWithProfileSchema>

// Public post schema (what other users see)
export const PublicPostSchema = PostSchema.pick(publicPostFields).extend({
  isOwn: z.boolean().optional(),
})

export type PublicPost = z.infer<typeof PublicPostSchema>

// Owner post schema (what the post creator sees)
export const OwnerPostSchema = PostSchema.pick(ownerPostFields).extend({
  postedBy: ProfileSummarySchema,
  location: LocationSchema.nullable().optional(),
  isOwn: z.boolean().default(true),
})
export type OwnerPost = z.infer<typeof OwnerPostSchema>

// Extended public post with profile info
export const PublicPostWithProfileSchema = PublicPostSchema.extend({
  postedBy: ProfileSummarySchema,
  location: LocationSchema.nullable().optional(),
  isOwn: z.boolean().default(false),
})
export type PublicPostWithProfile = z.infer<typeof PublicPostWithProfileSchema>

// Detail view for a single post (GET /posts/:id for non-owners)
// Extends PublicPostWithProfile with conversation context on postedBy
export const PublicPostDetailSchema = PublicPostWithProfileSchema.extend({
  postedBy: ProfileSummarySchema.merge(ConversationContextSchema),
})
export type PublicPostDetail = z.infer<typeof PublicPostDetailSchema>

// Minimal post shape for omnibox / search-result rendering
export const PostSummarySchema = z.object({
  id: z.string(),
  type: PostTypeSchema,
  content: z.string(),
  location: LocationSchema,
  postedBy: ProfileSummarySchema,
})
export type PostSummary = z.infer<typeof PostSummarySchema>

// Create post payload (from client to API)
export const CreatePostPayloadSchema = z.object({
  content: z.string().min(1).max(2000),
  type: PostTypeSchema,
  country: z.string().optional(),
  cityName: z.string().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
})
export type CreatePostPayload = z.infer<typeof CreatePostPayloadSchema>

// Update post payload
export const UpdatePostPayloadSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  type: PostTypeSchema.optional(),
  isVisible: z.boolean().optional(),
  country: z.string().nullable().optional(),
  cityName: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
})
export type UpdatePostPayload = z.infer<typeof UpdatePostPayloadSchema>

// Route params for ID lookups
export const PostParamsSchema = z.object({
  id: z.string().cuid(),
})
export type PostParams = z.infer<typeof PostParamsSchema>

// Query parameters for listing posts
export const PostQuerySchema = z.object({
  type: PostTypeSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})
export type PostQuery = z.infer<typeof PostQuerySchema>
export type PostQueryInput = z.input<typeof PostQuerySchema>

// Query parameters for nearby posts
export const NearbyPostQuerySchema = PostQuerySchema.extend({
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  radius: z.coerce.number().int().min(1).max(500).default(50),
})
export type NearbyPostQuery = z.infer<typeof NearbyPostQuerySchema>
export type NearbyPostQueryInput = z.input<typeof NearbyPostQuerySchema>

export type PostScope = 'all' | 'nearby' | 'recent' | 'my'
