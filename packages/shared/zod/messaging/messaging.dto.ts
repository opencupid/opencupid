import { z } from 'zod'
import {
  ConversationParticipantSchema,
  ConversationSchema,
  MessageSchema,
  MessageAttachmentSchema,
} from '../generated'

// Message attachment DTO
const MessageAttachmentDTOSchema = MessageAttachmentSchema.pick({
  id: true,
  mimeType: true,
  fileSize: true,
  duration: true,
  createdAt: true,
}).extend({
  url: z.string(),
})

export type MessageAttachmentDTO = z.infer<typeof MessageAttachmentDTOSchema>

// Messaging-owned profile-identity reference. Intentionally narrow: only what
// messaging surfaces (bubble identity, toast, inbox list) actually render.
// Do not reuse outside messaging — that is the antidote to the ProfileSummary
// over-reuse pattern.
export const MessagingProfileRefSchema = z.object({
  id: z.string(),
  publicName: z.string(),
  thumbnail: z
    .object({
      url: z.string(),
    })
    .nullable(),
})

export type MessagingProfileRef = z.infer<typeof MessagingProfileRefSchema>

const MessageDTOSchema = MessageSchema.pick({
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  messageType: true,
  createdAt: true,
}).extend({
  sender: MessagingProfileRefSchema,
  attachment: MessageAttachmentDTOSchema.nullable(),
  isMine: z.boolean(),
})
export type MessageDTO = z.infer<typeof MessageDTOSchema>

const MessageInConversationSummarySchema = MessageSchema.pick({
  content: true,
  messageType: true,
  createdAt: true,
}).extend({
  isMine: z.boolean(),
})

const ConversationSummarySchema = ConversationParticipantSchema.pick({
  id: true,
  profileId: true,
  conversationId: true,
  lastReadAt: true,
  isMuted: true,
  isArchived: true,
}).extend({
  conversation: ConversationSchema.pick({
    id: true,
    updatedAt: true,
    createdAt: true,
  }),
  canReply: z.boolean().default(false),
  isCallable: z.boolean().default(true),
  myIsCallable: z.boolean().default(true),
  partnerProfile: MessagingProfileRefSchema,
  lastMessage: MessageInConversationSummarySchema.nullable(),
})

export type ConversationSummary = z.infer<typeof ConversationSummarySchema>

// Small delta returned by the 'reply' send arm. updatedAt reflects the
// post-write value of Conversation.updatedAt (set in the same transaction as
// the message insert), used for inbox ordering.
export const ConversationPatchSchema = z.object({
  conversationId: z.string(),
  updatedAt: z.date(),
})
export type ConversationPatch = z.infer<typeof ConversationPatchSchema>

export const SendMessagePayloadSchema = z.object({
  profileId: z.string().cuid(),
  content: z.string().min(1),
})

export type SendMessagePayload = z.infer<typeof SendMessagePayloadSchema>

// Schema for voice message payload
export const SendVoiceMessagePayloadSchema = z.object({
  profileId: z.string().cuid(),
  content: z.string().default(''), // Can be empty for voice messages
  messageType: z.literal('audio/voice'),
  duration: z.number().int().min(0), // Duration in seconds; max enforced by backend config
})

export type SendVoiceMessagePayload = z.infer<typeof SendVoiceMessagePayloadSchema>

// Internal classifier output: every possible state-machine decision the route
// needs to act on, including the rejection case.
export type SendOutcome = 'new_conversation' | 'accepted_on_reply' | 'reply' | 'blocked'

// Wire-facing subset: the outcomes that accompany a successful 200 response.
// 'blocked' is never returned on success — it becomes a 403 via MessagingError
// at the route layer, so the client's SendMessageResponse.outcome can't see it.
export type SendMessageOutcome = Exclude<SendOutcome, 'blocked'>
