import z from "zod"

export const DatingContextSchema = z.object({
  likedByMe: z.boolean().default(false),
  isMatch: z.boolean().default(false),
  passedByMe: z.boolean().default(false),
  canLike: z.boolean().default(false),
  canPass: z.boolean().default(false),
  canDate: z.boolean().default(false),
})

export type DatingContext = z.infer<typeof DatingContextSchema>

export const ConversationContextSchema = z.object({
  haveConversation: z.boolean().default(false),
  canMessage: z.boolean().default(false),
  conversationId: z.string().nullable().default(null),
  initiated: z.boolean().default(false),
})
export type ConversationContext = z.infer<typeof ConversationContextSchema>

export const InteractionContextSchema = ConversationContextSchema.merge(DatingContextSchema)

export type InteractionContext = z.infer<typeof InteractionContextSchema>

