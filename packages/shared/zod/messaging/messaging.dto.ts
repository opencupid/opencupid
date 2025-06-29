import { z } from 'zod'
import { ProfileSummarySchema } from '../profile/profile.dto'
import { ConversationParticipantSchema, ConversationSchema, MessageSchema } from '../generated'
import { Prisma } from '@prisma/client'

const conversationParticipantFields = {
  id: true,
  profileId: true,
  conversationId: true,
  lastReadAt: true,
  isMuted: true,
  isArchived: true,
} as const

// this is used in the db layer
const MessageInConversationSchema = MessageSchema.pick({
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  createdAt: true,
}).extend({
  sender: ProfileSummarySchema,
})
export type MessageInConversation = z.infer<typeof MessageInConversationSchema>

// this is used in the dto layer
const MessageDTOSchema = MessageInConversationSchema.extend({
  sender: ProfileSummarySchema,
  isMine: z.boolean().optional(),
})
export type MessageDTO = z.infer<typeof MessageDTOSchema>


const MessageInConversationSummarySchema = MessageSchema.pick({
  content: true,
  createdAt: true,
}).extend({
  isMine: z.boolean().optional(),
})


const ConversationSummarySchema = ConversationParticipantSchema.pick({
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
  lastMessage: MessageInConversationSummarySchema.nullable(),
})

export type ConversationSummary = z.infer<typeof ConversationSummarySchema>


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
          },
          messages: {
            take: 1,
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      }
    }
  }>


export const SendMessagePayloadSchema = z.object({
  profileId: z.string().cuid(),
  content: z.string().min(1),
})

export type SendMessagePayload = z.infer<typeof SendMessagePayloadSchema>


// export type ConversationParticipantWithExtras = ConversationParticipantWithConversationSummary & {
//   unreadCount: number,
// }
