import type {
  ConversationParticipantWithConversationSummary,
  ConversationSummary,
  MessageAttachmentDTO,
  MessageDTO,
} from '@zod/messaging/messaging.dto'
import { mapProfileSummary } from './profile.mappers'
import { DbLocationToLocationDTO } from './location.mappers'
import {
  canSendMessageInConversation,
  type MessageWithSender,
} from '../../services/messaging.service'
import { mediaUrl } from '../../lib/media'
import { appConfig } from '../../lib/appconfig'

function mapConversationMeta(c: { id: string; updatedAt: Date; createdAt: Date }) {
  return {
    id: c.id,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
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
  const { conversation } = p
  // Partner identity comes from the pair fields on Conversation, not from the
  // participants list — PENDING conversations have only the sender as a
  // participant, but profileA/profileB are always populated.
  const partner =
    conversation.profileAId === currentProfileId ? conversation.profileB : conversation.profileA
  const partnerState = partner
    ? conversation.participants.find((s) => s.profileId === partner.id)
    : undefined
  const myState = conversation.participants.find((s) => s.profileId === currentProfileId)

  const lastMessage = conversation.messages[0] ?? null
  const canReply = canSendMessageInConversation(conversation, currentProfileId)
  // Truthiness guard: if ADMIN_PROFILE_ID is unset, undefined === undefined would
  // mark every conversation as admin-initiated. Comparing only when the id is
  // configured matches the rest of the codebase's "no admin id, no admin behavior"
  // contract (see messaging.service.sendWelcomeMessage).
  const adminId = appConfig.ADMIN_PROFILE_ID
  const isAdminInitiator = !!adminId && conversation.initiatorProfileId === adminId

  // Tombstone: partner's account was closed — empty placeholder for frontend to handle
  const partnerProfile = partner
    ? mapProfileSummary(partner)
    : ({
        id: '',
        publicName: '',
        profileImages: [],
        location: DbLocationToLocationDTO({
          country: null,
          cityName: null,
          lat: null,
          lon: null,
        }),
      } as ConversationSummary['partnerProfile'])
  const isCallable = !!partner && partnerState?.isCallable !== false && partner.isCallable !== false

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
    isCallable,
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
