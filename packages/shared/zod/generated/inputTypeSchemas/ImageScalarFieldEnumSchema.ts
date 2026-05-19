import { z } from 'zod'

export const ImageScalarFieldEnumSchema = z.enum([
  'id',
  'ownerProfileId',
  'storagePath',
  'mimeType',
  'width',
  'height',
  'contentHash',
  'blurhash',
  'hasFace',
  'isModerated',
  'isFlagged',
  'position',
  'altText',
  'createdAt',
  'updatedAt',
])

export default ImageScalarFieldEnumSchema
