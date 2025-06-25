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
export class MessageService {
  private static instance: MessageService

  private constructor() { }

  public static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService()
    }
    return MessageService.instance
  }

  async getConversationSummary(conversationId: string, profileId: string): Promise<ConversationParticipantWithConversationSummary | null> {
    return await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        profileId,
      },
      include: conversationSummaryInclude,
    })
  }

  async listConversationsForProfile(profileId: string) {
    return await prisma.conversationParticipant.findMany({
      where: {
        profileId,
        OR: [
          {
            conversation: {
              status: 'ACCEPTED',
            },
          },
          {
            conversation: {
              status: 'INITIATED',
              NOT: {
                initiatorProfileId: profileId, // only show if someone else initiated
              },
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
      orderBy: {
        conversation: { updatedAt: 'desc' },
      },
    })
  }




  async _listConversationsForProfile(profileId: string) {
    return await prisma.conversationParticipant.findMany({
      where: { profileId },
      include: conversationSummaryInclude,
      orderBy: {
        conversation: { updatedAt: 'desc' },
      },
    })

    // Post-process to calculate unreadCount
    // TODO optimize this further by batching message.count()
    // using a raw SQL query if performance becomes a concern.
    // return await Promise.all(
    //   participants.map(async p => {
    //     const unreadCount = await prisma.message.count({
    //       where: {
    //         conversationId: p.conversationId,
    //         createdAt: {
    //           gt: p.lastReadAt || new Date(0),
    //         },
    //         senderId: {
    //           not: profileId, // don't count own messages
    //         },
    //       },
    //     })
    //     return {
    //       ...p,
    //       unreadCount,
    //     }
    //   })
    // )
  }

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



  // async sendMessage(profileId: string, conversationId: string, content: string) {
  //   const message = await prisma.message.create({
  //     data: {
  //       senderId: profileId,
  //       conversationId,
  //       content,
  //     },
  //   })

  //   await prisma.conversation.update({
  //     where: { id: conversationId },
  //     data: { updatedAt: new Date() },
  //   })

  //   return message
  // }



  async initiateConversation(
    senderProfileId: string,
    recipientProfileId: string,
    content: string
  ): Promise<{
    conversation: ConversationParticipantWithConversationSummary
    message: Message
  }> {
    const [profileAId, profileBId] = this.sortProfilePair(senderProfileId, recipientProfileId)

    const { conversationId, message } = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const existing = await tx.conversation.findUnique({
          where: {
            profileAId_profileBId: { profileAId, profileBId },
          },
        })

        if (existing) {
          throw new Error('Conversation already exists between these profiles')
        }

        const convo = await tx.conversation.create({
          data: {
            status: 'INITIATED', // start as initiated
            initiatorProfileId: senderProfileId, // set the initiator
            profileAId,
            profileBId,
            participants: {
              create: [{ profileId: profileAId }, { profileId: profileBId }],
            },
          },
        })

        const message = await tx.message.create({
          data: {
            conversationId: convo.id,
            senderId: senderProfileId,
            content,
          },
        })
        return { conversationId: convo.id, message }
      }
    )
    const convoSummary = await this.getConversationSummary(conversationId, senderProfileId)
    if (!convoSummary) throw new Error('Conversation not found after creation')
    return { conversation: convoSummary, message }
  }



  async replyInConversation(
    senderProfileId: string,
    conversationId: string,
    content: string
  ): Promise<{
    conversation: ConversationParticipantWithConversationSummary
    message: Message
  }> {
    // const [profileAId, profileBId] = this.sortProfilePair(senderProfileId, recipientProfileId)

    const { conversation, message } = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const conversation = await tx.conversation.findUnique({
          where: {
            id: conversationId,
          },
        })

        // If the conversation does not exist, throw an error.
        if (!conversation) {
          throw new Error('Conversation not found')
        }

        // Check if the sender is allowed to reply to this conversation.
        if (!this.canSendMessageInConversation(conversation, senderProfileId)) {
          throw new Error('Conversation is not accepted or sender cannot reply to initiated thread')
        }

        // update lastMessageAt and status
        await tx.conversation.update({
          where: {
            id: conversationId,
          },
          data: {
            updatedAt: new Date(),
            status: 'ACCEPTED' // ensure status is set to ACCEPTED
          },
        })

        const message = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId: senderProfileId,
            content,
          },
        })
        return { conversation, message }
      }
    )
    const convoSummary = await this.getConversationSummary(conversation.id, senderProfileId)
    if (!convoSummary) throw new Error('Conversation not found after creation')

    return { conversation: convoSummary, message }
  }

  // async sendOrStartConversation(
  //   senderProfileId: string,
  //   recipientProfileId: string,
  //   content: string
  // ): Promise<{
  //   conversation: ConversationParticipantWithConversationSummary | null
  //   message: Message
  // }> {
  //   const [profileAId, profileBId] = this.sortProfilePair(senderProfileId, recipientProfileId)

  //   const { conversationId, message } = await prisma.$transaction(
  //     async (tx: Prisma.TransactionClient) => {
  //       let convo = await tx.conversation.findUnique({
  //         where: {
  //           profileAId_profileBId: { profileAId, profileBId },
  //         },
  //       })

  //       if (convo) {

  //         // Check if the sender is allowed to reply to a conversation.
  //         if (!this.canSendMessageInConversation(convo, senderProfileId)) {
  //           throw new Error('Conversation is not accepted or sender cannot reply to initiated thread')
  //         }

  //         // existing conversation, update lastMessageAt
  //         await tx.conversation.update({
  //           where: {
  //             profileAId_profileBId: { profileAId, profileBId },
  //           },
  //           data: {
  //             updatedAt: new Date(),
  //             status: 'ACCEPTED' // ensure status is set to ACCEPTED
  //           },
  //         })

  //       } else {
  //         convo = await tx.conversation.create({
  //           data: {
  //             status: 'INITIATED', // start as initiated
  //             profileAId,
  //             profileBId,
  //             participants: {
  //               create: [{ profileId: profileAId }, { profileId: profileBId }],
  //             },
  //           },
  //         })
  //       }

  //       const message = await tx.message.create({
  //         data: {
  //           conversationId: convo.id,
  //           senderId: senderProfileId,
  //           content,
  //         },
  //       })
  //       return { conversationId: convo.id, message }
  //     }
  //   )
  //   const convo = await this.getConversationSummary(conversationId, senderProfileId)
  //   return { conversation: convo, message }
  // }

  /**
   * Sorts a pair of profile IDs in a consistent order.
   * @param a
   * @param b
   * @returns
   */
  sortProfilePair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a]
  }

  // Checks if the sender is allowed to reply to a conversation.
  /*
  | Condition                                | Allow?                   |
  | ---------------------------------------- | ------------------------ |
  | status = `ACCEPTED`                      | ✅ Yes                    |
  | status = `INITIATED`, sender ≠ initiator | ✅ Yes                    |
  | status = `INITIATED`, sender = initiator | ❌ No (already initiated) |
  | status = `BLOCKED` or anything else      | ❌ No                     |
  */
  canSendMessageInConversation(
    conversation: Conversation | null,
    senderProfileId: string
  ): boolean {
    if (!conversation) return true // no conversation yet → allowed to start one

    return (
      conversation.status === 'ACCEPTED' ||
      (conversation.status === 'INITIATED' && conversation.profileAId !== senderProfileId)
    )
  }
}
