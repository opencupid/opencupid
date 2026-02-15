import { describe, it, expect, beforeEach, vi } from 'vitest'
import interactionRoutes from '../../api/routes/interaction.route'
import { MockFastify, MockReply } from '../../test-utils/fastify'

let fastify: MockFastify
let reply: MockReply
let mockService: any

vi.mock('../../services/interaction.service', () => ({
  InteractionService: { getInstance: () => mockService },
}))
vi.mock('../../utils/wsUtils', () => ({
  broadcastToProfile: vi.fn().mockReturnValue(true),
}))
vi.mock('../../services/webpush.service', () => ({
  WebPushService: class {},
}))
vi.mock('../../services/notifier.service', () => ({
  notifierService: { notifyProfile: vi.fn() },
}))
vi.mock('@/lib/appconfig', () => ({
  appConfig: {
    FRONTEND_URL: 'http://test',
  },
}))

const makeReq = (overrides: any = {}) => ({
  session: { profileId: 'p1' },
  ...overrides,
})

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  mockService = {
    getLikesSent: vi.fn().mockResolvedValue([]),
    getMatches: vi.fn().mockResolvedValue([]),
    getLikesReceivedCount: vi.fn().mockResolvedValue(0),
    getNewMatchesCount: vi.fn().mockResolvedValue(0),
    like: vi.fn(),
    pass: vi.fn(),
  }
  await interactionRoutes(fastify as any, {})
})

describe('GET / (interaction stats)', () => {
  it('returns stats on success', async () => {
    const handler = fastify.routes['GET /']
    mockService.getLikesSent.mockResolvedValue([{ id: '1' }])
    mockService.getMatches.mockResolvedValue([{ id: '2' }])
    mockService.getLikesReceivedCount.mockResolvedValue(5)
    mockService.getNewMatchesCount.mockResolvedValue(2)

    await handler(makeReq(), reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.stats.receivedLikesCount).toBe(5)
    expect(reply.payload.stats.newMatchesCount).toBe(2)
  })

  it('returns 500 on error', async () => {
    const handler = fastify.routes['GET /']
    mockService.getLikesSent.mockRejectedValue(new Error('fail'))

    await handler(makeReq(), reply as any)
    expect(reply.statusCode).toBe(500)
  })
})

describe('POST /like/:targetId', () => {
  it('likes a profile and returns the pair', async () => {
    const handler = fastify.routes['POST /like/:targetId']
    const pair = {
      isMatch: false,
      to: { profile: { id: 'p2' }, isMatch: false, createdAt: new Date().toISOString() },
      from: { profile: { id: 'p1' }, isMatch: false, createdAt: new Date().toISOString() },
    }
    mockService.like.mockResolvedValue(pair)

    const req = makeReq({ params: { targetId: 'cm000000000000000000000p2' } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.pair).toBe(pair)
  })

  it('returns 500 on error', async () => {
    const handler = fastify.routes['POST /like/:targetId']
    mockService.like.mockRejectedValue(new Error('fail'))

    const req = makeReq({ params: { targetId: 'cm000000000000000000000p2' } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(500)
  })
})

describe('POST /pass/:targetId', () => {
  it('passes a profile', async () => {
    const handler = fastify.routes['POST /pass/:targetId']
    mockService.pass.mockResolvedValue(undefined)

    const req = makeReq({ params: { targetId: 'cm000000000000000000000p2' } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
  })

  it('returns 500 on error', async () => {
    const handler = fastify.routes['POST /pass/:targetId']
    mockService.pass.mockRejectedValue(new Error('fail'))

    const req = makeReq({ params: { targetId: 'cm000000000000000000000p2' } })
    await handler(req, reply as any)
    expect(reply.statusCode).toBe(500)
  })
})

describe('GET /received', () => {
  it('returns received likes count', async () => {
    const handler = fastify.routes['GET /received']
    mockService.getLikesReceivedCount.mockResolvedValue(3)

    await handler(makeReq(), reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.count).toBe(3)
  })
})

describe('GET /sent', () => {
  it('returns sent likes', async () => {
    const handler = fastify.routes['GET /sent']
    const edges = [{ profile: { id: 'p2' }, isMatch: false }]
    mockService.getLikesSent.mockResolvedValue(edges)

    await handler(makeReq(), reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.edges).toBe(edges)
  })
})

describe('GET /matches', () => {
  it('returns matches', async () => {
    const handler = fastify.routes['GET /matches']
    const edges = [{ profile: { id: 'p2' }, isMatch: true }]
    mockService.getMatches.mockResolvedValue(edges)

    await handler(makeReq(), reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.edges).toBe(edges)
  })
})
