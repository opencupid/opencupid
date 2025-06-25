import { describe, it, expect, beforeEach, vi } from 'vitest'
import messageRoutes from '../../api/routes/messaging.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply
let mockMessageService: any
let mockWebPushService: any

vi.mock('../../services/messaging.service', () => ({
  MessageService: { getInstance: () => mockMessageService }
}))

vi.mock('../../services/webpush.service', () => ({
  WebPushService: { getInstance: () => mockWebPushService }
}))

vi.mock('../../api/mappers/messaging.mappers', () => ({
  mapMessageForMessageList: vi.fn((m: any) => ({ ...m, mapped: true })),
  mapConversationParticipantToSummary: vi.fn(() => ({ id: 'summary', partnerProfile: {} })),
  mapMessageDTO: vi.fn(() => ({ id: 'dto' }))
}))

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  mockMessageService = {
    listMessagesForConversation: vi.fn(),
    listConversationsForProfile: vi.fn(),
    markConversationRead: vi.fn(),
    getConversationSummary: vi.fn(),
    initiateConversation: vi.fn(),
    replyInConversation: vi.fn(),
  }
  mockWebPushService = { send: vi.fn() }
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
    const msg = { id: 'm1', conversationId: 'c1', senderId: 'p1', content: 'hi', createdAt: new Date(), sender: { profileImages: [] } }
    mockMessageService.listMessagesForConversation.mockResolvedValue([msg])
    await handler({ session: { profileId: 'p1' }, params: { id: 'ck1234567890abcd12345678' } } as any, reply as any)
    expect(mockMessageService.listMessagesForConversation).toHaveBeenCalledWith('ck1234567890abcd12345678')
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.messages[0].mapped).toBe(true)
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
    await handler({ session: { profileId: 'p1' }, params: { id: 'ck1234567890abcd12345678' } } as any, reply as any)
    expect(mockMessageService.markConversationRead).toHaveBeenCalledWith('ck1234567890abcd12345678', 'p1')
    expect(reply.statusCode).toBe(404)
  })

  it('marks conversation read and returns summary', async () => {
    const handler = fastify.routes['POST /conversations/:id/mark-read']
    mockMessageService.getConversationSummary.mockResolvedValue({})
    await handler({ session: { profileId: 'p1' }, params: { id: 'ck1234567890abcd12345678' } } as any, reply as any)
    expect(mockMessageService.markConversationRead).toHaveBeenCalledWith('ck1234567890abcd12345678', 'p1')
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.conversation.id).toBe('summary')
  })
})
