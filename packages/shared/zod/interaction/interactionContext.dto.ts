import z from 'zod'

// Dating interaction state between the viewer and a target profile.
// See mapDatingContext() in interaction.mappers.ts for the mapping logic.
export const DatingContextSchema = z.object({
  likedByMe: z.boolean().default(false), // did I (viewer) like this profile?
  isAnonymous: z.boolean().default(true), // is MY like anonymous? (defaults true = safe)
  likedMeRevealed: z.boolean().default(false), // did they like me non-anonymously? (anon likes stay hidden)
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
