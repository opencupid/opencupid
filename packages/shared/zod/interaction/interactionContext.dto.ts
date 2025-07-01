import z from "zod"

export const InteractionContextSchema = z.object({
  likedByMe: z.boolean().default(false),
  isMatch: z.boolean().default(false),
  passedByMe: z.boolean().default(false),
  canLike: z.boolean().default(false),
  canPass: z.boolean().default(false),
})

export type InteractionContext = z.infer<typeof InteractionContextSchema>

