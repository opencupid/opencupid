import { z } from 'zod';

/////////////////////////////////////////
// USER CONTENT IMAGE SCHEMA
/////////////////////////////////////////

export const UserContentImageSchema = z.object({
  imageId: z.string(),
  userContentId: z.string(),
})

export type UserContentImage = z.infer<typeof UserContentImageSchema>

export default UserContentImageSchema;
