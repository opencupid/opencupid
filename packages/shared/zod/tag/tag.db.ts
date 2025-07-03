import { TagSchema } from "@zod/generated";
import z from "zod";


export const TagWithTranslationsSchema = TagSchema.extend({
  translations: z.array(
    z.object({
      name: z.string(),
      locale: z.string(),
    })
  ),
})

export type TagWithTranslations = z.infer<typeof TagWithTranslationsSchema>


