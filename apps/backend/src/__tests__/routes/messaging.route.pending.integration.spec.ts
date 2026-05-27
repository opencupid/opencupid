// Integration test for the quarantined-sender (PENDING) send path.
//
// The other messaging.route.spec.ts file mocks mapConversationParticipantToSummary
// to a fixed stub — useful for asserting orchestration but it bypasses the mapper
// entirely. That gap is exactly what let two production bugs ship to UAT (the
// mapper threw on single-participant PENDING conversations and the BullMQ jobId
// validation error escaped as a 500).
//
// This file deliberately runs the *real* mapper against a realistic single-
// participant ConversationParticipant payload, so any future change to mapper
// invariants or include shape that breaks the parity guarantee will fail here.

import { describe, it, expect, beforeEach, vi } from 'vitest'
import messageRoutes from '../../api/routes/messaging.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))

// Note: NO mock for ../../api/mappers/messaging.mappers — we want the real one.

let fastify: MockFastify
let reply: MockReply
let mockMessageService: any
let mockTrustService: any

vi.mock('../../services/profileTrust.service', () => ({
  ProfileTrustService: { getInstance: () => mockTrustService },
}))

vi.mock('@/queues/profileTrustQueue', () => ({
  profileTrustQueue: { add: vi.fn().mockResolvedValue({}) },
}))

vi.mock('../../services/messaging.service', () => {
  const MessagingErrorCodes = {
    CONVERSATION_BLOCKED: 'CONVERSATION_BLOCKED',
    EMPTY_MESSAGE: 'EMPTY_MESSAGE',
  } as const
  class MessagingError extends Error {
    readonly code: (typeof MessagingErrorCodes)[keyof typeof MessagingErrorCodes]
    constructor(
      code: (typeof MessagingErrorCodes)[keyof typeof MessagingErrorCodes],
      message: string
    ) {
      super(message)
      this.name = 'MessagingError'
      this.code = code
    }
  }
  return {
    MessageService: { getInstance: () => mockMessageService },
    cleanMessageForNotification: vi.fn((msg: string) => msg),
    canSendMessageInConversation: vi.fn(() => true),
    MessagingError,
    MessagingErrorCodes,
  }
})

vi.mock('../../services/webpush.service', () => ({
  WebPushService: { getInstance: () => ({ send: vi.fn() }), isWebPushConfigured: () => false },
}))

vi.mock('../../services/notifier.service', () => ({
  notifierService: { notifyProfile: vi.fn() },
}))

vi.mock('../../utils/wsUtils', () => ({
  broadcastToProfile: vi.fn().mockReturnValue(false),
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    FRONTEND_URL: 'http://test',
    MEDIA_UPLOAD_DIR: '/tmp/test-media',
    VOICE_MESSAGE_MAX_DURATION: 120,
    MEDIA_URL_BASE: '/user-content',
  },
}))

vi.mock('@/lib/media', () => ({
  MEDIA_SUBDIR: { VOICE: 'voice' },
  mediaUrl: (path: string) => `/user-content/${path}`,
}))

vi.mock('@fastify/multipart', () => ({ default: vi.fn() }))

vi.mock('../../services/interaction.service', () => ({
  InteractionService: {
    getInstance: () => ({ markMatchAsSeen: vi.fn().mockResolvedValue(undefined) }),
  },
}))

// Realistic CUIDs — SendMessagePayloadSchema rejects non-CUID strings with 401.
const senderProfileId = 'ck1234567890abcd12345677'
const recipientProfileId = 'ck1234567890abcd12345678'

// Realistic ConversationParticipant payload for a PENDING conversation —
// recipient has no participant row, but profileA/profileB fully populated.
function buildPendingSummary() {
  const senderProfile = {
    id: senderProfileId,
    publicName: 'Sender',
    profileImages: [],
    isCallable: true,
  }
  const recipientProfile = {
    id: recipientProfileId,
    publicName: 'Recipient',
    profileImages: [],
    isCallable: true,
  }
  return {
    id: 'cp1',
    profileId: senderProfileId,
    conversationId: 'conv-pending',
    lastReadAt: null,
    isMuted: false,
    isArchived: false,
    isCallable: true,
    conversation: {
      id: 'conv-pending',
      updatedAt: new Date('2026-04-25T00:00:00Z'),
      createdAt: new Date('2026-04-25T00:00:00Z'),
      profileAId: senderProfileId,
      profileBId: recipientProfileId,
      profileA: senderProfile,
      profileB: recipientProfile,
      participants: [
        {
          profileId: senderProfileId,
          isCallable: true,
          isMuted: false,
          isArchived: false,
          lastReadAt: null,
        },
      ],
      messages: [
        {
          id: 'm1',
          conversationId: 'conv-pending',
          senderId: senderProfileId,
          content: 'hi',
          createdAt: new Date('2026-04-25T00:00:00Z'),
          messageType: 'text/plain',
        },
      ],
    },
  }
}

beforeEach(async () => {
  vi.clearAllMocks()
  fastify = new MockFastify()
  reply = new MockReply()
  mockTrustService = { hasTrustFlag: vi.fn().mockResolvedValue(true) }
  mockMessageService = {
    listMessagesForConversation: vi.fn(),
    listConversationsForProfile: vi.fn(),
    markConversationRead: vi.fn(),
    getConversationSummary: vi.fn().mockResolvedValue(buildPendingSummary()),
    resolveConversation: vi.fn().mockResolvedValue({
      convo: { id: 'conv-pending', status: 'PENDING', initiatorProfileId: senderProfileId },
      wasCreated: true,
    }),
    acceptConversationOnReply: vi.fn(),
    promoteConversation: vi.fn(),
    sendMessage: vi.fn().mockResolvedValue({
      message: {
        id: 'm1',
        conversationId: 'conv-pending',
        senderId: senderProfileId,
        content: 'hi',
        createdAt: new Date('2026-04-25T00:00:00Z'),
        messageType: 'text/plain',
        sender: {
          id: senderProfileId,
          publicName: 'Sender',
          profileImages: [],
          isCallable: true,
        },
        attachment: null,
        images: [],
      },
      isDuplicate: false,
    }),
  }
  fastify.prisma = {
    $transaction: vi.fn(async (fn: any) => fn(fastify.prisma)),
    profile: {
      findUnique: vi.fn().mockResolvedValue({ user: { language: 'en' } }),
    },
  }
  await messageRoutes(fastify as any, {})
})

describe('POST /message — quarantined sender (real mapper)', () => {
  it('returns 200 with a valid ConversationSummary when sender is the only participant', async () => {
    const handler = fastify.routes['POST /message']
    await handler(
      {
        session: { profileId: senderProfileId },
        body: { profileId: recipientProfileId, content: 'hi' },
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    // Partner identity must come from profileB even though no recipient
    // participant row exists — this is the regression assertion.
    expect(reply.payload.conversation.partnerProfile.id).toBe(recipientProfileId)
    expect(reply.payload.conversation.partnerProfile.publicName).toBe('Recipient')
    // Default callable when participant state for partner is absent.
    expect(reply.payload.conversation.isCallable).toBe(true)
    expect(reply.payload.conversation.myIsCallable).toBe(true)
  })

  it('mapper does not throw on single-participant conversations', async () => {
    // If the mapper regresses to "find partner in participants", the route
    // throws before responding and statusCode stays at the default. This test
    // is intentionally narrow: it asserts the failure mode we hit in UAT.
    const handler = fastify.routes['POST /message']
    let thrown: unknown = null
    try {
      await handler(
        {
          session: { profileId: senderProfileId },
          body: { profileId: recipientProfileId, content: 'hi' },
        } as any,
        reply as any
      )
    } catch (err) {
      thrown = err
    }
    expect(thrown).toBeNull()
    expect(reply.statusCode).toBe(200)
  })
})
