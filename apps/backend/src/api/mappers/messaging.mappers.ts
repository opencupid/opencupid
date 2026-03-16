import type {
  ConversationParticipantWithConversationSummary,
  ConversationSummary,
  MessageAttachmentDTO,
  MessageDTO,
} from '@zod/messaging/messaging.dto'
import { mapProfileSummary } from './profile.mappers'
import {
  canSendMessageInConversation,
  type MessageWithSender,
} from '../../services/messaging.service'
import { mediaUrl } from '../../lib/media'

function mapConversationMeta(c: { id: string; updatedAt: Date; createdAt: Date }) {
  return {
    id: c.id,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
  }
}

export function mapConversationParticipantToSummary(
  p: ConversationParticipantWithConversationSummary,
  currentProfileId: string
): ConversationSummary {
  const partner = p.conversation.participants.find((cp) => cp.profileId !== currentProfileId)

  if (!partner) throw new Error('Partner profile not found in conversation')

  const lastMessage = p.conversation.messages[0] ?? null

  const canReply = canSendMessageInConversation(p.conversation, currentProfileId)
  const myParticipant = p.conversation.participants.find((cp) => cp.profileId === currentProfileId)
  const isCallable =
    (partner as any).isCallable !== false && (partner.profile as any).isCallable !== false
  const myIsCallable = (myParticipant as any)?.isCallable !== false
  return {
    id: p.id,
    profileId: p.profileId,
    conversationId: p.conversationId,
    lastReadAt: p.lastReadAt,
    isMuted: p.isMuted,
    isArchived: p.isArchived,
    canReply,
    isCallable,
    myIsCallable,
    lastMessage: lastMessage
      ? {
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          messageType: lastMessage.messageType,
          isMine: lastMessage.senderId === currentProfileId,
        }
      : null,
    conversation: mapConversationMeta(p.conversation),
    partnerProfile: mapProfileSummary(partner.profile),
  }
}

export function mapMessageToDTO(m: MessageWithSender, currentProfileId?: string): MessageDTO {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    messageType: m.messageType,
    createdAt: m.createdAt,
    sender: mapProfileSummary(m.sender),
    attachment: m.attachment ? mapAttachmentDTO(m.attachment) : null,
    ...(currentProfileId !== undefined && { isMine: m.senderId === currentProfileId }),
  }
}

export function mapAttachmentDTO(dbAttachment: {
  id: string
  filePath: string
  mimeType: string
  fileSize: number | null
  duration: number | null
  createdAt: Date
}): MessageAttachmentDTO {
  const url = mediaUrl(dbAttachment.filePath)
  return {
    id: dbAttachment.id,
    url,
    mimeType: dbAttachment.mimeType,
    fileSize: dbAttachment.fileSize,
    duration: dbAttachment.duration,
    createdAt: dbAttachment.createdAt,
  }
}
