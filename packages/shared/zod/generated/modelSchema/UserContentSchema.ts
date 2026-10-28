import { z } from 'zod';
import { ContentKindSchema } from '../inputTypeSchemas/ContentKindSchema'

/////////////////////////////////////////
// USER CONTENT SCHEMA
/////////////////////////////////////////

export const UserContentSchema = z.object({
  kind: ContentKindSchema,
  id: z.cuid(),
  postedById: z.string(),
  content: z.string(),
  isDeleted: z.boolean(),
  isVisible: z.boolean(),
  country: z.string().nullable(),
  cityName: z.string().nullable(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
  /**
   * Origin of content imported from an external feed (e.g. "parasztsuli"); null for member-created content.
   */
  externalSource: z.string().nullable(),
  /**
   * The item's id at `externalSource`.
   */
  externalId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type UserContent = z.infer<typeof UserContentSchema>

export default UserContentSchema;
