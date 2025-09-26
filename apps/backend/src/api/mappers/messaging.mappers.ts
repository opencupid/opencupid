import type { Prisma } from '@prisma/client';
import type {
  ConversationParticipantWithConversationSummary,
  ConversationSummary,
  DbMessageInConversation,
  MessageAttachmentDTO,
  MessageDTO,
  MessageInConversation,
} from '@zod/messaging/messaging.dto';
import { mapProfileSummary } from './profile.mappers';
import { canSendMessageInConversation } from '../../services/messaging.service';
import { appConfig } from '@/lib/appconfig'
import { signUrl } from '../../lib/media';

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

  const canReply = canSendMessageInConversation(p.conversation, currentProfileId)
  return {
    id: p.id,
    profileId: p.profileId,
    conversationId: p.conversationId,
    lastReadAt: p.lastReadAt,
    isMuted: p.isMuted,
    isArchived: p.isArchived,
    canReply,
    lastMessage: lastMessage ? {
      content: lastMessage.content,
      createdAt: lastMessage.createdAt,
      messageType: lastMessage.messageType,
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
    messageType: m.messageType,
    createdAt: m.createdAt,
    sender: mapProfileSummary(sender!)
  }
}

export function mapAttachmentDTO(dbAttachment: { filePath: string }): MessageAttachmentDTO {
  const urlBase = appConfig.IMAGE_URL_BASE
  const { filePath, ...rest } = dbAttachment
  const a = {
    url: signUrl(`${urlBase}/${filePath}`),
    ...rest,
  }
  return a
}

export function mapMessageForMessageList(
  m: DbMessageInConversation, profileId: string
): MessageDTO {
  console.error('Mapping message for list:', m.senderId, profileId)
  const { attachment, ...msg } = m
  return {
    attachment: attachment ? mapAttachmentDTO(attachment) : null,
    isMine: m.senderId === profileId,
    ...msg,
  }
}

