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

/**
 * Add public URLs and sanitize to fields safe to expose to non-owners.
 */
export function toPublicImage(image: MinimalImage): PublicImage {
  const variants = getImageVariants(image)
  return PublicImageSchema.parse({ ...image, variants })
}

/**
 * Add public URLs while keeping the owner-only fields (id, etc.).
 */
export function toOwnerImage(image: Image): OwnerImage {
  const variants = getImageVariants(image)
  return OwnerImageSchema.parse({ ...image, variants })
}
