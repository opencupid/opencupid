import { z } from 'zod'
import { ImageSchema } from '../generated'
import { ApiSuccessSchema, ImageVariantSchema } from '../profile/profileimage.dto'

const publicFields = {
  mimeType: true,
  altText: true,
  position: true,
  blurhash: true,
} as const

export const PublicUserContentImageSchema = ImageSchema.pick(publicFields).extend({
  variants: z.array(ImageVariantSchema).default([]),
})

export type PublicUserContentImage = z.infer<typeof PublicUserContentImageSchema>

const ownerFields = {
  ...publicFields,
  id: true,
} as const

export const OwnerUserContentImageSchema = ImageSchema.pick(ownerFields).extend({
  variants: z.array(ImageVariantSchema).default([]),
})

export type OwnerUserContentImage = z.infer<typeof OwnerUserContentImageSchema>

export const UserContentImagesResponseSchema = z.object({
  images: z.array(OwnerUserContentImageSchema).default([]),
})

export const UserContentImageApiResponseSchema = ApiSuccessSchema.merge(
  UserContentImagesResponseSchema,
)

export type UserContentImageApiResponse = z.infer<typeof UserContentImageApiResponseSchema>
