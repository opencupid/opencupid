import { PostSchema } from '../generated'
import { ProfileSummarySchema } from '../profile/profile.dto'
import { ConversationContextSchema } from '../interaction/interactionContext.dto'
import { LocationSchema } from '@zod/dto/location.dto'
import { z } from 'zod'

export const userContentPublicFields = {
  id: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  postedById: true,
  country: true,
  cityName: true,
  lat: true,
  lon: true,
} as const

export const userContentOwnerFields = {
  ...userContentPublicFields,
  isDeleted: true,
  isVisible: true,
} as const

export const PublicUserContentSchema = PostSchema.pick(userContentPublicFields).extend({
  isOwn: z.boolean().optional(),
})
export type PublicUserContent = z.infer<typeof PublicUserContentSchema>

export const OwnerUserContentSchema = PostSchema.pick(userContentOwnerFields).extend({
  postedBy: ProfileSummarySchema,
  location: LocationSchema.nullable().optional(),
  isOwn: z.boolean().default(true),
})
export type OwnerUserContent = z.infer<typeof OwnerUserContentSchema>

export const PublicUserContentWithProfileSchema = PublicUserContentSchema.extend({
  postedBy: ProfileSummarySchema,
  location: LocationSchema.nullable().optional(),
  isOwn: z.boolean().default(false),
})
export type PublicUserContentWithProfile = z.infer<typeof PublicUserContentWithProfileSchema>

export const PublicUserContentDetailSchema = PublicUserContentWithProfileSchema.extend({
  postedBy: ProfileSummarySchema.merge(ConversationContextSchema),
})
export type PublicUserContentDetail = z.infer<typeof PublicUserContentDetailSchema>

export const UserContentSummarySchema = z.object({
  id: z.string(),
  content: z.string(),
  location: LocationSchema,
  postedBy: ProfileSummarySchema,
})
export type UserContentSummary = z.infer<typeof UserContentSummarySchema>

export const CreateUserContentPayloadShape = {
  content: z.string().min(1).max(2000),
  country: z.string().optional(),
  cityName: z.string().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
} as const

export const UpdateUserContentPayloadShape = {
  content: z.string().min(1).max(2000).optional(),
  isVisible: z.boolean().optional(),
  country: z.string().nullable().optional(),
  cityName: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
} as const

export const UserContentQueryShape = {
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
} as const

export const NearbyQueryShape = {
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  radius: z.coerce.number().int().min(1).max(500).default(50),
} as const
