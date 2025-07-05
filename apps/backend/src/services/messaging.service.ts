import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type {
  ConversationParticipantWithConversationSummary,
  MessageInConversation,
} from '@zod/messaging/messaging.dto'
import { Conversation, Message } from '@zod/generated'
import { blocklistWhereClause } from '@/db/includes/blocklistWhereClause'

const conversationSummaryInclude = {
  conversation: {
    include: {
      participants: {
        include: {
          profile: {
            include: {
              profileImages: true,
            },
          },
        },
      },
      messages: {
        take: 1,
        orderBy: {
          createdAt: 'desc' as const, // Ensure correct type for orderBy
        },
      },
    },
  },
}

const sendInclude = {
  sender: {
    select: {
      id: true,
      publicName: true,
      profileImages: {
        orderBy: { position: 'asc' },
      },
    },
  },
} satisfies Prisma.MessageInclude

export class MessageService {
  private static instance: MessageService

  private constructor() { }

  public static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService()
    }
    return MessageService.instance
  }

  /**
   * Retrieves a conversation summary for a given conversation and profile.
   * @param conversationId - The ID of the conversation to retrieve.
   * @param profileId - The ID of the profile to retrieve the summary for.
   * @returns A conversation participant with its summary or null if not found.
   */
  async getConversationSummary(conversationId: string, profileId: string): Promise<ConversationParticipantWithConversationSummary | null> {
    return await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        profileId,
      },
      include: conversationSummaryInclude,
    })
  }

  /**
   * Lists all conversations for a given profile, including unread message counts.
   * @param profileId - The ID of the profile to list conversations for.
   * @returns An array of conversation summaries with unread message counts.
   */
  async listConversationsForProfile(profileId: string) {
    return await prisma.conversationParticipant.findMany({
      where: {
        profileId,
        NOT: [
          {
            conversation: {
              status: 'BLOCKED', // Exclude blocked conversations
            },
          },

        ],
        conversation: {
          participants: {
            some: {
              profile: {
                id: {
                  not: profileId, // the other participant
                },
                ...blocklistWhereClause(profileId), // ensure the other did not block me and I did not block them
              },
            },
          },
        },
      },

      include: conversationSummaryInclude,
      orderBy: [
        {
          conversation: {
            status: 'desc',
          },
        },
        {
          conversation: {
            updatedAt: 'desc',
          },
        },
      ],
    })
  }


  /**
   * Lists all messages for a given conversation.
   * @param conversationId - The ID of the conversation to list messages for.
   * @returns An array of messages in the conversation, including sender profile images.
   */
  async listMessagesForConversation(conversationId: string): Promise<MessageInConversation[]> {
    return await prisma.message.findMany({
      where: {
        conversationId,
      },
      include: {
        sender: {
          include: {
            profileImages: {
              where: { position: 0 }, // Get the first image (profile picture)
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
  }

  /**
   * Marks a conversation as read 
   * @param conversationId - The ID of the conversation to mark as read.
   * @param profileId - The ID of the profile marking the conversation as read.
   * @returns The updated conversation participant record.
   */
  async markConversationRead(conversationId: string, profileId: string) {
    return prisma.conversationParticipant.update({
      where: {
        profileId_conversationId: {
          profileId, conversationId
        }
      },
      data: { lastReadAt: new Date() },
    })
  }

  /**
   * Sets conversation status to ACCEPTED when a match occurs between two profiles.
   * @param profileAId - The ID of the first profile.
   * @param profileBId - The ID of the second profile.
   * @returns The updated conversation or null if no conversation exists.
   */
  async acceptConversationOnMatch(profileAId: string, profileBId: string): Promise<Conversation | null> {
    const [sortedProfileAId, sortedProfileBId] = this.sortProfilePair(profileAId, profileBId)

    const existingConversation = await prisma.conversation.findUnique({
      where: {
        profileAId_profileBId: { profileAId: sortedProfileAId, profileBId: sortedProfileBId },
      },
    })

    if (!existingConversation) {
      return null
    }

    // Only update if conversation is currently INITIATED
    if (existingConversation.status === 'INITIATED') {
      return await prisma.conversation.update({
        where: {
          profileAId_profileBId: { profileAId: sortedProfileAId, profileBId: sortedProfileBId },
        },
        data: {
          status: 'ACCEPTED',
          updatedAt: new Date(),
        },
      })
    }

    return existingConversation
  }


  async sendOrStartConversation(
    tx: Prisma.TransactionClient,
    senderProfileId: string,
    recipientProfileId: string,
    content: string
  ): Promise<{ convoId: string; message: Message }> {

    const [profileAId, profileBId] = this.sortProfilePair(senderProfileId, recipientProfileId)

    const convo = await this.findOrCreateConversation(tx, profileAId, profileBId, senderProfileId)

    const message = await tx.message.create({
      data: {
        conversationId: convo.id,
        senderId: senderProfileId,
        content,
      },
      include: sendInclude,
    })

    return { convoId: convo.id, message }
  }


  private async findOrCreateConversation(
    tx: Prisma.TransactionClient,
    profileAId: string,
    profileBId: string,
    senderId: string
  ): Promise<Conversation> {

    const existing = await tx.conversation.findUnique({
      where: {
        profileAId_profileBId: { profileAId, profileBId },
      },
    })

    if (existing) {
      if (!canSendMessageInConversation(existing, senderId)) {
        throw {
          error: 'Conversation is not accepted or sender cannot reply to initiated thread',
          code: 'CONVERSATION_BLOCKED',
        }
      }

      // Update status & last activity
      await tx.conversation.update({
        where: {
          profileAId_profileBId: { profileAId, profileBId },
        },
        data: {
          updatedAt: new Date(),
          status: 'ACCEPTED',
        },
      })

      return existing
    }

    // No existing conversation → create a new one
    return tx.conversation.create({
      data: {
        status: 'INITIATED',
        initiatorProfileId: senderId,
        profileAId,
        profileBId,
        participants: {
          create: [
            { profileId: profileAId },
            { profileId: profileBId }
          ],
        },
      },
    })
  }



  /**
   * Sorts a pair of profile IDs in a consistent order.
   * @param a
   * @param b
   * @returns
   */
  sortProfilePair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a]
  }


}

export type SendMessageSuccessResponse = {
  conversation: ConversationParticipantWithConversationSummary
  message: MessageInConversation
}

export type SendMessageErrorResponse = {
  success: false
  error: string
}

/*
Checks if the sender is allowed to reply to a conversation.
| Condition                                | Allow?                   |
| ---------------------------------------- | ------------------------ |
| status = `ACCEPTED`                      | ✅ Yes                    |
| status = `INITIATED`, sender ≠ initiator | ✅ Yes                    |
| status = `INITIATED`, sender = initiator | ❌ No (already initiated) |
| status = `BLOCKED` or anything else      | ❌ No                     |
*/
export function canSendMessageInConversation(conversation: Conversation | null, senderProfileId: string): boolean {
  if (!conversation) return true // no conversation yet → allowed to start one

  return (
    conversation.status === 'ACCEPTED' ||
    (conversation.status === 'INITIATED' && conversation.initiatorProfileId !== senderProfileId)
  )
}