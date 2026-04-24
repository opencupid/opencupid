import type {
  ConversationSummary,
  MessageAttachmentDTO,
  MessageDTO,
  MessagingProfileRef,
} from '@zod/messaging/messaging.dto'
import {
  canSendMessageInConversation,
  type ConversationParticipantWithSummary,
  type MessageWithSender,
} from '../../services/messaging.service'
import { mediaUrl } from '../../lib/media'
import { imageBasePath } from '../../lib/media'

function mapConversationMeta(c: { id: string; updatedAt: Date; createdAt: Date }) {
  return {
    id: c.id,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
  }
}

// Build the thumb variant URL server-side from the first (position-0) image.
// The `thumb` variant is the 128×128 WebP produced by ImageService.
function buildThumbnail(
  profileImages: { storagePath: string }[]
): MessagingProfileRef['thumbnail'] {
  const first = profileImages[0]
  if (!first) return null
  return { url: mediaUrl(`${imageBasePath(first.storagePath)}-thumb.webp`) }
}

export function mapMessagingProfileRef(profile: {
  id: string
  publicName: string
  profileImages: { storagePath: string }[]
}): MessagingProfileRef {
  return {
    id: profile.id,
    publicName: profile.publicName,
    thumbnail: buildThumbnail(profile.profileImages),
  }
}

export function mapConversationParticipantToSummary(
  p: ConversationParticipantWithSummary,
  currentProfileId: string
): ConversationSummary {
  const partner = p.conversation.participants.find((cp) => cp.profileId !== currentProfileId)

  if (!partner) throw new Error('Partner profile not found in conversation')

  const lastMessage = p.conversation.messages[0] ?? null

  const canReply = canSendMessageInConversation(p.conversation, currentProfileId)
  const myParticipant = p.conversation.participants.find((cp) => cp.profileId === currentProfileId)
  const isCallable = partner.isCallable !== false && partner.profile.isCallable !== false
  const myIsCallable = myParticipant?.isCallable !== false
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
    partnerProfile: mapMessagingProfileRef(partner.profile),
  }
}

export function mapMessageToDTO(m: MessageWithSender, currentProfileId: string): MessageDTO {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    messageType: m.messageType,
    createdAt: m.createdAt,
    sender: mapMessagingProfileRef(m.sender),
    attachment: m.attachment ? mapAttachmentDTO(m.attachment) : null,
    isMine: m.senderId === currentProfileId,
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
