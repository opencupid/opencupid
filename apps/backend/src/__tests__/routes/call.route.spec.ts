import { describe, it, expect, beforeEach, vi } from 'vitest'
import callRoutes from '../../api/routes/call.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))

let fastify: MockFastify
let reply: MockReply
let mockCallService: any

vi.mock('../../services/call.service', () => ({
  CallService: { getInstance: () => mockCallService },
}))

vi.mock('../../utils/wsUtils', () => ({
  broadcastToProfile: vi.fn(() => true),
}))

beforeEach(async () => {
  fastify = new MockFastify()
  fastify.prisma = {
    $transaction: vi.fn((fn: any) => fn({})),
    conversation: {
      findUnique: vi.fn(),
    },
  } as any
  reply = new MockReply()
  mockCallService = {
    initiateCall: vi.fn(),
    insertMissedCallMessage: vi.fn(),
    updateCallableStatus: vi.fn(),
  }
  await callRoutes(fastify as any, {})
})

describe('POST / (initiate call)', () => {
  it('returns 401 when session missing', async () => {
    const handler = fastify.routes['POST /']
    await handler({ session: {}, body: {} } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 400 for invalid body', async () => {
    const handler = fastify.routes['POST /']
    await handler({ session: { profileId: 'p1' }, body: {} } as any, reply as any)
    expect(reply.statusCode).toBe(400)
  })

  it('returns 200 and roomName on success', async () => {
    const handler = fastify.routes['POST /']
    mockCallService.initiateCall.mockResolvedValue({
      roomName: 'room-123',
      calleeProfileId: 'p2',
      callerPublicName: 'Alice',
    })
    fastify.prisma.$transaction = vi.fn((fn: any) => fn({}))

    await handler(
      {
        session: { profileId: 'p1' },
        body: { conversationId: 'ck1234567890abcd12345678' },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.roomName).toBe('room-123')
  })
})

describe('POST /:conversationId/accept', () => {
  it('returns 401 when session missing', async () => {
    const handler = fastify.routes['POST /:conversationId/accept']
    await handler({ session: {}, params: {} } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 404 when conversation not found', async () => {
    const handler = fastify.routes['POST /:conversationId/accept']
    fastify.prisma.conversation.findUnique = vi.fn().mockResolvedValue(null)
    await handler(
      {
        session: { profileId: 'p1' },
        params: { conversationId: 'ck1234567890abcd12345678' },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })
})

describe('POST /:conversationId/decline', () => {
  it('returns 401 when session missing', async () => {
    const handler = fastify.routes['POST /:conversationId/decline']
    await handler({ session: {}, params: {} } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 200 and inserts missed call on decline', async () => {
    const handler = fastify.routes['POST /:conversationId/decline']
    fastify.prisma.conversation.findUnique = vi.fn().mockResolvedValue({
      id: 'ck1234567890abcd12345678',
      participants: [{ profileId: 'p1' }, { profileId: 'p2' }],
    })
    fastify.prisma.$transaction = vi.fn((fn: any) => fn({}))

    await handler(
      {
        session: { profileId: 'p1' },
        params: { conversationId: 'ck1234567890abcd12345678' },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(mockCallService.insertMissedCallMessage).toHaveBeenCalled()
  })
})

describe('POST /:conversationId/cancel', () => {
  it('returns 200 and inserts missed call on cancel', async () => {
    const handler = fastify.routes['POST /:conversationId/cancel']
    fastify.prisma.conversation.findUnique = vi.fn().mockResolvedValue({
      id: 'ck1234567890abcd12345678',
      participants: [{ profileId: 'p1' }, { profileId: 'p2' }],
    })
    fastify.prisma.$transaction = vi.fn((fn: any) => fn({}))

    await handler(
      {
        session: { profileId: 'p1' },
        params: { conversationId: 'ck1234567890abcd12345678' },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(mockCallService.insertMissedCallMessage).toHaveBeenCalled()
  })
})

describe('PATCH /:conversationId/callable', () => {
  it('returns 401 when session missing', async () => {
    const handler = fastify.routes['PATCH /:conversationId/callable']
    await handler({ session: {}, params: {}, body: {} } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 200 on successful update', async () => {
    const handler = fastify.routes['PATCH /:conversationId/callable']
    mockCallService.updateCallableStatus.mockResolvedValue({})

    await handler(
      {
        session: { profileId: 'p1' },
        params: { conversationId: 'ck1234567890abcd12345678' },
        body: { isCallable: false },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(mockCallService.updateCallableStatus).toHaveBeenCalledWith(
      'ck1234567890abcd12345678',
      'p1',
      false
    )
  })
})
