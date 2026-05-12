import { z } from 'zod'
import { PublicPostSchema, PublicPostDetailSchema, OwnerPostSchema } from '../post/post.dto'
import { PublicEventSchema, PublicEventDetailSchema, OwnerEventSchema } from '../event/event.dto'
import {
  PublicCommunitySchema,
  PublicCommunityDetailSchema,
  OwnerCommunitySchema,
} from '../community/community.dto'

/**
 * Discriminated-union schemas for the full polymorphic user-content API.
 * Kept in a separate file to avoid the circular-import cycle that would arise
 * if these were defined in userContent.dto.ts (which post.dto, event.dto and
 * community.dto all import from).
 */
export const PublicUserContentSchema = z.discriminatedUnion('kind', [
  PublicPostSchema,
  PublicEventSchema,
  PublicCommunitySchema,
])
export type PublicUserContent = z.infer<typeof PublicUserContentSchema>

export const PublicUserContentDetailSchema = z.discriminatedUnion('kind', [
  PublicPostDetailSchema,
  PublicEventDetailSchema,
  PublicCommunityDetailSchema,
])
export type PublicUserContentDetail = z.infer<typeof PublicUserContentDetailSchema>

export const OwnerUserContentSchema = z.discriminatedUnion('kind', [
  OwnerPostSchema,
  OwnerEventSchema,
  OwnerCommunitySchema,
])
export type OwnerUserContent = z.infer<typeof OwnerUserContentSchema>
