import { describe, it, expect, beforeEach, vi } from 'vitest'
import messageRoutes from '../../api/routes/messaging.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))

let fastify: MockFastify
let reply: MockReply
let mockMessageService: any
let mockWebPushService: any
let webPushConfigured = false
let mockNotifierService: any
let mockTrustService: any
let mockProfileService: any

vi.mock('../../services/profileTrust.service', () => ({
  ProfileTrustService: {
    getInstance: () => mockTrustService,
  },
}))

vi.mock('@/queues/profileTrustQueue', () => ({
  profileTrustQueue: {
    add: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('../../services/messaging.service', () => {
  const MessagingErrorCodes = {
    CONVERSATION_BLOCKED: 'CONVERSATION_BLOCKED',
    EMPTY_MESSAGE: 'EMPTY_MESSAGE',
    MESSAGE_NOT_FOUND: 'MESSAGE_NOT_FOUND',
    MESSAGE_NOT_EDITABLE: 'MESSAGE_NOT_EDITABLE',
    SELF_CONVERSATION: 'SELF_CONVERSATION',
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
    MessagingError,
    MessagingErrorCodes,
  }
})

vi.mock('../../services/webpush.service', () => ({
  WebPushService: {
    getInstance: () => mockWebPushService,
    isWebPushConfigured: () => webPushConfigured,
  },
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
  mapMessageProfileRef: vi.fn((p: any) => ({
    id: p.id,
    publicName: p.publicName ?? 'Partner',
    profileImages: [],
  })),
}))

vi.mock('@/services/profile.service', () => ({
  ProfileService: { getInstance: () => mockProfileService },
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    FRONTEND_URL: 'http://test',
    MEDIA_UPLOAD_DIR: '/tmp/test-media',
    VOICE_MESSAGE_MAX_DURATION: 120,
    ADMIN_PROFILE_ID: 'ckadmin0000000000000000000',
  } as { ADMIN_PROFILE_ID?: string },
}))

vi.mock('@/lib/media', () => ({
  MEDIA_SUBDIR: { VOICE: 'voice' },
}))

vi.mock('@/services/audioTranscoder', () => ({
  transcodeToMp3: vi.fn(),
}))

vi.mock('@fastify/multipart', () => ({ default: vi.fn() }))

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
  mockTrustService = {
    hasTrustFlag: vi.fn().mockResolvedValue(false),
    reconcileSpamBurst: vi.fn().mockResolvedValue(undefined),
  }
  mockMessageService = {
    listMessagesForConversation: vi.fn(),
    listConversationsForProfile: vi.fn(),
    getInboxConversationSummary: vi.fn(),
    hasUnreadConversations: vi.fn().mockResolvedValue(false),
    markConversationRead: vi.fn(),
    archiveConversation: vi.fn(),
    isConversationArchived: vi.fn().mockResolvedValue(false),
    unarchiveConversation: vi.fn(),
    getConversationSummary: vi.fn(),
    resolveConversation: vi.fn(),
    acceptConversationOnReply: vi.fn(),
    promoteConversation: vi.fn(),
    sendMessage: vi.fn(),
    editMessage: vi.fn(),
    findConversationSummaryByPartner: vi.fn(),
    hasMutualLike: vi.fn(),
  }
  mockProfileService = {
    getProfilePublicById: vi.fn(),
    getProfileById: vi.fn(),
  }
  mockWebPushService = { send: vi.fn().mockResolvedValue(undefined) }
  webPushConfigured = false
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
      'p1',
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
    expect(reply.payload.hasUnread).toBe(false)
  })

  it('reports whether other conversations are still unread', async () => {
    const handler = fastify.routes['POST /conversations/:id/mark-read']
    mockMessageService.getConversationSummary.mockResolvedValue({})
    mockMessageService.hasUnreadConversations.mockResolvedValue(true)
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'ck1234567890abcd12345678' } } as any,
      reply as any
    )
    expect(mockMessageService.hasUnreadConversations).toHaveBeenCalledWith('p1')
    expect(reply.payload.hasUnread).toBe(true)
  })
})

describe('PATCH /conversations/:id/archived', () => {
  const id = 'ck1234567890abcd12345678'
  const call = (session: any, body: any) =>
    fastify.routes['PATCH /conversations/:id/archived'](
      { session, params: { id }, body } as any,
      reply as any
    )

  it('returns 401 when session missing', async () => {
    await call({}, { isArchived: true, lastMessageAt: null })
    expect(reply.statusCode).toBe(401)
  })

  it('returns 400 on an invalid body', async () => {
    await call({ profileId: 'p1' }, { isArchived: 'yes' })
    expect(reply.statusCode).toBe(400)
    expect(mockMessageService.archiveConversation).not.toHaveBeenCalled()
  })

  it('archives and returns the summary with the inbox-wide unread flag', async () => {
    mockMessageService.getInboxConversationSummary.mockResolvedValue({})
    await call({ profileId: 'p1' }, { isArchived: true, lastMessageAt: '2026-01-02T03:04:05.678Z' })
    expect(mockMessageService.archiveConversation).toHaveBeenCalledWith(
      id,
      'p1',
      new Date('2026-01-02T03:04:05.678Z')
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.conversation.id).toBe('summary')
    expect(reply.payload.hasUnread).toBe(false)
  })

  it('unarchives', async () => {
    mockMessageService.getInboxConversationSummary.mockResolvedValue({})
    await call({ profileId: 'p1' }, { isArchived: false, lastMessageAt: null })
    expect(mockMessageService.unarchiveConversation).toHaveBeenCalledWith(id, 'p1')
    expect(mockMessageService.archiveConversation).not.toHaveBeenCalled()
  })

  it('returns 404 when the conversation is not in the inbox of the viewer', async () => {
    mockMessageService.getInboxConversationSummary.mockResolvedValue(null)
    await call({ profileId: 'p1' }, { isArchived: true, lastMessageAt: null })
    expect(reply.statusCode).toBe(404)
  })
})

describe('GET /conversations', () => {
  it('returns 404 when session missing', async () => {
    const handler = fastify.routes['GET /conversations']
    await handler({ session: {} } as any, reply as any)
    expect(reply.statusCode).toBe(404)
    expect(reply.payload.message).toMatch('Profile not found')
  })

  it('returns the first page of conversation summaries', async () => {
    const handler = fastify.routes['GET /conversations']
    mockMessageService.listConversationsForProfile.mockResolvedValue({
      conversations: [{ id: 'cp1' }, { id: 'cp2' }],
      nextCursor: null,
      hasMore: false,
    })
    await handler({ session: { profileId: 'p1' } } as any, reply as any)
    expect(mockMessageService.listConversationsForProfile).toHaveBeenCalledWith('p1', undefined)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.conversations).toHaveLength(2)
    expect(reply.payload.nextCursor).toBeNull()
    expect(reply.payload.hasMore).toBe(false)
    expect(reply.payload.hasUnread).toBe(false)
  })

  it('reports the inbox-wide unread flag alongside the page', async () => {
    const handler = fastify.routes['GET /conversations']
    mockMessageService.listConversationsForProfile.mockResolvedValue({
      conversations: [],
      nextCursor: null,
      hasMore: false,
    })
    mockMessageService.hasUnreadConversations.mockResolvedValue(true)
    await handler({ session: { profileId: 'p1' } } as any, reply as any)
    expect(mockMessageService.hasUnreadConversations).toHaveBeenCalledWith('p1')
    expect(reply.payload.hasUnread).toBe(true)
  })

  it('round-trips the cursor between response and query', async () => {
    const handler = fastify.routes['GET /conversations']
    const cursor = {
      isArchived: true,
      updatedAt: new Date('2026-01-02T03:04:05.678Z'),
      conversationId: 'ck1234567890abcd12345678',
    }
    mockMessageService.listConversationsForProfile.mockResolvedValue({
      conversations: [{ id: 'cp1' }],
      nextCursor: cursor,
      hasMore: true,
    })
    await handler({ session: { profileId: 'p1' } } as any, reply as any)
    expect(reply.payload.hasMore).toBe(true)
    expect(reply.payload.nextCursor).toEqual(expect.any(String))

    await handler(
      { session: { profileId: 'p1' }, query: { cursor: reply.payload.nextCursor } } as any,
      new MockReply() as any
    )
    expect(mockMessageService.listConversationsForProfile).toHaveBeenLastCalledWith('p1', cursor)
  })

  it.each([
    'garbage',
    '{}',
    '{"isArchived":1,"updatedAt":"2026-01-02T03:04:05.678Z","conversationId":"ck1234567890abcd12345678"}',
    '{"isArchived":false,"updatedAt":"not-a-date","conversationId":"ck1234567890abcd12345678"}',
    '{"isArchived":false,"updatedAt":"2026-01-02T03:04:05.678Z","conversationId":"nope"}',
  ])('returns 400 for malformed cursor %s', async (cursor) => {
    const handler = fastify.routes['GET /conversations']
    await handler({ session: { profileId: 'p1' }, query: { cursor } } as any, reply as any)
    expect(reply.statusCode).toBe(400)
    expect(mockMessageService.listConversationsForProfile).not.toHaveBeenCalled()
  })

  it('returns 500 when service throws', async () => {
    const handler = fastify.routes['GET /conversations']
    mockMessageService.listConversationsForProfile.mockRejectedValue(new Error('db down'))
    await handler({ session: { profileId: 'p1' } } as any, reply as any)
    expect(reply.statusCode).toBe(500)
  })
})

describe('GET /conversations/:id', () => {
  const id = 'ck1234567890abcd12345678'

  it('returns 404 when session missing', async () => {
    const handler = fastify.routes['GET /conversations/:id']
    await handler({ session: {}, params: { id } } as any, reply as any)
    expect(reply.statusCode).toBe(404)
  })

  it('returns 404 for an invalid id', async () => {
    const handler = fastify.routes['GET /conversations/:id']
    await handler({ session: { profileId: 'p1' }, params: { id: 'bad' } } as any, reply as any)
    expect(reply.statusCode).toBe(404)
    expect(mockMessageService.getInboxConversationSummary).not.toHaveBeenCalled()
  })

  it('returns 404 when the conversation is not visible to the viewer', async () => {
    const handler = fastify.routes['GET /conversations/:id']
    mockMessageService.getInboxConversationSummary.mockResolvedValue(null)
    await handler({ session: { profileId: 'p1' }, params: { id } } as any, reply as any)
    expect(mockMessageService.getInboxConversationSummary).toHaveBeenCalledWith(id, 'p1')
    expect(reply.statusCode).toBe(404)
  })

  it('returns the conversation summary', async () => {
    const handler = fastify.routes['GET /conversations/:id']
    mockMessageService.getInboxConversationSummary.mockResolvedValue({ id: 'cp1' })
    await handler({ session: { profileId: 'p1' }, params: { id } } as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.conversation.id).toBe('summary')
  })

  it('returns 500 when service throws', async () => {
    const handler = fastify.routes['GET /conversations/:id']
    mockMessageService.getInboxConversationSummary.mockRejectedValue(new Error('db down'))
    await handler({ session: { profileId: 'p1' }, params: { id } } as any, reply as any)
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

  it('maps SELF_CONVERSATION from the service to 400', async () => {
    const handler = fastify.routes['POST /message']
    const { MessagingError } = await import('../../services/messaging.service')
    mockMessageService.resolveConversation.mockRejectedValue(
      new MessagingError('SELF_CONVERSATION' as any, 'Cannot send a message to yourself')
    )
    await handler(
      { session: { profileId: validBody.profileId }, body: validBody } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(400)
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
      'ck1234567890abcd12345678',
      { createAsPending: false }
    )
    expect(mockMessageService.sendMessage).toHaveBeenCalledWith(
      fastify.prisma,
      'conv1',
      'p1',
      'hello',
      'text/plain',
      undefined,
      undefined
    )
    expect(mockMessageService.acceptConversationOnReply).not.toHaveBeenCalled()
    expect(reply.payload.outcome).toBeUndefined()
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
      expect.objectContaining({ senderId: 'p1', path: '/inbox' })
    )
  })

  it.each([
    { archived: false, notified: 1 },
    { archived: true, notified: 0 },
  ])(
    'offline recipient, archived=$archived: push and email sent $notified times',
    async ({ archived, notified }) => {
      webPushConfigured = true
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
        message: { id: 'm1', conversationId: 'conv1', senderId: 'p1' },
        isDuplicate: false,
      })
      mockMessageService.getConversationSummary.mockResolvedValue({
        conversation: { status: 'ACTIVE' },
      })

      mockMessageService.isConversationArchived.mockResolvedValue(archived)
      mockNotifierService.notifyProfile.mockClear()

      await handler({ session: { profileId: 'p1' }, body: validBody } as any, reply as any)

      expect(broadcastToProfile).toHaveBeenCalledWith(
        fastify,
        'ck1234567890abcd12345678',
        expect.objectContaining({ type: 'ws:new_message' })
      )
      expect(mockMessageService.isConversationArchived).toHaveBeenCalledWith(
        'conv1',
        'ck1234567890abcd12345678'
      )
      expect(mockWebPushService.send).toHaveBeenCalledTimes(notified)
      expect(mockNotifierService.notifyProfile).toHaveBeenCalledTimes(notified)
    }
  )

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

describe('messages to the system profile', () => {
  const ADMIN = 'ckadmin0000000000000000000'
  const post = (route: string, body: unknown, session: unknown = { profileId: 'p1' }) =>
    fastify.routes[route]({ session, body } as any, reply as any)

  const mockConvo = (status: string, wasCreated: boolean) => {
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: {
        id: 'conv1',
        status,
        initiatorProfileId: 'p1',
        profileAId: ADMIN,
        profileBId: 'p1',
      },
      wasCreated,
    })
  }

  beforeEach(async () => {
    const { broadcastToProfile } = await import('../../utils/wsUtils')
    ;(broadcastToProfile as any).mockReturnValue(false)
    mockTrustService.hasTrustFlag.mockResolvedValue(true)
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1', conversationId: 'conv1', senderId: 'p1', content: 'I am stuck' },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({ conversation: {} })
  })

  describe.each([
    { route: 'POST /help', body: { content: ' I am stuck ' } },
    { route: 'POST /message', body: { profileId: ADMIN, content: 'I am stuck' } },
  ])('$route', ({ route, body }) => {
    it('delivers and notifies despite the sender quarantine', async () => {
      mockConvo('INITIATED', true)
      await post(route, body)

      expect(reply.statusCode).toBe(200)
      expect(mockMessageService.resolveConversation).toHaveBeenCalledWith(
        fastify.prisma,
        'p1',
        ADMIN,
        { createAsPending: false }
      )
      expect(mockMessageService.sendMessage.mock.calls[0].slice(1, 5)).toEqual([
        'conv1',
        'p1',
        'I am stuck',
        'text/plain',
      ])
      expect(mockNotifierService.notifyProfile).toHaveBeenCalledWith(
        ADMIN,
        'new_message',
        expect.objectContaining({ senderId: 'p1', path: '/inbox' })
      )
    })

    it('maps the notification for the system profile, which sees nameless senders by email', async () => {
      const { mapMessageToDTO } = await import('../../api/mappers/messaging.mappers')
      mockConvo('INITIATED', true)
      await post(route, body)
      expect(mapMessageToDTO).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }), ADMIN)
    })

    it('accepts a second message before the first one is answered', async () => {
      mockConvo('INITIATED', false)
      await post(route, body)
      expect(reply.statusCode).toBe(200)
      expect(mockNotifierService.notifyProfile).toHaveBeenCalledTimes(1)
    })

    it('returns 403 when the conversation is blocked', async () => {
      mockConvo('BLOCKED', false)
      await post(route, body)
      expect(reply.statusCode).toBe(403)
      expect(mockMessageService.sendMessage).not.toHaveBeenCalled()
    })
  })

  it('still holds a quarantined sender’s message to any other profile', async () => {
    mockConvo('PENDING', true)
    await post('POST /message', { profileId: 'ck1234567890abcd12345678', content: 'hi' })
    expect(mockMessageService.resolveConversation).toHaveBeenCalledWith(
      fastify.prisma,
      'p1',
      'ck1234567890abcd12345678',
      { createAsPending: true }
    )
    expect(mockNotifierService.notifyProfile).not.toHaveBeenCalled()
  })

  it('POST /help returns 401 when session missing', async () => {
    await post('POST /help', { content: 'hi' }, {})
    expect(reply.statusCode).toBe(401)
  })

  it.each([{}, { content: '   ' }])('POST /help returns 400 for %o', async (body) => {
    await post('POST /help', body)
    expect(reply.statusCode).toBe(400)
  })

  it('POST /help returns 503 when no system profile is configured', async () => {
    const { appConfig } = await import('@/lib/appconfig')
    appConfig.ADMIN_PROFILE_ID = undefined
    await post('POST /help', { content: 'hi' })
    appConfig.ADMIN_PROFILE_ID = ADMIN
    expect(reply.statusCode).toBe(503)
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

  it('new_conversation outcome: wasCreated=true, no accept/promote', async () => {
    const handler = fastify.routes['POST /message']
    mockSend({
      convo: { id: 'conv1', status: 'INITIATED', initiatorProfileId: senderProfileId },
      wasCreated: true,
    })

    await handler({ session: { profileId: senderProfileId }, body: validBody } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.outcome).toBeUndefined()
    expect(mockMessageService.acceptConversationOnReply).not.toHaveBeenCalled()
    expect(mockMessageService.promoteConversation).not.toHaveBeenCalled()
  })

  it('accepted_on_reply outcome: non-initiator replies into INITIATED', async () => {
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

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.outcome).toBeUndefined()
    expect(mockMessageService.acceptConversationOnReply).toHaveBeenCalledWith(
      fastify.prisma,
      'conv1'
    )
  })

  it('reply outcome: ACCEPTED convo, no accept/promote', async () => {
    const handler = fastify.routes['POST /message']
    mockSend({
      convo: { id: 'conv1', status: 'ACCEPTED', initiatorProfileId: 'other-user' },
      wasCreated: false,
    })

    await handler({ session: { profileId: senderProfileId }, body: validBody } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.outcome).toBeUndefined()
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

  it('calls markMatchAsSeen on every non-blocked send outcome', async () => {
    // Engagement-clears-isNew contract: once the sender has acted on a match
    // (any outcome other than 'blocked', which throws upstream), the match is
    // no longer "new" from their inbox's perspective. Idempotent at the DB
    // layer, so calling on duplicates is harmless.
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

    // Case 2: reply in ACCEPTED convo → called
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
    expect(markSpy).toHaveBeenCalledTimes(1)

    // Case 3: accepted_on_reply → called
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
    expect(markSpy).toHaveBeenCalledTimes(1)

    // Case 4: duplicate reply → still called (idempotent at the DB layer; the
    // dedupe short-circuit happens deeper in sendMessage, not here).
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
    expect(markSpy).toHaveBeenCalledTimes(1)
  })
})

describe('POST /voice', () => {
  // The notifier renders the voice label in the recipient's language; the
  // route only forwards the raw message.
  it('passes the voice message preview to the notifier', async () => {
    const handler = fastify.routes['POST /voice']

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
      message: { id: 'm1', senderId: 'p1', content: '', messageType: 'audio/voice' },
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
        preview: { content: '', messageType: 'audio/voice' },
        path: '/inbox',
      })
    )
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

  it('new_conversation outcome: wasCreated=true, no accept/promote', async () => {
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
    expect(reply.payload.outcome).toBeUndefined()
    expect(mockMessageService.acceptConversationOnReply).not.toHaveBeenCalled()
  })

  it('reply outcome: ACCEPTED convo, no accept/promote', async () => {
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
    expect(reply.payload.outcome).toBeUndefined()
    expect(mockMessageService.acceptConversationOnReply).not.toHaveBeenCalled()
  })

  it('accepted_on_reply outcome: non-initiator replies into INITIATED', async () => {
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
    expect(reply.payload.outcome).toBeUndefined()
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

  it('calls markMatchAsSeen on every non-blocked send outcome', async () => {
    // Voice route shares sendAndBuildResponse with the text route, so the
    // engagement-clears-isNew contract holds identically. 'blocked' throws
    // upstream, so by here every outcome is engagement.
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

    // Case 2: reply in ACCEPTED convo → called
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
    expect(markSpy).toHaveBeenCalledTimes(1)

    // Case 3: accepted_on_reply → called
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
    expect(markSpy).toHaveBeenCalledTimes(1)

    // Case 4: duplicate reply → still called (idempotent at the DB layer).
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
    expect(markSpy).toHaveBeenCalledTimes(1)
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

describe('profile-trust integration', () => {
  const validBody = { profileId: 'ck1234567890abcd12345678', content: 'hello' }
  const senderProfileId = 'p1'

  function mockNewConversationSend() {
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: { id: 'conv1', status: 'INITIATED', initiatorProfileId: senderProfileId },
      wasCreated: true,
    })
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1', senderId: senderProfileId },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'ACTIVE' },
    })
  }

  function mockReplySend() {
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: { id: 'conv1', status: 'ACCEPTED', initiatorProfileId: 'other-user' },
      wasCreated: false,
    })
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1', senderId: senderProfileId },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'ACTIVE' },
    })
  }

  // Gate removed: quarantined senders no longer get 403 — they're shadow-banned to PENDING.
  it('does not reject quarantined senders with 403 (shadow-ban pivot)', async () => {
    const handler = fastify.routes['POST /message']
    mockTrustService.hasTrustFlag.mockResolvedValue(true)
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: { id: 'conv1', status: 'PENDING', initiatorProfileId: senderProfileId },
      wasCreated: true,
    })
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1', senderId: senderProfileId },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'PENDING' },
    })

    await handler({ session: { profileId: senderProfileId }, body: validBody } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(mockMessageService.resolveConversation).toHaveBeenCalled()
  })

  // PENDING outcome: quarantined sender writes a new convo → PENDING, no recipient side effects.
  it('quarantined sender: PENDING outcome suppresses notifications, runs reconcile', async () => {
    const { broadcastToProfile } = await import('../../utils/wsUtils')
    ;(broadcastToProfile as any).mockClear()

    mockTrustService.hasTrustFlag.mockResolvedValue(true)
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: { id: 'conv1', status: 'PENDING', initiatorProfileId: senderProfileId },
      wasCreated: true,
    })
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1', senderId: senderProfileId },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'PENDING' },
    })

    const handler = fastify.routes['POST /message']
    await handler({ session: { profileId: senderProfileId }, body: validBody } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.outcome).toBeUndefined()
    // No WS broadcast / web-push / email.
    const newMessageCalls = (broadcastToProfile as any).mock.calls.filter(
      (c: any) => c[2]?.type === 'ws:new_message'
    )
    expect(newMessageCalls).toHaveLength(0)
    expect(mockNotifierService.notifyProfile).not.toHaveBeenCalled()
    // But reconcile WAS run.
    expect(mockTrustService.reconcileSpamBurst).toHaveBeenCalledWith(senderProfileId)
    // resolveConversation received createAsPending: true
    expect(mockMessageService.resolveConversation).toHaveBeenCalledWith(
      fastify.prisma,
      senderProfileId,
      'ck1234567890abcd12345678',
      { createAsPending: true }
    )
  })

  // accept_and_promote_pending: recipient (not quarantined) replies into sender's PENDING.
  it('accept_and_promote_pending: promote + accept, notify, no reconcile', async () => {
    // Bob (p1) is sending into a PENDING initiated by Alice ('other-user').
    mockTrustService.hasTrustFlag.mockResolvedValue(false)
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: { id: 'conv1', status: 'PENDING', initiatorProfileId: 'other-user' },
      wasCreated: false,
    })
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1', senderId: senderProfileId },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'ACCEPTED' },
    })

    const handler = fastify.routes['POST /message']
    await handler({ session: { profileId: senderProfileId }, body: validBody } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(mockMessageService.promoteConversation).toHaveBeenCalledWith(
      fastify.prisma,
      'conv1',
      senderProfileId
    )
    expect(mockMessageService.acceptConversationOnReply).toHaveBeenCalledWith(
      fastify.prisma,
      'conv1'
    )
    expect(mockNotifierService.notifyProfile).toHaveBeenCalled()
    // Sender did NOT add a new row to their own count — no reconcile.
    expect(mockTrustService.reconcileSpamBurst).not.toHaveBeenCalled()
  })

  // Test B — reconcile called on new_conversation
  it('runs reconcileSpamBurst when outcome is new_conversation', async () => {
    const handler = fastify.routes['POST /message']
    mockNewConversationSend()

    await handler({ session: { profileId: senderProfileId }, body: validBody } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(mockTrustService.reconcileSpamBurst).toHaveBeenCalledTimes(1)
    expect(mockTrustService.reconcileSpamBurst).toHaveBeenCalledWith(senderProfileId)
  })

  // Test C — reconcile NOT called on other outcomes (reply)
  it('does not run reconcileSpamBurst when outcome is reply', async () => {
    const handler = fastify.routes['POST /message']
    mockReplySend()

    await handler({ session: { profileId: senderProfileId }, body: validBody } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(mockTrustService.reconcileSpamBurst).not.toHaveBeenCalled()
  })

  // Test D — send succeeds even when reconcile rejects (best-effort)
  it('returns 200 even when reconcileSpamBurst throws (best-effort)', async () => {
    mockTrustService.reconcileSpamBurst.mockRejectedValue(new Error('db down'))

    const handler = fastify.routes['POST /message']
    mockNewConversationSend()

    await handler({ session: { profileId: senderProfileId }, body: validBody } as any, reply as any)

    expect(reply.statusCode).toBe(200)
  })
})

describe('GET /conversations/by-profile/:profileId', () => {
  const validProfileId = 'ck1234567890abcd12345678'

  it('returns 401 when session is missing', async () => {
    const handler = fastify.routes['GET /conversations/by-profile/:profileId']
    await handler({ session: {}, params: { profileId: validProfileId } } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 400 when profileId is not a CUID', async () => {
    const handler = fastify.routes['GET /conversations/by-profile/:profileId']
    await handler(
      {
        session: { profileId: 'p1', hasActiveProfile: true },
        params: { profileId: 'not-a-cuid' },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(400)
  })

  it("returns 400 for the viewer's own profile id", async () => {
    const handler = fastify.routes['GET /conversations/by-profile/:profileId']
    await handler(
      {
        session: { profileId: validProfileId, hasActiveProfile: true },
        params: { profileId: validProfileId },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(400)
    expect(mockProfileService.getProfilePublicById).not.toHaveBeenCalled()
  })

  it('returns 403 when the viewer has no active profile', async () => {
    const handler = fastify.routes['GET /conversations/by-profile/:profileId']
    await handler(
      {
        session: { profileId: 'p1', hasActiveProfile: false },
        params: { profileId: validProfileId },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(403)
    expect(mockProfileService.getProfilePublicById).not.toHaveBeenCalled()
  })

  it('returns 404 when the partner profile is inactive', async () => {
    const handler = fastify.routes['GET /conversations/by-profile/:profileId']
    mockProfileService.getProfilePublicById.mockResolvedValue({
      id: validProfileId,
      blockedProfiles: [],
      isActive: false,
      isCallable: true,
    })
    await handler(
      {
        session: { profileId: 'p1', hasActiveProfile: true },
        params: { profileId: validProfileId },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
    expect(mockMessageService.findConversationSummaryByPartner).not.toHaveBeenCalled()
  })

  it('returns 404 when partner profile is not found', async () => {
    const handler = fastify.routes['GET /conversations/by-profile/:profileId']
    mockProfileService.getProfilePublicById.mockResolvedValue(null)
    await handler(
      {
        session: { profileId: 'p1', hasActiveProfile: true },
        params: { profileId: validProfileId },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })

  it('returns vague 404 when partner has blocked the viewer', async () => {
    const handler = fastify.routes['GET /conversations/by-profile/:profileId']
    mockProfileService.getProfilePublicById.mockResolvedValue({
      id: validProfileId,
      blockedProfiles: [{ id: 'p1' }],
      isActive: true,
      isCallable: true,
    })
    await handler(
      {
        session: { profileId: 'p1', hasActiveProfile: true },
        params: { profileId: validProfileId },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })

  it('returns persisted ConversationSummary when conversation exists', async () => {
    const handler = fastify.routes['GET /conversations/by-profile/:profileId']
    mockProfileService.getProfilePublicById.mockResolvedValue({
      id: validProfileId,
      blockedProfiles: [],
      isActive: true,
      isCallable: true,
    })
    mockMessageService.findConversationSummaryByPartner.mockResolvedValue({ id: 'cp-existing' })
    await handler(
      {
        session: { profileId: 'p1', hasActiveProfile: true },
        params: { profileId: validProfileId },
      } as any,
      reply as any
    )
    expect(mockMessageService.findConversationSummaryByPartner).toHaveBeenCalledWith(
      'p1',
      validProfileId
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    // Mocked mapper returns { id: 'summary', partnerProfile: {} } — proves the
    // persisted-summary branch ran (not the synthesized draft branch).
    expect(reply.payload.conversation.id).toBe('summary')
  })

  it('returns ConversationDraftSummary when no conversation exists', async () => {
    const handler = fastify.routes['GET /conversations/by-profile/:profileId']
    mockProfileService.getProfilePublicById.mockResolvedValue({
      id: validProfileId,
      publicName: 'Partner',
      blockedProfiles: [],
      isActive: true,
      isCallable: true,
    })
    mockMessageService.findConversationSummaryByPartner.mockResolvedValue(null)
    mockProfileService.getProfileById.mockResolvedValue({ id: 'p1', isCallable: true })
    await handler(
      {
        session: { profileId: 'p1', hasActiveProfile: true },
        params: { profileId: validProfileId },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.conversation.isDraft).toBe(true)
    expect(reply.payload.conversation.partnerProfile.id).toBe(validProfileId)
    expect(reply.payload.conversation.canReply).toBe(true)
    expect(reply.payload.conversation.isCallable).toBe(true)
    expect(reply.payload.conversation.myIsCallable).toBe(true)
    // Drafts are not gated on a mutual like.
    expect(mockMessageService.hasMutualLike).not.toHaveBeenCalled()
  })

  it('reflects per-profile isCallable flags in the draft', async () => {
    const handler = fastify.routes['GET /conversations/by-profile/:profileId']
    mockProfileService.getProfilePublicById.mockResolvedValue({
      id: validProfileId,
      publicName: 'Partner',
      blockedProfiles: [],
      isActive: true,
      isCallable: false,
    })
    mockMessageService.findConversationSummaryByPartner.mockResolvedValue(null)
    mockProfileService.getProfileById.mockResolvedValue({ id: 'p1', isCallable: false })
    await handler(
      {
        session: { profileId: 'p1', hasActiveProfile: true },
        params: { profileId: validProfileId },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.conversation.isDraft).toBe(true)
    expect(reply.payload.conversation.isCallable).toBe(false)
    expect(reply.payload.conversation.myIsCallable).toBe(false)
  })

  it('returns 500 when service throws unexpectedly', async () => {
    const handler = fastify.routes['GET /conversations/by-profile/:profileId']
    mockProfileService.getProfilePublicById.mockRejectedValue(new Error('db down'))
    await handler(
      {
        session: { profileId: 'p1', hasActiveProfile: true },
        params: { profileId: validProfileId },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(500)
  })
})

describe('PATCH /message/:id', () => {
  const messageId = 'ck1234567890abcd12345679'
  const recipientId = 'ck1234567890abcd12345678'
  const edited = { id: messageId, senderId: 'p1', content: 'fixed' }

  const edit = (body: any = { content: 'fixed' }, session: any = { profileId: 'p1' }) =>
    fastify.routes['PATCH /message/:id'](
      { session, params: { id: messageId }, body } as any,
      reply as any
    )

  it('returns 401 when session missing', async () => {
    await edit(undefined, {})
    expect(reply.statusCode).toBe(401)
  })

  it('returns 400 for empty content', async () => {
    await edit({ content: '   ' })
    expect(reply.statusCode).toBe(400)
    expect(mockMessageService.editMessage).not.toHaveBeenCalled()
  })

  it('edits the message, returns it, and broadcasts the update to the recipient', async () => {
    const { broadcastToProfile } = await import('../../utils/wsUtils')
    mockMessageService.editMessage.mockResolvedValue({
      message: edited,
      conversation: { status: 'ACCEPTED', profileAId: recipientId, profileBId: 'p1' },
    })

    await edit()

    expect(mockMessageService.editMessage).toHaveBeenCalledWith(
      fastify.prisma,
      messageId,
      'p1',
      'fixed'
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.message).toMatchObject({ id: messageId, isMine: true })
    expect(broadcastToProfile).toHaveBeenCalledWith(
      fastify,
      recipientId,
      expect.objectContaining({ type: 'ws:message_updated' })
    )
  })

  it('never sends web push or email for an edit, even when the recipient is offline', async () => {
    const { broadcastToProfile } = await import('../../utils/wsUtils')
    ;(broadcastToProfile as any).mockReturnValue(false)
    mockMessageService.editMessage.mockResolvedValue({
      message: edited,
      conversation: { status: 'ACCEPTED', profileAId: 'p1', profileBId: recipientId },
    })

    await edit()

    expect(reply.statusCode).toBe(200)
    expect(mockWebPushService.send).not.toHaveBeenCalled()
    expect(mockNotifierService.notifyProfile).not.toHaveBeenCalled()
  })

  it('does not reveal edits in a PENDING conversation to the recipient', async () => {
    const { broadcastToProfile } = await import('../../utils/wsUtils')
    mockMessageService.editMessage.mockResolvedValue({
      message: edited,
      conversation: { status: 'PENDING', profileAId: 'p1', profileBId: recipientId },
    })

    await edit()

    expect(reply.statusCode).toBe(200)
    expect(broadcastToProfile).not.toHaveBeenCalled()
  })

  it.each([
    ['MESSAGE_NOT_FOUND', 404],
    ['MESSAGE_NOT_EDITABLE', 409],
    ['EMPTY_MESSAGE', 400],
  ])('maps %s to %i', async (code, status) => {
    const { MessagingError } = await import('../../services/messaging.service')
    mockMessageService.editMessage.mockRejectedValue(new MessagingError(code as any, 'nope'))

    await edit()

    expect(reply.statusCode).toBe(status)
  })
})
