import { z } from 'zod'
import { ProfileSummarySchema } from '../profile/profile.dto'
import { ConversationContextSchema } from '../interaction/interactionContext.dto'
import { LocationSchema } from '@zod/dto/location.dto'

export const ContentKindSchema = z.enum(['post', 'event'])
export type ContentKind = z.infer<typeof ContentKindSchema>

/**
 * Lean shape used by feed/bounds/nearby/search and supercluster.
 * No extension fields; consumers branch on `kind` only when they need them.
 */
export const LeanUserContentSchema = z.object({
  id: z.string(),
  kind: ContentKindSchema,
  content: z.string(),
  postedBy: ProfileSummarySchema,
  location: LocationSchema.nullable().optional(),
  createdAt: z.date(),
  isOwn: z.boolean().default(false),
})
export type LeanUserContent = z.infer<typeof LeanUserContentSchema>

export const UserContentQueryShape = {
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  kind: ContentKindSchema.optional(),
} as const

export const UserContentQuerySchema = z.object(UserContentQueryShape)
export type UserContentQuery = z.infer<typeof UserContentQuerySchema>

export const NearbyContentQueryShape = {
  ...UserContentQueryShape,
  lat: z.coerce.number(),
  lon: z.coerce.number(),
  radius: z.coerce.number().int().min(1).max(500).default(50),
} as const

export const NearbyContentQuerySchema = z.object(NearbyContentQueryShape)
export type NearbyContentQuery = z.infer<typeof NearbyContentQuerySchema>

export const ContentParamsSchema = z.object({ id: z.string().cuid() })
export type ContentParams = z.infer<typeof ContentParamsSchema>

/**
 * Detail-with-context shape: postedBy carries conversation context for non-owner viewers.
 * The discriminated union of `PublicUserContentDetailSchema` is composed in this module
 * after the per-kind DTO files import this base.
 */
export const PublicUserContentDetailBaseSchema = LeanUserContentSchema.extend({
  postedBy: ProfileSummarySchema.merge(ConversationContextSchema),
})
