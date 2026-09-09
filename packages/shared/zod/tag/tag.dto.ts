// TODO: review usage; copied for both db and dto layers
import { z } from 'zod'
import { TagSchema } from '../generated'

/**
 * Upper bound on tags attachable to a single UserContent row. Profiles are
 * deliberately unbounded (tags there are an interest list the owner curates),
 * but content is discovery surface — an item carrying dozens of tags is
 * keyword-stuffing, not description.
 */
export const MAX_TAGS_PER_CONTENT = 10

// Public tag fields
const publicTagFields = {
  id: true,
  name: true,
  slug: true,
} as const

export const PublicTagSchema = TagSchema.pick(publicTagFields)
export type PublicTag = z.infer<typeof PublicTagSchema>

// Owner tag fields
const ownerTagFields = {
  ...publicTagFields,
} as const

export const OwnerTagSchema = TagSchema.pick(ownerTagFields)
export type OwnerTag = z.infer<typeof OwnerTagSchema>

/** Params (for route IDs) */
export const TagParamsSchema = z.object({
  id: z.string().cuid(),
})
export type TagParams = z.infer<typeof TagParamsSchema>

/** Create payload */
export const CreateTagSchema = TagSchema.pick({
  name: true,
  createdBy: true,
  isUserCreated: true,
  originalLocale: true,
})

export type CreateTagInput = z.infer<typeof CreateTagSchema>

// Payload schema for creating a tag
export const CreateTagPayloadSchema = z.object({
  name: z.string().min(1),
})
export type CreateTagPayload = z.infer<typeof CreateTagPayloadSchema>

// Popular tag (includes usage count)
export const PopularTagSchema = PublicTagSchema.extend({
  count: z.number().int().min(0),
})
export type PopularTag = z.infer<typeof PopularTagSchema>

export const PopularTagsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  country: z.string().optional(),
})
export type PopularTagsQuery = z.infer<typeof PopularTagsQuerySchema>

// Route schemas
export const SearchQuerySchema = z.object({
  q: z.string().min(1),
})
