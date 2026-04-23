import { describe, it, expect, beforeEach, vi } from 'vitest'
import messageRoutes from '../../api/routes/messaging.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))

let fastify: MockFastify
let reply: MockReply
let mockMessageService: any
let mockWebPushService: any
let mockNotifierService: any

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
    MessagingError,
    MessagingErrorCodes,
  }
})

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
  mapMessageToDTO: vi.fn((m: any, currentProfileId?: string) => ({
    ...m,
    id: m?.id ?? 'dto',
    sender: m?.sender ?? { publicName: 'TestSender' },
    content: m?.content ?? '',
    mapped: true,
    ...(currentProfileId !== undefined && { isMine: m?.senderId === currentProfileId }),
  })),
  mapConversationParticipantToSummary: vi.fn(() => ({ id: 'summary', partnerProfile: {} })),
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
    resolveConversation: vi.fn(),
    acceptConversationOnReply: vi.fn(),
    sendMessage: vi.fn(),
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

describe('GET /conversations', () => {
  it('returns 404 when session missing', async () => {
    const handler = fastify.routes['GET /conversations']
    await handler({ session: {} } as any, reply as any)
    expect(reply.statusCode).toBe(404)
    expect(reply.payload.message).toMatch('Profile not found')
  })

  it('returns conversation summaries', async () => {
    const handler = fastify.routes['GET /conversations']
    mockMessageService.listConversationsForProfile.mockResolvedValue([{ id: 'cp1' }, { id: 'cp2' }])
    await handler({ session: { profileId: 'p1' } } as any, reply as any)
    expect(mockMessageService.listConversationsForProfile).toHaveBeenCalledWith('p1')
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.conversations).toHaveLength(2)
  })

  it('returns 500 when service throws', async () => {
    const handler = fastify.routes['GET /conversations']
    mockMessageService.listConversationsForProfile.mockRejectedValue(new Error('db down'))
    await handler({ session: { profileId: 'p1' } } as any, reply as any)
    expect(reply.statusCode).toBe(500)
  })
})

describe('POST /message', () => {
  const validBody = { profileId: 'ck1234567890abcd12345678', content: 'hello' }

  it('returns 401 when session missing', async () => {
    const handler = fastify.routes['POST /message']
    await handler({ session: {}, body: validBody } as any, reply as any)
    expect(reply.statusCode).toBe(401)
    expect(reply.payload.message).toMatch('Sender ID not found')
  })

  it('returns 401 for invalid body', async () => {
    const handler = fastify.routes['POST /message']
    await handler({ session: { profileId: 'p1' }, body: {} } as any, reply as any)
    expect(reply.statusCode).toBe(401)
    expect(reply.payload.message).toMatch('Invalid parameters')
  })

  it('sends message and returns conversation with messageDTO', async () => {
    const handler = fastify.routes['POST /message']
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: {
        id: 'conv1',
        status: 'ACCEPTED',
        initiatorProfileId: 'other',
        profileAId: 'p1',
        profileBId: 'ck1234567890abcd12345678',
      },
      wasCreated: false,
    })
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1', senderId: 'p1' },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'ACTIVE' },
    })

    await handler({ session: { profileId: 'p1' }, body: validBody } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.message).toHaveProperty('isMine', true)
    expect(reply.payload.conversation.id).toBe('summary')
    expect(mockMessageService.resolveConversation).toHaveBeenCalledWith(
      fastify.prisma,
      'p1',
      'ck1234567890abcd12345678'
    )
    expect(mockMessageService.sendMessage).toHaveBeenCalledWith(
      fastify.prisma,
      'conv1',
      'p1',
      'hello',
      'text/plain',
      undefined
    )
    expect(mockMessageService.acceptConversationOnReply).not.toHaveBeenCalled()
    expect(reply.payload.outcome).toBe('reply')
  })

  it('broadcasts via WS and falls back to notification when offline', async () => {
    const { broadcastToProfile } = await import('../../utils/wsUtils')
    ;(broadcastToProfile as any).mockReturnValue(false)

    const handler = fastify.routes['POST /message']
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: {
        id: 'conv1',
        status: 'ACCEPTED',
        initiatorProfileId: 'other',
        profileAId: 'p1',
        profileBId: 'ck1234567890abcd12345678',
      },
      wasCreated: false,
    })
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1', senderId: 'p1' },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'ACTIVE' },
    })

    await handler({ session: { profileId: 'p1' }, body: validBody } as any, reply as any)

    expect(broadcastToProfile).toHaveBeenCalledWith(
      fastify,
      'ck1234567890abcd12345678',
      expect.objectContaining({ type: 'ws:new_message' })
    )
    expect(mockNotifierService.notifyProfile).toHaveBeenCalledWith(
      'ck1234567890abcd12345678',
      'new_message',
      expect.objectContaining({ senderId: 'p1', link: 'http://test/inbox' })
    )
  })

  it('skips broadcast and notification when isDuplicate', async () => {
    const { broadcastToProfile } = await import('../../utils/wsUtils')
    ;(broadcastToProfile as any).mockClear()

    const handler = fastify.routes['POST /message']
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: {
        id: 'conv1',
        status: 'ACCEPTED',
        initiatorProfileId: 'other',
        profileAId: 'p1',
        profileBId: 'ck1234567890abcd12345678',
      },
      wasCreated: false,
    })
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1', senderId: 'p1' },
      isDuplicate: true,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'ACTIVE' },
    })

    await handler({ session: { profileId: 'p1' }, body: validBody } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    // broadcastToProfile should not have been called with ws:new_message
    const newMessageCalls = (broadcastToProfile as any).mock.calls.filter(
      (c: any) => c[2]?.type === 'ws:new_message'
    )
    expect(newMessageCalls).toHaveLength(0)
    expect(mockNotifierService.notifyProfile).not.toHaveBeenCalled()
  })

  it('re-throws unexpected errors from resolveConversation so Fastify returns 500', async () => {
    const handler = fastify.routes['POST /message']
    mockMessageService.resolveConversation.mockRejectedValue(new Error('db down'))
    await expect(
      handler({ session: { profileId: 'p1' }, body: validBody } as any, reply as any)
    ).rejects.toThrow('db down')
  })

  it('re-throws when conversation summary not found (invariant breach)', async () => {
    const handler = fastify.routes['POST /message']
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: {
        id: 'conv1',
        status: 'ACCEPTED',
        initiatorProfileId: 'other',
        profileAId: 'p1',
        profileBId: 'ck1234567890abcd12345678',
      },
      wasCreated: false,
    })
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1', senderId: 'p1' },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue(null)

    await expect(
      handler({ session: { profileId: 'p1' }, body: validBody } as any, reply as any)
    ).rejects.toThrow('Conversation summary not found')
  })
})

describe('POST /message — outcomes', () => {
  const validBody = { profileId: 'ck1234567890abcd12345678', content: 'hello' }
  const senderProfileId = 'p1'

  function mockSend(options: {
    convo: { id: string; status: string; initiatorProfileId: string }
    wasCreated: boolean
    isDuplicate?: boolean
  }) {
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: options.convo,
      wasCreated: options.wasCreated,
    })
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1', senderId: senderProfileId },
      isDuplicate: options.isDuplicate ?? false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'ACTIVE' },
    })
  }

  it('outcome=new_conversation when wasCreated=true', async () => {
    const handler = fastify.routes['POST /message']
    mockSend({
      convo: { id: 'conv1', status: 'INITIATED', initiatorProfileId: senderProfileId },
      wasCreated: true,
    })

    await handler({ session: { profileId: senderProfileId }, body: validBody } as any, reply as any)

    expect(reply.payload.outcome).toBe('new_conversation')
    expect(mockMessageService.acceptConversationOnReply).not.toHaveBeenCalled()
  })

  it('outcome=accepted_on_reply when non-initiator replies into INITIATED', async () => {
    const handler = fastify.routes['POST /message']
    mockSend({
      convo: { id: 'conv1', status: 'INITIATED', initiatorProfileId: 'other-user' },
      wasCreated: false,
    })
    mockMessageService.acceptConversationOnReply.mockResolvedValue({
      id: 'conv1',
      status: 'ACCEPTED',
    })

    await handler({ session: { profileId: senderProfileId }, body: validBody } as any, reply as any)

    expect(reply.payload.outcome).toBe('accepted_on_reply')
    expect(mockMessageService.acceptConversationOnReply).toHaveBeenCalledWith(
      fastify.prisma,
      'conv1'
    )
  })

  it('outcome=reply when convo is already ACCEPTED', async () => {
    const handler = fastify.routes['POST /message']
    mockSend({
      convo: { id: 'conv1', status: 'ACCEPTED', initiatorProfileId: 'other-user' },
      wasCreated: false,
    })

    await handler({ session: { profileId: senderProfileId }, body: validBody } as any, reply as any)

    expect(reply.payload.outcome).toBe('reply')
    expect(mockMessageService.acceptConversationOnReply).not.toHaveBeenCalled()
  })

  it('rejects with 403 when initiator sends into own INITIATED convo', async () => {
    const handler = fastify.routes['POST /message']
    mockSend({
      convo: { id: 'conv1', status: 'INITIATED', initiatorProfileId: senderProfileId },
      wasCreated: false,
    })

    await handler({ session: { profileId: senderProfileId }, body: validBody } as any, reply as any)

    expect(reply.statusCode).toBe(403)
    expect(mockMessageService.sendMessage).not.toHaveBeenCalled()
  })

  it('calls markMatchAsSeen only when outcome=new_conversation', async () => {
    const interactionModule = await import('../../services/interaction.service')
    const markSpy = vi.fn().mockResolvedValue(undefined)
    ;(interactionModule.InteractionService as any).getInstance = () => ({
      markMatchAsSeen: markSpy,
    })
    // Re-register the route plugin so it picks up the new interactionService instance:
    fastify = new MockFastify()
    reply = new MockReply()
    fastify.prisma = {
      $transaction: vi.fn(async (fn: any) => fn(fastify.prisma)),
      profile: { findUnique: vi.fn().mockResolvedValue({ user: { language: 'en' } }) },
    }
    await messageRoutes(fastify as any, {})

    const handler = fastify.routes['POST /message']

    // Case 1: new_conversation → called
    mockMessageService.resolveConversation.mockResolvedValueOnce({
      convo: { id: 'c1', status: 'INITIATED', initiatorProfileId: 'p1' },
      wasCreated: true,
    })
    mockMessageService.sendMessage.mockResolvedValueOnce({
      message: { id: 'm1', senderId: 'p1' },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValueOnce({
      conversation: { status: 'ACTIVE' },
    })
    await handler(
      {
        session: { profileId: 'p1' },
        body: { profileId: 'ck1234567890abcd12345678', content: 'hi' },
      } as any,
      reply as any
    )
    expect(markSpy).toHaveBeenCalledTimes(1)

    // Case 2: reply in ACCEPTED convo → NOT called
    markSpy.mockClear()
    mockMessageService.resolveConversation.mockResolvedValueOnce({
      convo: { id: 'c1', status: 'ACCEPTED', initiatorProfileId: 'other' },
      wasCreated: false,
    })
    mockMessageService.sendMessage.mockResolvedValueOnce({
      message: { id: 'm2', senderId: 'p1' },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValueOnce({
      conversation: { status: 'ACTIVE' },
    })
    await handler(
      {
        session: { profileId: 'p1' },
        body: { profileId: 'ck1234567890abcd12345678', content: 'hi' },
      } as any,
      reply as any
    )
    expect(markSpy).not.toHaveBeenCalled()

    // Case 3: accepted_on_reply → NOT called
    markSpy.mockClear()
    mockMessageService.resolveConversation.mockResolvedValueOnce({
      convo: { id: 'c1', status: 'INITIATED', initiatorProfileId: 'other' },
      wasCreated: false,
    })
    mockMessageService.acceptConversationOnReply.mockResolvedValueOnce({
      id: 'c1',
      status: 'ACCEPTED',
    })
    mockMessageService.sendMessage.mockResolvedValueOnce({
      message: { id: 'm3', senderId: 'p1' },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValueOnce({
      conversation: { status: 'ACTIVE' },
    })
    await handler(
      {
        session: { profileId: 'p1' },
        body: { profileId: 'ck1234567890abcd12345678', content: 'hi' },
      } as any,
      reply as any
    )
    expect(markSpy).not.toHaveBeenCalled()

    // Case 4: duplicate reply → NOT called (pre-fix behavior also NOT called here because !isDuplicate was false)
    markSpy.mockClear()
    mockMessageService.resolveConversation.mockResolvedValueOnce({
      convo: { id: 'c1', status: 'ACCEPTED', initiatorProfileId: 'other' },
      wasCreated: false,
    })
    mockMessageService.sendMessage.mockResolvedValueOnce({
      message: { id: 'm-dup', senderId: 'p1' },
      isDuplicate: true,
    })
    mockMessageService.getConversationSummary.mockResolvedValueOnce({
      conversation: { status: 'ACTIVE' },
    })
    await handler(
      {
        session: { profileId: 'p1' },
        body: { profileId: 'ck1234567890abcd12345678', content: 'hi' },
      } as any,
      reply as any
    )
    expect(markSpy).not.toHaveBeenCalled()
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
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: {
        id: 'conv1',
        status: 'ACCEPTED',
        initiatorProfileId: 'other',
        profileAId: 'p1',
        profileBId: 'ck1234567890abcd12345678',
      },
      wasCreated: false,
    })
    mockMessageService.sendMessage.mockResolvedValue({
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
        senderId: 'p1',
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

  it('returns 400 when no voice file provided', async () => {
    const handler = fastify.routes['POST /voice']
    // Only field parts, no file part
    const parts = (async function* () {
      yield { type: 'field', fieldname: 'profileId', value: 'ck1234567890abcd12345678' }
      yield { type: 'field', fieldname: 'duration', value: '5' }
    })()

    await handler({ session: { profileId: 'p1' }, parts: () => parts } as any, reply as any)
    expect(reply.statusCode).toBe(400)
    expect(reply.payload.message).toMatch('No voice file provided')
  })

  it('returns 400 for invalid audio mime type', async () => {
    const handler = fastify.routes['POST /voice']
    const parts = (async function* () {
      yield {
        type: 'file',
        fieldname: 'voice',
        filename: 'hack.exe',
        mimetype: 'application/octet-stream',
        toBuffer: async () => Buffer.from('data'),
      }
      yield { type: 'field', fieldname: 'profileId', value: 'ck1234567890abcd12345678' }
      yield { type: 'field', fieldname: 'duration', value: '5' }
    })()

    await handler({ session: { profileId: 'p1' }, parts: () => parts } as any, reply as any)
    expect(reply.statusCode).toBe(400)
    expect(reply.payload.message).toMatch('Invalid audio file type')
  })

  it('returns 400 when duration exceeds max', async () => {
    const handler = fastify.routes['POST /voice']
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
      yield { type: 'field', fieldname: 'duration', value: '999' }
    })()

    await handler({ session: { profileId: 'p1' }, parts: () => parts } as any, reply as any)
    expect(reply.statusCode).toBe(400)
    expect(reply.payload.message).toMatch('Voice message too long')
  })

  it('returns 400 for invalid voice message params (missing profileId)', async () => {
    const handler = fastify.routes['POST /voice']
    const parts = (async function* () {
      yield {
        type: 'file',
        fieldname: 'voice',
        filename: 'voice.webm',
        mimetype: 'audio/webm',
        toBuffer: async () => Buffer.from('fake-audio'),
      }
      // missing profileId field
      yield { type: 'field', fieldname: 'content', value: '' }
      yield { type: 'field', fieldname: 'duration', value: '5' }
    })()

    await handler({ session: { profileId: 'p1' }, parts: () => parts } as any, reply as any)
    expect(reply.statusCode).toBe(400)
    expect(reply.payload.message).toMatch('Invalid voice message parameters')
  })

  it('cleans up file when message creation fails', async () => {
    const fs = await import('fs')
    const handler = fastify.routes['POST /voice']

    mockMessageService.resolveConversation.mockResolvedValue({
      convo: {
        id: 'conv1',
        status: 'ACCEPTED',
        initiatorProfileId: 'other',
        profileAId: 'p1',
        profileBId: 'ck1234567890abcd12345678',
      },
      wasCreated: false,
    })
    mockMessageService.sendMessage.mockRejectedValue(new Error('db error'))

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

    await handler({ session: { profileId: 'p1' }, parts: () => parts } as any, reply as any)

    // Unexpected send-path errors surface as 500; upload-phase errors remain 400.
    expect(reply.statusCode).toBe(500)
    expect(fs.promises.unlink).toHaveBeenCalled()
  })

  it('skips broadcast when isDuplicate', async () => {
    const { broadcastToProfile } = await import('../../utils/wsUtils')
    ;(broadcastToProfile as any).mockClear()

    const handler = fastify.routes['POST /voice']
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: {
        id: 'conv1',
        status: 'ACCEPTED',
        initiatorProfileId: 'other',
        profileAId: 'p1',
        profileBId: 'ck1234567890abcd12345678',
      },
      wasCreated: false,
    })
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1', senderId: 'p1' },
      isDuplicate: true,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'ACTIVE' },
    })

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

    await handler({ session: { profileId: 'p1' }, parts: () => parts } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    const newMessageCalls = (broadcastToProfile as any).mock.calls.filter(
      (c: any) => c[2]?.type === 'ws:new_message'
    )
    expect(newMessageCalls).toHaveLength(0)
  })
})

describe('POST /voice — outcomes', () => {
  const senderProfileId = 'p1'
  const recipientId = 'ck1234567890abcd12345678'

  function voiceParts() {
    return (async function* () {
      yield {
        type: 'file',
        fieldname: 'voice',
        filename: 'voice.webm',
        mimetype: 'audio/webm',
        toBuffer: async () => Buffer.from('fake-audio'),
      }
      yield { type: 'field', fieldname: 'profileId', value: recipientId }
      yield { type: 'field', fieldname: 'content', value: '' }
      yield { type: 'field', fieldname: 'duration', value: '5' }
    })()
  }

  function mockVoiceSend(options: {
    convo: { id: string; status: string; initiatorProfileId: string }
    wasCreated: boolean
    isDuplicate?: boolean
  }) {
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: options.convo,
      wasCreated: options.wasCreated,
    })
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'mv1', senderId: senderProfileId },
      isDuplicate: options.isDuplicate ?? false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'ACTIVE' },
    })
  }

  it('outcome=new_conversation when wasCreated=true', async () => {
    const handler = fastify.routes['POST /voice']
    mockVoiceSend({
      convo: { id: 'conv1', status: 'INITIATED', initiatorProfileId: senderProfileId },
      wasCreated: true,
    })

    await handler(
      { session: { profileId: senderProfileId }, parts: () => voiceParts() } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.outcome).toBe('new_conversation')
    expect(mockMessageService.acceptConversationOnReply).not.toHaveBeenCalled()
  })

  it('outcome=reply when convo is already ACCEPTED', async () => {
    const handler = fastify.routes['POST /voice']
    mockVoiceSend({
      convo: { id: 'conv1', status: 'ACCEPTED', initiatorProfileId: 'other-user' },
      wasCreated: false,
    })

    await handler(
      { session: { profileId: senderProfileId }, parts: () => voiceParts() } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.outcome).toBe('reply')
    expect(mockMessageService.acceptConversationOnReply).not.toHaveBeenCalled()
  })

  it('outcome=accepted_on_reply when non-initiator replies into INITIATED', async () => {
    const handler = fastify.routes['POST /voice']
    mockVoiceSend({
      convo: { id: 'conv1', status: 'INITIATED', initiatorProfileId: 'other-user' },
      wasCreated: false,
    })
    mockMessageService.acceptConversationOnReply.mockResolvedValue({
      id: 'conv1',
      status: 'ACCEPTED',
    })

    await handler(
      { session: { profileId: senderProfileId }, parts: () => voiceParts() } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.outcome).toBe('accepted_on_reply')
    expect(mockMessageService.acceptConversationOnReply).toHaveBeenCalledWith(
      fastify.prisma,
      'conv1'
    )
  })

  it('rejects with 403 when initiator sends into own INITIATED convo', async () => {
    const handler = fastify.routes['POST /voice']
    mockVoiceSend({
      convo: { id: 'conv1', status: 'INITIATED', initiatorProfileId: senderProfileId },
      wasCreated: false,
    })

    await handler(
      { session: { profileId: senderProfileId }, parts: () => voiceParts() } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(403)
    expect(mockMessageService.sendMessage).not.toHaveBeenCalled()
  })

  it('calls markMatchAsSeen only when outcome=new_conversation', async () => {
    const interactionModule = await import('../../services/interaction.service')
    const markSpy = vi.fn().mockResolvedValue(undefined)
    ;(interactionModule.InteractionService as any).getInstance = () => ({
      markMatchAsSeen: markSpy,
    })
    // Re-register the route plugin so it picks up the new interactionService instance:
    fastify = new MockFastify()
    reply = new MockReply()
    fastify.prisma = {
      $transaction: vi.fn(async (fn: any) => fn(fastify.prisma)),
      profile: { findUnique: vi.fn().mockResolvedValue({ user: { language: 'en' } }) },
    }
    await messageRoutes(fastify as any, {})

    const handler = fastify.routes['POST /voice']

    // Case 1: new_conversation → called
    mockMessageService.resolveConversation.mockResolvedValueOnce({
      convo: { id: 'c1', status: 'INITIATED', initiatorProfileId: senderProfileId },
      wasCreated: true,
    })
    mockMessageService.sendMessage.mockResolvedValueOnce({
      message: { id: 'mv1', senderId: senderProfileId },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValueOnce({
      conversation: { status: 'ACTIVE' },
    })
    await handler(
      { session: { profileId: senderProfileId }, parts: () => voiceParts() } as any,
      reply as any
    )
    expect(markSpy).toHaveBeenCalledTimes(1)

    // Case 2: reply in ACCEPTED convo → NOT called
    markSpy.mockClear()
    mockMessageService.resolveConversation.mockResolvedValueOnce({
      convo: { id: 'c1', status: 'ACCEPTED', initiatorProfileId: 'other' },
      wasCreated: false,
    })
    mockMessageService.sendMessage.mockResolvedValueOnce({
      message: { id: 'mv2', senderId: senderProfileId },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValueOnce({
      conversation: { status: 'ACTIVE' },
    })
    await handler(
      { session: { profileId: senderProfileId }, parts: () => voiceParts() } as any,
      reply as any
    )
    expect(markSpy).not.toHaveBeenCalled()

    // Case 3: accepted_on_reply → NOT called
    markSpy.mockClear()
    mockMessageService.resolveConversation.mockResolvedValueOnce({
      convo: { id: 'c1', status: 'INITIATED', initiatorProfileId: 'other' },
      wasCreated: false,
    })
    mockMessageService.acceptConversationOnReply.mockResolvedValueOnce({
      id: 'c1',
      status: 'ACCEPTED',
    })
    mockMessageService.sendMessage.mockResolvedValueOnce({
      message: { id: 'mv3', senderId: senderProfileId },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValueOnce({
      conversation: { status: 'ACTIVE' },
    })
    await handler(
      { session: { profileId: senderProfileId }, parts: () => voiceParts() } as any,
      reply as any
    )
    expect(markSpy).not.toHaveBeenCalled()

    // Case 4: duplicate reply → NOT called
    markSpy.mockClear()
    mockMessageService.resolveConversation.mockResolvedValueOnce({
      convo: { id: 'c1', status: 'ACCEPTED', initiatorProfileId: 'other' },
      wasCreated: false,
    })
    mockMessageService.sendMessage.mockResolvedValueOnce({
      message: { id: 'mv-dup', senderId: senderProfileId },
      isDuplicate: true,
    })
    mockMessageService.getConversationSummary.mockResolvedValueOnce({
      conversation: { status: 'ACTIVE' },
    })
    await handler(
      { session: { profileId: senderProfileId }, parts: () => voiceParts() } as any,
      reply as any
    )
    expect(markSpy).not.toHaveBeenCalled()
  })
})

describe('GET /:id (error paths)', () => {
  it('returns 404 for invalid conversation ID format', async () => {
    const handler = fastify.routes['GET /:id']
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'not-a-cuid' } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })

  it('returns 500 when service throws', async () => {
    const handler = fastify.routes['GET /:id']
    mockMessageService.listMessagesForConversation.mockRejectedValue(new Error('db down'))
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'ck1234567890abcd12345678' } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(500)
  })
})

describe('POST /conversations/:id/mark-read (error paths)', () => {
  it('returns 404 for invalid ID format', async () => {
    const handler = fastify.routes['POST /conversations/:id/mark-read']
    await handler({ session: { profileId: 'p1' }, params: { id: 'bad' } } as any, reply as any)
    expect(reply.statusCode).toBe(404)
  })

  it('returns 500 when markConversationRead throws', async () => {
    const handler = fastify.routes['POST /conversations/:id/mark-read']
    mockMessageService.markConversationRead.mockRejectedValue(new Error('db error'))
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'ck1234567890abcd12345678' } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(500)
  })
})
