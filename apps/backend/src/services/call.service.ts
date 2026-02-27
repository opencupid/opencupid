import { Prisma, Message } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export class CallService {
  private static instance: CallService

  private constructor() {}

  public static getInstance(): CallService {
    if (!CallService.instance) {
      CallService.instance = new CallService()
    }
    return CallService.instance
  }

  async initiateCall(
    tx: Prisma.TransactionClient,
    conversationId: string,
    callerProfileId: string
  ) {
    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: { include: { profile: true } } },
    })

    if (!conversation) throw { error: 'Conversation not found', code: 'NOT_FOUND' }
    if (conversation.status !== 'ACCEPTED')
      throw { error: 'Conversation is not accepted', code: 'CONVERSATION_NOT_ACCEPTED' }

    const callerParticipant = conversation.participants.find((p) => p.profileId === callerProfileId)
    if (!callerParticipant)
      throw { error: 'Not a participant in this conversation', code: 'NOT_PARTICIPANT' }

    const calleeParticipant = conversation.participants.find((p) => p.profileId !== callerProfileId)
    if (!calleeParticipant) throw { error: 'Partner not found', code: 'PARTNER_NOT_FOUND' }

    if (!calleeParticipant.isCallable || !calleeParticipant.profile.isCallable)
      throw { error: 'Partner is not callable', code: 'NOT_CALLABLE' }

    const roomName = crypto.randomUUID()

    await tx.conversation.update({
      where: { id: conversationId },
      data: { jitsiRoomId: roomName },
    })

    return {
      roomName,
      calleeProfileId: calleeParticipant.profileId,
      callerPublicName: callerParticipant.profile.publicName,
    }
  }

  async insertMissedCallMessage(
    tx: Prisma.TransactionClient,
    conversationId: string,
    callerProfileId: string
  ): Promise<{ message: Message; isDuplicate: boolean }> {
    // Dedup: check for recent missed call message within 30 seconds
    const thirtySecondsAgo = new Date(Date.now() - 30000)
    const existing = await tx.message.findFirst({
      where: {
        conversationId,
        senderId: callerProfileId,
        messageType: 'call/missed',
        createdAt: { gte: thirtySecondsAgo },
      },
    })
    if (existing) return { message: existing, isDuplicate: true }

    const message = await tx.message.create({
      data: {
        conversationId,
        senderId: callerProfileId,
        content: 'Missed call',
        messageType: 'call/missed',
      },
    })
    return { message, isDuplicate: false }
  }

  async updateCallableStatus(conversationId: string, profileId: string, isCallable: boolean) {
    return await prisma.conversationParticipant.update({
      where: {
        profileId_conversationId: { profileId, conversationId },
      },
      data: { isCallable },
    })
  }
}
