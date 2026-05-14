import { z } from 'zod';

/////////////////////////////////////////
// USER CONTENT IMAGE SCHEMA
/////////////////////////////////////////

export const UserContentImageSchema = z.object({
  id: z.cuid(),
  imageId: z.string(),
  userContentId: z.string(),
})

export type UserContentImage = z.infer<typeof UserContentImageSchema>

export default UserContentImageSchema;
