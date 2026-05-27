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
import { appConfig } from '../../lib/appconfig'
import { toPublicImage } from './image.mappers'

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
  const { conversation } = p
  // Partner identity comes from the pair fields on Conversation, not from the
  // participants list — PENDING conversations have only the sender as a
  // participant, but profileA/profileB are always populated.
  const partner =
    conversation.profileAId === currentProfileId ? conversation.profileB : conversation.profileA
  const partnerState = conversation.participants.find((s) => s.profileId === partner.id)
  const myState = conversation.participants.find((s) => s.profileId === currentProfileId)

  const lastMessage = conversation.messages[0] ?? null
  const canReply = canSendMessageInConversation(conversation, currentProfileId)
  // Truthiness guard: if ADMIN_PROFILE_ID is unset, undefined === undefined would
  // mark every conversation as admin-initiated. Comparing only when the id is
  // configured matches the rest of the codebase's "no admin id, no admin behavior"
  // contract (see messaging.service.sendWelcomeMessage).
  const adminId = appConfig.ADMIN_PROFILE_ID
  const isAdminInitiator = !!adminId && conversation.initiatorProfileId === adminId

  return {
    id: p.id,
    profileId: p.profileId,
    conversationId: p.conversationId,
    lastReadAt: p.lastReadAt,
    isMuted: p.isMuted,
    isArchived: p.isArchived,
    isDraft: false,
    canReply,
    isAdminInitiator,
    isCallable: partnerState?.isCallable !== false && partner.isCallable !== false,
    myIsCallable: myState?.isCallable !== false,
    lastMessage: lastMessage
      ? {
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
          messageType: lastMessage.messageType,
          isMine: lastMessage.senderId === currentProfileId,
        }
      : null,
    conversation: mapConversationMeta(conversation),
    partnerProfile: mapProfileSummary(partner),
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
    images: m.images.map((j) => toPublicImage(j.image)),
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
