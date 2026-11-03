import { z } from 'zod';

/////////////////////////////////////////
// IMAGE SCHEMA
/////////////////////////////////////////

export const ImageSchema = z.object({
  id: z.cuid(),
  ownerProfileId: z.string(),
  storagePath: z.string(),
  mimeType: z.string(),
  width: z.number().int().nullable(),
  height: z.number().int().nullable(),
  contentHash: z.string().nullable(),
  blurhash: z.string().nullable(),
  hasFace: z.boolean(),
  isModerated: z.boolean(),
  isFlagged: z.boolean(),
  /**
   * Order within a Message's image grid. Profile and UserContent galleries order by ImageAttachment.position instead.
   */
  position: z.number().int(),
  altText: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Image = z.infer<typeof ImageSchema>

export default ImageSchema;
