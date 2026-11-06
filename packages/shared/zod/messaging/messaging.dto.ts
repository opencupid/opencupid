import { z } from 'zod'
import { ProfileSummarySchema } from '../profile/profile.dto'
import {
  ConversationParticipantSchema,
  ConversationSchema,
  ImageSchema,
  MessageSchema,
  MessageAttachmentSchema,
} from '../generated'
import { PublicImageSchema } from '../image/image.dto'
import { Prisma } from '@prisma/client'

const conversationParticipantFields = {
  id: true,
  profileId: true,
  conversationId: true,
  lastReadAt: true,
  isMuted: true,
  isArchived: true,
} as const

// Message attachment DB shape
const DbMessageAttachmentDTOSchema = MessageAttachmentSchema.pick({
  id: true,
  mimeType: true,
  fileSize: true,
  duration: true,
  createdAt: true,
  filePath: true,
})

export type DbMessageAttachmentDTO = z.infer<typeof DbMessageAttachmentDTOSchema>

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

// DB-layer shape of a MessageImage join: caller must include `{ image: true }`.
const DbMessageImageSchema = z.object({
  image: ImageSchema,
})
export type DbMessageImage = z.infer<typeof DbMessageImageSchema>

// Messaging-only profile reference. Trimmed projection of ProfileSummary used
// wherever a conversation/message payload carries a "who is this profile"
// pointer. Drops `location` (never read in messaging UI) and is intended to
// carry at most one PublicImage (the thumbnail used by message bubbles, the
// inbox list, and the new-message toast). Issue #1369.
export const MessageProfileRefSchema = z.object({
  id: z.string(),
  publicName: z.string(),
  profileImages: z.array(PublicImageSchema).max(1),
})
export type MessageProfileRef = z.infer<typeof MessageProfileRefSchema>

// this is used in the db layer
const DbMessageInConversationSchema = MessageSchema.pick({
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  messageType: true,
  createdAt: true,
}).extend({
  sender: ProfileSummarySchema,
  attachment: DbMessageAttachmentDTOSchema.nullable().optional(),
  images: z.array(DbMessageImageSchema).default([]),
})
export type DbMessageInConversation = z.infer<typeof DbMessageInConversationSchema>

// this is used in the db layer
const MessageInConversationSchema = MessageSchema.pick({
  id: true,
  conversationId: true,
  senderId: true,
  content: true,
  messageType: true,
  createdAt: true,
}).extend({
  sender: MessageProfileRefSchema,
  attachment: MessageAttachmentDTOSchema.nullable().optional(),
  images: z.array(PublicImageSchema).default([]),
})
export type MessageInConversation = z.infer<typeof MessageInConversationSchema>

// this is used in the dto layer
const MessageDTOSchema = MessageInConversationSchema.extend({
  sender: MessageProfileRefSchema,
  isMine: z.boolean().optional(),
  attachment: MessageAttachmentDTOSchema.nullable().optional(),
  images: z.array(PublicImageSchema).default([]),
})
export type MessageDTO = z.infer<typeof MessageDTOSchema>

const MessageInConversationSummarySchema = MessageSchema.pick({
  content: true,
  messageType: true,
  createdAt: true,
}).extend({
  isMine: z.boolean().optional(),
})

export const ConversationSummarySchema = ConversationParticipantSchema.pick({
  id: true,
  profileId: true,
  conversationId: true,
  lastReadAt: true,
  isMuted: true,
  isArchived: true,
}).extend({
  isDraft: z.literal(false).default(false),
  conversation: ConversationSchema.pick({
    id: true,
    updatedAt: true,
    createdAt: true,
  }),
  canReply: z.boolean().default(false),
  isAdminInitiator: z.boolean().default(false),
  isCallable: z.boolean().default(true),
  myIsCallable: z.boolean().default(true),
  partnerProfile: MessageProfileRefSchema,
  lastMessage: MessageInConversationSummarySchema.nullable(),
})

export type ConversationSummary = z.infer<typeof ConversationSummarySchema>

// Draft conversation — no DB row yet. Used for the "matched but not messaged"
// state where the UI still needs to render a conversation-detail view. Sending
// the first message persists the conversation and replaces this with a
// ConversationSummary.
export const ConversationDraftSummarySchema = z.object({
  isDraft: z.literal(true),
  partnerProfile: MessageProfileRefSchema,
  canReply: z.boolean(),
  isCallable: z.boolean(),
  myIsCallable: z.boolean(),
})

export type ConversationDraftSummary = z.infer<typeof ConversationDraftSummarySchema>

export const ConversationOrDraftSchema = z.discriminatedUnion('isDraft', [
  ConversationSummarySchema,
  ConversationDraftSummarySchema,
])

export type ConversationOrDraft = z.infer<typeof ConversationOrDraftSchema>

export type ConversationParticipantWithConversationSummary =
  Prisma.ConversationParticipantGetPayload<{
    include: {
      conversation: {
        include: {
          profileA: { include: { profileImages: { include: { image: true } } } }
          profileB: { include: { profileImages: { include: { image: true } } } }
          participants: {
            select: {
              profileId: true
              isCallable: true
              isMuted: true
              isArchived: true
              lastReadAt: true
            }
          }
          messages: {
            take: 1
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      }
    }
  }>

// Maximum images attachable to a single message. Tighter than
// MAX_IMAGES_PER_GALLERY (6) so message bubbles stay renderable as a small grid
// and the WS payload stays bounded.
export const MAX_IMAGES_PER_MESSAGE = 4

export const SendMessagePayloadSchema = z
  .object({
    profileId: z.string().cuid(),
    content: z.string().default(''),
    imageIds: z.array(z.string().cuid()).max(MAX_IMAGES_PER_MESSAGE).optional(),
  })
  .refine((b) => b.content.trim().length > 0 || (b.imageIds && b.imageIds.length > 0), {
    message: 'Message must have content or at least one image',
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

// export type ConversationParticipantWithExtras = ConversationParticipantWithConversationSummary & {
//   unreadCount: number,
// }
