// TODO: review usage; copied for both db and dto layers
import { z } from 'zod'
import { TagSchema } from '../generated'

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



// Route schemas
export const SearchQuerySchema = z.object({
  q: z.string().min(1),
});


