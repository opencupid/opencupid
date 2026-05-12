import { z } from 'zod';

export const PostTypeSchema = z.enum(['OFFER','REQUEST']);

export type PostTypeType = `${z.infer<typeof PostTypeSchema>}`

export default PostTypeSchema;
