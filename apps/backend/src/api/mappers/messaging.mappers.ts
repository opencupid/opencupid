import type {
  ConversationParticipantWithConversationSummary,
  ConversationSummary,
  MessageAttachmentDTO,
  MessageDTO,
} from '@zod/messaging/messaging.dto'
import { mapProfileSummary } from './profile.mappers'
import {
  canSendMessageInConversation,
  type MessageWithSendInclude,
} from '../../services/messaging.service'
import { appConfig } from '@/lib/appconfig'
import { signUrl } from '../../lib/media'

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
  return p.conversation.participants.find((p) => p.profileId === senderProfileId)?.profile
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

export function mapMessageDTO(
  m: MessageWithSendInclude,
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
    attachment: m.attachment ? mapAttachmentDTO(m.attachment) : null,
    sender: mapProfileSummary(sender!),
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
  // Voice messages are served by the backend media route (JWT-authenticated),
  // not through the HMAC-signed image path
  const isVoice = dbAttachment.filePath.startsWith('voice/')
  const url = isVoice
    ? `${appConfig.API_BASE_URL}/media/${dbAttachment.filePath}`
    : signUrl(`${appConfig.IMAGE_URL_BASE}/${dbAttachment.filePath}`)
  return {
    id: dbAttachment.id,
    url,
    mimeType: dbAttachment.mimeType,
    fileSize: dbAttachment.fileSize,
    duration: dbAttachment.duration,
    createdAt: dbAttachment.createdAt,
  }
}

export function mapMessageForMessageList(
  m: {
    id: string
    conversationId: string
    senderId: string
    content: string
    messageType: string
    createdAt: Date
    sender: { id: string; publicName: string; profileImages: any[] }
    attachment: {
      id: string
      filePath: string
      mimeType: string
      fileSize: number | null
      duration: number | null
      createdAt: Date
    } | null
  },
  profileId: string
): MessageDTO {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    messageType: m.messageType,
    createdAt: m.createdAt,
    sender: mapProfileSummary(m.sender),
    attachment: m.attachment ? mapAttachmentDTO(m.attachment) : null,
    isMine: m.senderId === profileId,
  }
}
