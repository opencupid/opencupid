// TODO: review usage; copied for both db and dto layers
import { z } from 'zod'
import { ProfileImageSchema, ProfileSchema } from '../generated'

export const ImageVariantSchema = z.object({
  size: z.string(),
  url: z.string().min(1),
})

export type ImageVariant = z.infer<typeof ImageVariantSchema>

// Fields exposed in the public API for profile images
const publicFields = {
  mimeType: true,
  altText: true,
  position: true,
  blurhash: true,
} as const

// Public schema
export const PublicProfileImageSchema = ProfileImageSchema.pick(publicFields).extend({
  variants: z.array(ImageVariantSchema).default([]),
})

export type PublicProfileImage = z.infer<typeof PublicProfileImageSchema>

// Owner fields
const ownerFields = {
  ...publicFields,
  id: true,
} as const

export const OwnerProfileImageScalarSchema = ProfileImageSchema.pick(ownerFields).extend({
  variants: z.array(ImageVariantSchema).default([]),
})
export type OwnerProfileImageScalar = z.infer<typeof OwnerProfileImageScalarSchema>

export const OwnerProfileImageSchema = OwnerProfileImageScalarSchema.extend({
  primaryForProfile: ProfileSchema.optional(),
  otherForProfiles: z.array(ProfileSchema).optional(),
})
export type OwnerProfileImage = z.infer<typeof OwnerProfileImageSchema>

const ProfileImagePositionSchema = z.object({
  id: z.string().cuid(),
  position: z.number().int().min(0),
})
export type ProfileImagePosition = z.infer<typeof ProfileImagePositionSchema>

export const ReorderProfileImagesPayloadSchema = z.object({
  images: z
    .array(ProfileImagePositionSchema)
    .nonempty('At least one image must be provided')
    .min(1),
})
export type ReorderProfileImagesPayload = z.infer<typeof ReorderProfileImagesPayloadSchema>

// API response schemas

export const ApiSuccessSchema = z.object({
  success: z.boolean(),
})

export const ProfileImagesResponseSchema = z.object({
  images: z.array(OwnerProfileImageSchema).default([]),
})

export const ImageApiResponseSchema = ApiSuccessSchema.merge(ProfileImagesResponseSchema)
export type ImageApiResponse = z.infer<typeof ImageApiResponseSchema>

export type ProfileImagesResponse = z.infer<typeof ProfileImagesResponseSchema>

// XXX this dooesn't work with the present multipart setup
// without the `attachFieldsToBody: true` option,
// the file is not attached to the body. Leaving this here for now but it's unused
// export const UploadImageSchema = z.object({
//   file: z.instanceof(File).refine(
//     (file) => {
//       // Check file size (max 5MB)
//       const maxSize = 5 * 1024 * 1024; // 5MB
//       return file.size <= maxSize;
//     },
//     { message: 'File size must be less than 5MB' }
//   ).refine(
//     (file) => {
//       // Check file type
//       const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
//       return validTypes.includes(file.type);
//     },
//     { message: 'File must be JPEG, PNG, or WebP' }
//   ),
// });
