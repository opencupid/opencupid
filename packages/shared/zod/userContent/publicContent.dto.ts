import { z } from 'zod'
import { PublicPostSchema, PublicPostDetailSchema } from '../post/post.dto'
import { PublicEventSchema, PublicEventDetailSchema } from '../event/event.dto'

/**
 * Discriminated-union schemas for the full polymorphic user-content API.
 * Kept in a separate file to avoid the circular-import cycle that would arise
 * if these were defined in userContent.dto.ts (which post.dto and event.dto
 * both import from).
 */
export const PublicUserContentSchema = z.discriminatedUnion('kind', [
  PublicPostSchema,
  PublicEventSchema,
])
export type PublicUserContent = z.infer<typeof PublicUserContentSchema>

export const PublicUserContentDetailSchema = z.discriminatedUnion('kind', [
  PublicPostDetailSchema,
  PublicEventDetailSchema,
])
export type PublicUserContentDetail = z.infer<typeof PublicUserContentDetailSchema>
