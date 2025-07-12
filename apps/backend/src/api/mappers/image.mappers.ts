import { ProfileImage } from "@prisma/client"
import { ImageService } from "@/services/image.service"
import { PublicProfileImage, PublicProfileImageSchema, OwnerProfileImage, OwnerProfileImageSchema } from "@zod/profile/profileimage.dto"

export interface MinimalProfileImage {
  storagePath: string
}

/**
 * Constructs the public URL for the image
 */
function getSignedVariants(image: MinimalProfileImage) {
  const svc = ImageService.getInstance()
  return svc.getSignedUrls(image)
}

/**
 * Add the public URL to the image object and sanitize it
 * by removing any non-public fields
 */
export function toPublicProfileImage(image: ProfileImage): PublicProfileImage {
  const variants = getSignedVariants(image)
  return PublicProfileImageSchema.parse({ ...image, variants })
}

/**
 * Add the public URL to the image object and sanitize it
 * by removing fields that are not accessible to the owner
 */
export function toOwnerProfileImage(image: ProfileImage): OwnerProfileImage {
  const variants = getSignedVariants(image)
  return OwnerProfileImageSchema.parse({ ...image, variants })
}

