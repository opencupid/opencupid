import { z } from 'zod';

/////////////////////////////////////////
// TAG SCHEMA
/////////////////////////////////////////

export const TagSchema = z.object({
  id: z.cuid(),
  slug: z.string(),
  name: z.string(),
  /**
   * Locale the tag was originally created in
   */
  originalLocale: z.string(),
  isUserCreated: z.boolean(),
  isApproved: z.boolean(),
  isHidden: z.boolean(),
  isDeleted: z.boolean(),
  createdBy: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Tag = z.infer<typeof TagSchema>

export default TagSchema;
