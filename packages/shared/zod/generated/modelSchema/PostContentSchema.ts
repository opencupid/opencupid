import { z } from 'zod';
import { PostTypeSchema } from '../inputTypeSchemas/PostTypeSchema'

/////////////////////////////////////////
// POST CONTENT SCHEMA
/////////////////////////////////////////

export const PostContentSchema = z.object({
  type: PostTypeSchema,
  userContentId: z.string(),
})

export type PostContent = z.infer<typeof PostContentSchema>

export default PostContentSchema;
