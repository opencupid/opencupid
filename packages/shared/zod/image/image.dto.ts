import { z } from 'zod'
import { ImageSchema } from '../generated'

export const ImageVariantSchema = z.object({
  size: z.string(),
  url: z.string().min(1),
})

export type ImageVariant = z.infer<typeof ImageVariantSchema>

// Fields exposed in the public API for any image (profile gallery or content gallery)
const publicFields = {
  mimeType: true,
  altText: true,
  position: true,
  blurhash: true,
} as const

export const PublicImageSchema = ImageSchema.pick(publicFields).extend({
  variants: z.array(ImageVariantSchema).default([]),
})
export type PublicImage = z.infer<typeof PublicImageSchema>

// Owner fields: include id so the owner UI can issue updates/deletes
const ownerFields = {
  ...publicFields,
  id: true,
} as const

export const OwnerImageSchema = ImageSchema.pick(ownerFields).extend({
  variants: z.array(ImageVariantSchema).default([]),
})
export type OwnerImage = z.infer<typeof OwnerImageSchema>

const ImagePositionSchema = z.object({
  id: z.string().cuid(),
  position: z.number().int().min(0),
})
export type ImagePosition = z.infer<typeof ImagePositionSchema>

export const ReorderImagesPayloadSchema = z.object({
  images: z.array(ImagePositionSchema).nonempty('At least one image must be provided').min(1),
})
export type ReorderImagesPayload = z.infer<typeof ReorderImagesPayloadSchema>

// API response schemas

export const ApiSuccessSchema = z.object({
  success: z.boolean(),
})

export const ImagesResponseSchema = z.object({
  images: z.array(OwnerImageSchema).default([]),
})

export const ImageApiResponseSchema = ApiSuccessSchema.merge(ImagesResponseSchema)
export type ImageApiResponse = z.infer<typeof ImageApiResponseSchema>

export type ImagesResponse = z.infer<typeof ImagesResponseSchema>
