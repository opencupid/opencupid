import { z } from 'zod';

/////////////////////////////////////////
// IMAGE ATTACHMENT SCHEMA
/////////////////////////////////////////

/**
 * Membership of an Image in a Profile or UserContent gallery. Exactly one of
 * profileId / userContentId is set (CHECK constraint in the migration), and the
 * imageId primary key makes "an image is in at most one gallery" a DB invariant.
 * position is drawn from a sequence: new rows always sort last and never
 * collide; the lowest position in a gallery is its primary image. Positions are
 * sparse — API DTOs expose the sorted index instead.
 */
export const ImageAttachmentSchema = z.object({
  imageId: z.string(),
  profileId: z.string().nullable(),
  userContentId: z.string().nullable(),
  position: z.number().int(),
})

export type ImageAttachment = z.infer<typeof ImageAttachmentSchema>

export default ImageAttachmentSchema;
