import type { FastifyInstance } from 'fastify'
import type { IncomingMessageDTO, MessageDTO } from '@zod/messaging/messaging.dto'
import { MessageService } from './messaging.service'
import { broadcastToProfile } from '@/utils/wsUtils'

/**
 * Sends a new message to a participant's open sessions, along with whether that
 * participant has archived (muted) the conversation. Sessions must not decide
 * this from their own copy: it can be stale or not loaded.
 */
export async function broadcastNewMessage(
  fastify: FastifyInstance,
  profileId: string,
  message: MessageDTO
): Promise<{ isDelivered: boolean; isArchived: boolean }> {
  const isArchived = await MessageService.getInstance().isConversationArchived(
    message.conversationId,
    profileId
  )
  const payload: IncomingMessageDTO = { ...message, isArchived }
  const isDelivered = broadcastToProfile(fastify, profileId, { type: 'ws:new_message', payload })
  return { isDelivered, isArchived }
}
