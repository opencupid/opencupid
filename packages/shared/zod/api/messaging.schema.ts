import { Prisma } from '@prisma/client'
import { z } from "zod"
import { ProfileSummarySchema } from "./profile.schema"
import { ConversationParticipantSchema, MessageSchema } from "./generated"


export const ConversationSchema = z.object({
  id: z.string(),
  startedById: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
})


const conversationParticipantFields = {
  id: true,
  profileId: true,
  conversationId: true,
  lastReadAt: true,
  isMuted: true,
  isArchived: true,
} as const


export const ConversationSummarySchema = ConversationParticipantSchema.pick({
  id: true,
  profileId: true,
  conversationId: true,
  lastReadAt: true,
  isMuted: true,
  isArchived: true,
}).extend({
  conversation: ConversationSchema.pick({
    id: true,
    updatedAt: true,
    createdAt: true,
  }),
  partnerProfile: ProfileSummarySchema,
  unreadCount: z.number(),
})

export type ConversationSummary = z.infer<typeof ConversationSummarySchema>

export const MessageInConversationSchema = MessageSchema.pick({
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  createdAt: true
}).extend({
  isMine: z.boolean().optional(),
})

export type MessageInConversation = z.infer<typeof MessageInConversationSchema>

export type ConversationParticipantWithConversationSummary =
  Prisma.ConversationParticipantGetPayload<{
    include: {
      conversation: {
        include: {
          participants: {
            include: {
              profile: {
                include: {
                  profileImages: {
                    where: { position: number }
                  }
                }
              }
            }
          }
        }
      }
    }
  }>

export type ConversationParticipantWithExtras = ConversationParticipantWithConversationSummary & {
  unreadCount: number
}
