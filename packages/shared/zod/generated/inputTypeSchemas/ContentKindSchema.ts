import { z } from 'zod';

export const ContentKindSchema = z.enum(['post','event','community']);

export type ContentKindType = `${z.infer<typeof ContentKindSchema>}`

export default ContentKindSchema;
