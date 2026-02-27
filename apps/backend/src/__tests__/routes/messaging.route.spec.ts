import { describe, it, expect, beforeEach, vi } from 'vitest'
import messageRoutes from '../../api/routes/messaging.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))

let fastify: MockFastify
let reply: MockReply
let mockMessageService: any
let mockWebPushService: any
let mockNotifierService: any

vi.mock('../../services/messaging.service', () => ({
  MessageService: { getInstance: () => mockMessageService },
  cleanMessageForNotification: vi.fn((msg: string) => msg),
}))

vi.mock('../../services/webpush.service', () => ({
  WebPushService: { getInstance: () => mockWebPushService, isWebPushConfigured: () => false },
}))

vi.mock('../../services/notifier.service', () => ({
  notifierService: {
    notifyProfile: vi.fn(),
  },
}))

vi.mock('../../utils/wsUtils', () => ({
  broadcastToProfile: vi.fn().mockReturnValue(false),
}))

vi.mock('../../api/mappers/messaging.mappers', () => ({
  mapMessageForMessageList: vi.fn((m: any) => ({ ...m, mapped: true })),
  mapConversationParticipantToSummary: vi.fn(() => ({ id: 'summary', partnerProfile: {} })),
  mapMessageDTO: vi.fn(() => ({
    id: 'dto',
    sender: { publicName: 'TestSender' },
    content: '',
  })),
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    FRONTEND_URL: 'http://test',
    MEDIA_UPLOAD_DIR: '/tmp/test-media',
    VOICE_MESSAGE_MAX_DURATION: 120,
  },
}))

vi.mock('@/lib/media', () => ({
  MEDIA_SUBDIR: { VOICE: 'voice' },
}))

vi.mock('@/services/audioTranscoder', () => ({
  transcodeToMp3: vi.fn(),
}))

vi.mock('@fastify/multipart', () => ({ default: vi.fn() }))

vi.mock('i18next', () => ({
  default: {
    getFixedT: (_lang: string) => (key: string) => {
      const translations: Record<string, string> = {
        'notifications.voice_message_sent': 'Sent a voice message',
      }
      return translations[key] || key
    },
  },
}))

vi.mock('../../services/interaction.service', () => ({
  InteractionService: {
    getInstance: () => ({
      markMatchAsSeen: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
    stat: vi.fn().mockResolvedValue({ size: 1024 }),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}))

beforeEach(async () => {
  vi.clearAllMocks()
  fastify = new MockFastify()
  reply = new MockReply()
  mockMessageService = {
    listMessagesForConversation: vi.fn(),
    listConversationsForProfile: vi.fn(),
    markConversationRead: vi.fn(),
    getConversationSummary: vi.fn(),
    initiateConversation: vi.fn(),
    replyInConversation: vi.fn(),
    sendOrStartConversation: vi.fn(),
  }
  mockWebPushService = { send: vi.fn() }
  mockNotifierService = (await import('../../services/notifier.service')).notifierService
  fastify.prisma = {
    $transaction: vi.fn(async (fn: any) => fn(fastify.prisma)),
    profile: {
      findUnique: vi.fn().mockResolvedValue({ user: { language: 'en' } }),
    },
  }
  await messageRoutes(fastify as any, {})
})

describe('GET /:id', () => {
  it('returns 404 when session missing', async () => {
    const handler = fastify.routes['GET /:id']
    await handler({ session: {}, params: { id: 'c1' } } as any, reply as any)
    expect(reply.statusCode).toBe(404)
    expect(reply.payload.message).toMatch('Profile not found')
  })

  it('returns messages for conversation', async () => {
    const handler = fastify.routes['GET /:id']
    const msg = {
      id: 'm1',
      conversationId: 'c1',
      senderId: 'p1',
      content: 'hi',
      createdAt: new Date(),
      sender: { profileImages: [] },
    }
    mockMessageService.listMessagesForConversation.mockResolvedValue({
      messages: [msg],
      nextCursor: null,
      hasMore: false,
    })
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'ck1234567890abcd12345678' } } as any,
      reply as any
    )
    expect(mockMessageService.listMessagesForConversation).toHaveBeenCalledWith(
      'ck1234567890abcd12345678',
      { cursor: undefined, take: undefined }
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.messages[0].mapped).toBe(true)
    expect(reply.payload.nextCursor).toBeNull()
    expect(reply.payload.hasMore).toBe(false)
  })
})

describe('POST /conversations/:id/mark-read', () => {
  it('returns 401 when session missing', async () => {
    const handler = fastify.routes['POST /conversations/:id/mark-read']
    await handler({ session: {}, params: { id: 'c1' } } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 404 when conversation not found', async () => {
    const handler = fastify.routes['POST /conversations/:id/mark-read']
    mockMessageService.getConversationSummary.mockResolvedValue(null)
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'ck1234567890abcd12345678' } } as any,
      reply as any
    )
    expect(mockMessageService.markConversationRead).toHaveBeenCalledWith(
      'ck1234567890abcd12345678',
      'p1'
    )
    expect(reply.statusCode).toBe(404)
  })

  it('marks conversation read and returns summary', async () => {
    const handler = fastify.routes['POST /conversations/:id/mark-read']
    mockMessageService.getConversationSummary.mockResolvedValue({})
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'ck1234567890abcd12345678' } } as any,
      reply as any
    )
    expect(mockMessageService.markConversationRead).toHaveBeenCalledWith(
      'ck1234567890abcd12345678',
      'p1'
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.conversation.id).toBe('summary')
  })
})

describe('POST /voice', () => {
  it('uses i18n-translated string for voice message notification', async () => {
    const handler = fastify.routes['POST /voice']

    // Mock the recipient profile with a specific language
    fastify.prisma.profile.findUnique.mockResolvedValue({
      user: { language: 'de' },
    })

    // Mock conversation and message creation
    mockMessageService.sendOrStartConversation.mockResolvedValue({
      convoId: 'conv1',
      message: { id: 'm1', senderId: 'p1' },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'ACTIVE' },
    })

    // Create an async iterator that yields file and field parts
    const parts = (async function* () {
      yield {
        type: 'file',
        fieldname: 'voice',
        filename: 'voice.webm',
        mimetype: 'audio/webm',
        toBuffer: async () => Buffer.from('fake-audio'),
      }
      yield { type: 'field', fieldname: 'profileId', value: 'ck1234567890abcd12345678' }
      yield { type: 'field', fieldname: 'content', value: '' }
      yield { type: 'field', fieldname: 'duration', value: '5' }
    })()

    await handler(
      {
        session: { profileId: 'p1' },
        parts: () => parts,
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(mockNotifierService.notifyProfile).toHaveBeenCalledWith(
      'ck1234567890abcd12345678',
      'new_message',
      expect.objectContaining({
        sender: 'TestSender',
        message: 'Sent a voice message', // i18n key resolves to this in English (fallback)
        link: 'http://test/inbox',
      })
    )

    // Verify recipient language was looked up
    expect(fastify.prisma.profile.findUnique).toHaveBeenCalledWith({
      where: { id: 'ck1234567890abcd12345678' },
      select: { user: { select: { language: true } } },
    })
  })

  it('returns 401 when session missing', async () => {
    const handler = fastify.routes['POST /voice']
    await handler({ session: {} } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })
})
