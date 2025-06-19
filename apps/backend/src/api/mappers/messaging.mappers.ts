import type { Prisma } from '@prisma/client';
import type {
  ConversationParticipantWithConversationSummary,
  ConversationSummary,
  MessageDTO,
  MessageInConversation,
} from '@zod/messaging/messaging.dto';
import { mapProfileSummary } from './profile.mappers';

function mapConversationMeta(c: { id: string; updatedAt: Date; createdAt: Date }) {
  return {
    id: c.id,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
  }
}

export function extractSenderProfile(
  p: ConversationParticipantWithConversationSummary,
  senderProfileId: string
) {
  return p.conversation.participants.find(p => p.profileId === senderProfileId)?.profile
}

export function mapConversationParticipantToSummary(
  p: ConversationParticipantWithConversationSummary,
  currentProfileId: string
): ConversationSummary {
  const partner = p.conversation.participants.find(cp => cp.profileId !== currentProfileId)

  if (!partner) throw new Error('Partner profile not found in conversation')

  const lastMessage = p.conversation.messages[0] ?? null

  return {
    id: p.id,
    profileId: p.profileId,
    conversationId: p.conversationId,
    lastReadAt: p.lastReadAt,
    isMuted: p.isMuted,
    isArchived: p.isArchived,
    lastMessage: lastMessage ? {
      content: lastMessage.content,
      createdAt: lastMessage.createdAt,
      isMine: lastMessage.senderId === currentProfileId,
    } : null,
    conversation: mapConversationMeta(p.conversation),
    partnerProfile: mapProfileSummary(partner.profile),
  }
}

export function mapMessageDTO(
  m: Prisma.MessageGetPayload<{}>,
  p: ConversationParticipantWithConversationSummary
): MessageDTO {
  const sender = extractSenderProfile(p, m.senderId)
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    createdAt: m.createdAt,
    sender: mapProfileSummary(sender!)
  }
}

export function mapMessageForMessageList(
  m: MessageInConversation, profileId: string
): MessageDTO {
console.error('Mapping message for list:', m.senderId , profileId)
  return {
    ...m,
    isMine: m.senderId === profileId,
  }
}

