import { ProfileImage } from '@prisma/client'
import { ImageService } from '@/services/image.service'
import {
  PublicProfileImage,
  PublicProfileImageSchema,
  OwnerProfileImage,
  OwnerProfileImageSchema,
} from '@zod/profile/profileimage.dto'

export interface MinimalProfileImage {
  storagePath: string
}

function getImageVariants(image: MinimalProfileImage) {
  const svc = ImageService.getInstance()
  return svc.getImageUrls(image)
}

/**
 * Add the public URL to the image object and sanitize it
 * by removing any non-public fields
 */
export function toPublicProfileImage(image: MinimalProfileImage): PublicProfileImage {
  const variants = getImageVariants(image)
  return PublicProfileImageSchema.parse({ ...image, variants })
}

/**
 * Add the public URL to the image object and sanitize it
 * by removing fields that are not accessible to the owner
 */
export function toOwnerProfileImage(image: ProfileImage): OwnerProfileImage {
  const variants = getImageVariants(image)
  return OwnerProfileImageSchema.parse({ ...image, variants })
}
