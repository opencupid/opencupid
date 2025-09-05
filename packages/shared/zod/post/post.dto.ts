import { z } from 'zod'
import { PostSchema, PostTypeSchema, ProfileImageSchema } from '../generated'
import { PostType } from '@prisma/client'
import { ProfileSummarySchema, PublicProfileSchema } from '../profile/profile.dto'

// Base fields that are public
const publicPostFields = {
  id: true,
  content: true,
  type: true,
  createdAt: true,
  updatedAt: true,
  postedById: true,
} as const

// Owner fields (includes all public fields)
const ownerPostFields = {
  ...publicPostFields,
  isDeleted: true,
  isVisible: true,
} as const

// Public post schema (what other users see)
export const PublicPostSchema = PostSchema.pick(publicPostFields)
export type PublicPost = z.infer<typeof PublicPostSchema>

// Owner post schema (what the post creator sees)
export const OwnerPostSchema = PostSchema.pick(ownerPostFields)
export type OwnerPost = z.infer<typeof OwnerPostSchema>

// Extended public post with profile info
export const PublicPostWithProfileSchema = PublicPostSchema.extend({
  postedBy: ProfileSummarySchema,
})
export type PublicPostWithProfile = z.infer<typeof PublicPostWithProfileSchema>

// Create post payload (from client to API)
export const CreatePostPayloadSchema = z.object({
  content: z.string().min(1).max(2000),
  type: PostTypeSchema,
})
export type CreatePostPayload = z.infer<typeof CreatePostPayloadSchema>

// Update post payload
export const UpdatePostPayloadSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  type: PostTypeSchema.optional(),
  isVisible: z.boolean().optional(),
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
  limit: z.preprocess(
    val => typeof val === 'string' ? parseInt(val, 10) : val,
    z.number().int().min(1).max(100).default(20)
  ),
  offset: z.preprocess(
    val => typeof val === 'string' ? parseInt(val, 10) : val,
    z.number().int().min(0).default(0)
  ),
})
export type PostQuery = z.infer<typeof PostQuerySchema>

// Frontend query type (all optional)
export interface PostQueryInput {
  type?: PostType
  limit?: number
  offset?: number
}

// Query parameters for nearby posts
export const NearbyPostQuerySchema = PostQuerySchema.extend({
  lat: z.preprocess(
    val => typeof val === 'string' ? parseFloat(val) : val,
    z.number()
  ),
  lon: z.preprocess(
    val => typeof val === 'string' ? parseFloat(val) : val,
    z.number()
  ),
  radius: z.preprocess(
    val => typeof val === 'string' ? parseInt(val, 10) : val,
    z.number().int().min(1).max(500).default(50)
  ),
})
export type NearbyPostQuery = z.infer<typeof NearbyPostQuerySchema>

// Frontend nearby query type
export interface NearbyPostQueryInput extends PostQueryInput {
  lat: number
  lon: number
  radius?: number
}