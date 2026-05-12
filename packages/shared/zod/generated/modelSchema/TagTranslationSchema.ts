import { z } from 'zod';

/////////////////////////////////////////
// TAG TRANSLATION SCHEMA
/////////////////////////////////////////

export const TagTranslationSchema = z.object({
  id: z.number().int(),
  tagId: z.string(),
  locale: z.string(),
  name: z.string(),
})

export type TagTranslation = z.infer<typeof TagTranslationSchema>

export default TagTranslationSchema;
