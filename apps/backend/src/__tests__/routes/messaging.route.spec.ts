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
  },
}))

vi.mock('../../services/interaction.service', () => ({
  InteractionService: {
    getInstance: () => ({
      markMatchAsSeen: vi.fn().mockResolvedValue(undefined),
    }),
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
    mockMessageService.sendOrStartConversation.mockResolvedValue({
      convoId: 'conv1',
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
    expect(mockMessageService.sendOrStartConversation).toHaveBeenCalledWith(
      fastify.prisma,
      'p1',
      'ck1234567890abcd12345678',
      'hello',
      'text/plain'
    )
  })

  it('broadcasts via WS and falls back to notification when offline', async () => {
    const { broadcastToProfile } = await import('../../utils/wsUtils')
    ;(broadcastToProfile as any).mockReturnValue(false)

    const handler = fastify.routes['POST /message']
    mockMessageService.sendOrStartConversation.mockResolvedValue({
      convoId: 'conv1',
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
      expect.objectContaining({ link: 'http://test/inbox' })
    )
  })

  it('skips broadcast and notification when isDuplicate', async () => {
    const { broadcastToProfile } = await import('../../utils/wsUtils')
    ;(broadcastToProfile as any).mockClear()

    const handler = fastify.routes['POST /message']
    mockMessageService.sendOrStartConversation.mockResolvedValue({
      convoId: 'conv1',
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

  it('returns 403 when sendOrStartConversation throws', async () => {
    const handler = fastify.routes['POST /message']
    mockMessageService.sendOrStartConversation.mockRejectedValue(new Error('blocked'))
    await handler({ session: { profileId: 'p1' }, body: validBody } as any, reply as any)
    expect(reply.statusCode).toBe(403)
  })

  it('throws when conversation summary not found', async () => {
    const handler = fastify.routes['POST /message']
    mockMessageService.sendOrStartConversation.mockResolvedValue({
      convoId: 'conv1',
      message: { id: 'm1', senderId: 'p1' },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue(null)

    await handler({ session: { profileId: 'p1' }, body: validBody } as any, reply as any)
    // The thrown error is caught by the catch block which calls sendError with 403
    expect(reply.statusCode).toBe(403)
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
