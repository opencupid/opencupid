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
 * Shared write-side fields for create payloads across all content kinds.
 * Per-kind schemas `.extend()` this with discriminator-bound fields
 * (e.g. `type` for posts, `startsAt` for events).
 */
export const BaseUserContentPayloadSchema = z.object({
  content: z.string().min(1).max(2000),
  country: z.string().nullable().optional(),
  cityName: z.string().nullable().optional(),
  lat: z.number().nullable().optional(),
  lon: z.number().nullable().optional(),
})
export type BaseUserContentPayload = z.infer<typeof BaseUserContentPayloadSchema>

/**
 * Owner-only fields layered onto per-kind public schemas to produce owner schemas.
 * Per-kind owner schemas: `PublicXxxSchema.merge(OwnerUserContentOverlaySchema)`.
 */
export const OwnerUserContentOverlaySchema = z.object({
  isDeleted: z.boolean(),
  isVisible: z.boolean(),
  isOwn: z.literal(true),
  updatedAt: z.date(),
})

/**
 * Detail-with-context shape: postedBy carries conversation context for non-owner viewers.
 * Per-kind schemas extend this base and add their own extension fields.
 */
export const PublicUserContentDetailBaseSchema = LeanUserContentSchema.extend({
  postedBy: ProfileSummarySchema.merge(ConversationContextSchema),
})

/**
 * Discriminated-union schemas that combine post and event kinds.
 * Imported from @zod/userContent/publicContent.dto to avoid circular imports
 * (post.dto and event.dto import from this file; they cannot be imported here).
 */
export type { PublicUserContent, PublicUserContentDetail } from './publicContent.dto'
