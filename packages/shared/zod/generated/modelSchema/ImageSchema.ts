import { z } from 'zod';

/////////////////////////////////////////
// IMAGE SCHEMA
/////////////////////////////////////////

export const ImageSchema = z.object({
  id: z.cuid(),
  userId: z.string(),
  position: z.number().int(),
  altText: z.string(),
  storagePath: z.string(),
  url: z.string().nullable(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  mimeType: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  contentHash: z.string().nullable(),
  blurhash: z.string().nullable(),
  isModerated: z.boolean(),
  isFlagged: z.boolean(),
  hasFace: z.boolean(),
})

export type Image = z.infer<typeof ImageSchema>

export default ImageSchema;
