import { z } from 'zod'

export const ConversationContextSchema = z.object({
  haveConversation: z.boolean(),
  canMessage: z.boolean(),
  conversationId: z.string().nullable(),
  initiated: z.boolean().default(false),
})

export type ConversationContext = z.infer<typeof ConversationContextSchema>