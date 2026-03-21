import { describe, it, expect, beforeEach, vi } from 'vitest'
import messageMediaRoutes from '../../api/routes/messageMedia.route'
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
    MEDIA_UPLOAD_DIR: '/tmp/test-media',
    VOICE_MESSAGE_MAX_DURATION: 120,
    IMAGE_MESSAGE_MAX_SIZE: 10485760,
  },
}))

vi.mock('@/lib/media', () => ({
  MEDIA_SUBDIR: { VOICE: 'voice', MESSAGE_IMAGES: 'message-images' },
  getMediaRoot: vi.fn(() => '/tmp/test-media'),
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
        'notifications.image_message_sent': 'Sent an image',
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

vi.mock('../../services/messageImage.service', () => ({
  MessageImageService: {
    getInstance: () => mockMessageImageService,
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

vi.mock('cuid', () => ({
  default: { slug: vi.fn(() => 'test-slug') },
}))

let mockMessageImageService: any

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
  mockMessageImageService = {
    processMessageImage: vi.fn().mockResolvedValue({
      inlinePath: '/tmp/test-media/message-images/p1/slug-inline.webp',
      fullPath: '/tmp/test-media/message-images/p1/slug-full.webp',
      inlineSize: 512,
      fullSize: 1024,
    }),
  }
  fastify.prisma = {
    $transaction: vi.fn(async (fn: any) => fn(fastify.prisma)),
    profile: {
      findUnique: vi.fn().mockResolvedValue({ user: { language: 'en' } }),
    },
  }
  await messageMediaRoutes(fastify as any, {})
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

    mockMessageService.sendOrStartConversation.mockRejectedValue(new Error('db error'))

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

    expect(reply.statusCode).toBe(403)
    expect(fs.promises.unlink).toHaveBeenCalled()
  })

  it('skips broadcast when isDuplicate', async () => {
    const { broadcastToProfile } = await import('../../utils/wsUtils')
    ;(broadcastToProfile as any).mockClear()

    const handler = fastify.routes['POST /voice']
    mockMessageService.sendOrStartConversation.mockResolvedValue({
      convoId: 'conv1',
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

describe('POST /image', () => {
  it('returns 401 when session missing', async () => {
    const handler = fastify.routes['POST /image']
    await handler({ session: {} } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 400 when no image file provided', async () => {
    const handler = fastify.routes['POST /image']
    const parts = (async function* () {
      yield { type: 'field', fieldname: 'profileId', value: 'ck1234567890abcd12345678' }
    })()

    await handler({ session: { profileId: 'p1' }, parts: () => parts } as any, reply as any)
    expect(reply.statusCode).toBe(400)
    expect(reply.payload.message).toMatch('No image file provided')
  })

  it('returns 400 for invalid image mime type', async () => {
    const handler = fastify.routes['POST /image']
    const parts = (async function* () {
      yield {
        type: 'file',
        fieldname: 'image',
        filename: 'hack.exe',
        mimetype: 'application/octet-stream',
        toBuffer: async () => Buffer.alloc(100),
      }
      yield { type: 'field', fieldname: 'profileId', value: 'ck1234567890abcd12345678' }
    })()

    await handler({ session: { profileId: 'p1' }, parts: () => parts } as any, reply as any)
    expect(reply.statusCode).toBe(400)
    expect(reply.payload.message).toMatch('Invalid image file type')
  })

  it('returns 400 for missing profileId', async () => {
    const handler = fastify.routes['POST /image']
    const parts = (async function* () {
      yield {
        type: 'file',
        fieldname: 'image',
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
        toBuffer: async () => Buffer.alloc(100),
      }
      // missing profileId
    })()

    await handler({ session: { profileId: 'p1' }, parts: () => parts } as any, reply as any)
    expect(reply.statusCode).toBe(400)
    expect(reply.payload.message).toMatch('Invalid image message parameters')
  })

  it('sends image message and returns response', async () => {
    const handler = fastify.routes['POST /image']

    mockMessageService.sendOrStartConversation.mockResolvedValue({
      convoId: 'conv1',
      message: { id: 'm1', senderId: 'p1' },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'ACTIVE' },
    })

    const parts = (async function* () {
      yield {
        type: 'file',
        fieldname: 'image',
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
        toBuffer: async () => Buffer.alloc(100),
      }
      yield { type: 'field', fieldname: 'profileId', value: 'ck1234567890abcd12345678' }
    })()

    await handler({ session: { profileId: 'p1' }, parts: () => parts } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(mockMessageImageService.processMessageImage).toHaveBeenCalledWith(
      expect.any(Buffer),
      'p1',
      expect.any(String)
    )
    expect(mockMessageService.sendOrStartConversation).toHaveBeenCalledWith(
      fastify.prisma,
      'p1',
      'ck1234567890abcd12345678',
      '',
      'image/webp',
      expect.objectContaining({
        mimeType: 'image/webp',
        duration: null,
      })
    )
  })

  it('broadcasts notification for image message', async () => {
    const { broadcastToProfile } = await import('../../utils/wsUtils')
    ;(broadcastToProfile as any).mockReturnValue(false)

    const handler = fastify.routes['POST /image']

    mockMessageService.sendOrStartConversation.mockResolvedValue({
      convoId: 'conv1',
      message: { id: 'm1', senderId: 'p1' },
      isDuplicate: false,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'ACTIVE' },
    })

    const parts = (async function* () {
      yield {
        type: 'file',
        fieldname: 'image',
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
        toBuffer: async () => Buffer.alloc(100),
      }
      yield { type: 'field', fieldname: 'profileId', value: 'ck1234567890abcd12345678' }
    })()

    await handler({ session: { profileId: 'p1' }, parts: () => parts } as any, reply as any)

    expect(mockNotifierService.notifyProfile).toHaveBeenCalledWith(
      'ck1234567890abcd12345678',
      'new_message',
      expect.objectContaining({
        sender: 'TestSender',
        message: 'Sent an image',
        link: 'http://test/inbox',
      })
    )
  })

  it('cleans up files when message creation fails', async () => {
    const fs = await import('fs')
    const handler = fastify.routes['POST /image']

    mockMessageService.sendOrStartConversation.mockRejectedValue(new Error('db error'))

    const parts = (async function* () {
      yield {
        type: 'file',
        fieldname: 'image',
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
        toBuffer: async () => Buffer.alloc(100),
      }
      yield { type: 'field', fieldname: 'profileId', value: 'ck1234567890abcd12345678' }
    })()

    await handler({ session: { profileId: 'p1' }, parts: () => parts } as any, reply as any)

    expect(reply.statusCode).toBe(403)
    expect(fs.promises.unlink).toHaveBeenCalledTimes(2) // inline + full
  })

  it('skips broadcast and notification when isDuplicate', async () => {
    const { broadcastToProfile } = await import('../../utils/wsUtils')
    ;(broadcastToProfile as any).mockClear()

    const handler = fastify.routes['POST /image']
    mockMessageService.sendOrStartConversation.mockResolvedValue({
      convoId: 'conv1',
      message: { id: 'm1', senderId: 'p1' },
      isDuplicate: true,
    })
    mockMessageService.getConversationSummary.mockResolvedValue({
      conversation: { status: 'ACTIVE' },
    })

    const parts = (async function* () {
      yield {
        type: 'file',
        fieldname: 'image',
        filename: 'photo.jpg',
        mimetype: 'image/jpeg',
        toBuffer: async () => Buffer.alloc(100),
      }
      yield { type: 'field', fieldname: 'profileId', value: 'ck1234567890abcd12345678' }
    })()

    await handler({ session: { profileId: 'p1' }, parts: () => parts } as any, reply as any)

    expect(reply.statusCode).toBe(200)
    const newMessageCalls = (broadcastToProfile as any).mock.calls.filter(
      (c: any) => c[2]?.type === 'ws:new_message'
    )
    expect(newMessageCalls).toHaveLength(0)
    expect(mockNotifierService.notifyProfile).not.toHaveBeenCalled()
  })
})
