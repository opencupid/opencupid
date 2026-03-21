import type {
  ConversationParticipantWithConversationSummary,
  ConversationSummary,
  MessageAttachmentDTO,
  MessageDTO,
} from '@zod/messaging/messaging.dto'
import type { Conversation } from '@prisma/client'
import { mapProfileSummary } from './profile.mappers'
import {
  canSendMessageInConversation,
  type MessageWithSender,
} from '../../services/messaging.service'
import { mediaUrl } from '../../lib/media'

function mapConversationMeta(c: {
  id: string
  updatedAt: Date
  createdAt: Date
  status: Conversation['status']
}) {
  return {
    id: c.id,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
    status: c.status,
  }
}

/**
 * Maps a conversation participant row to a ConversationSummary DTO.
 *
 * When a partner's account is closed, their Profile (and ConversationParticipant)
 * is cascade-deleted while the Conversation is ARCHIVED with nullable FKs (SetNull).
 * In that case `partner` is undefined and we return a tombstone placeholder so the
 * API never throws — the frontend renders the closed-account state via issue #1192.
 */
export function mapConversationParticipantToSummary(
  p: ConversationParticipantWithConversationSummary,
  currentProfileId: string
): ConversationSummary {
  const partner = p.conversation.participants.find((cp) => cp.profileId !== currentProfileId)

  const lastMessage = p.conversation.messages[0] ?? null

  const canReply = canSendMessageInConversation(p.conversation, currentProfileId)
  const myParticipant = p.conversation.participants.find((cp) => cp.profileId === currentProfileId)
  const myIsCallable = myParticipant?.isCallable !== false

  let partnerProfile: ConversationSummary['partnerProfile']
  let isCallable: boolean
  if (partner) {
    partnerProfile = mapProfileSummary(partner.profile)
    isCallable = partner.isCallable !== false && partner.profile.isCallable !== false
  } else {
    // Tombstone: partner's account was closed — empty placeholder for frontend to handle
    partnerProfile = { id: '', publicName: '', profileImages: [] }
    isCallable = false
  }
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
    partnerProfile,
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
