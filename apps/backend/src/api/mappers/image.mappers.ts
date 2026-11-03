import { Image } from '@prisma/client'
import { ImageService } from '@/services/image.service'
import { PublicImage, PublicImageSchema, OwnerImage, OwnerImageSchema } from '@zod/image/image.dto'

export interface MinimalImage {
  storagePath: string
}

function getImageVariants(image: MinimalImage) {
  const svc = ImageService.getInstance()
  return svc.getImageUrls(image)
}

/*
 * `position` for a gallery image is its sorted index (0 = primary): pass the index
 * when mapping an ordered gallery. ImageAttachment.position is a sparse sequence
 * value and never leaves the backend. Without the override, Image.position is used,
 * which is only meaningful for message images.
 */

/**
 * Add public URLs and sanitize to fields safe to expose to non-owners.
 */
export function toPublicImage(image: MinimalImage, position?: number): PublicImage {
  const variants = getImageVariants(image)
  return PublicImageSchema.parse({
    ...image,
    ...(position !== undefined && { position }),
    variants,
  })
}

/**
 * Add public URLs while keeping the owner-only fields (id, etc.).
 */
export function toOwnerImage(image: Image, position?: number): OwnerImage {
  const variants = getImageVariants(image)
  return OwnerImageSchema.parse({ ...image, ...(position !== undefined && { position }), variants })
}
