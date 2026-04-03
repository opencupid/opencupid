import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MockFastify, MockReply } from '../../test-utils/fastify'

const mockFindInBounds = vi.fn()

vi.mock('@/services/browse.service', () => ({
  BrowseService: {
    getInstance: () => ({ findInBounds: mockFindInBounds }),
  },
}))

import browseRoutes from '../../api/routes/browse.route'

let fastify: MockFastify
let reply: MockReply

const mockSession = {
  profileId: 'profile-123',
  lang: 'en',
}

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  vi.clearAllMocks()
  await browseRoutes(fastify as any, {})
})

describe('GET /bounds', () => {
  it('returns 400 when bounds params are missing', async () => {
    const handler = fastify.routes['GET /bounds']
    await handler({ query: {}, session: mockSession, log: { error: vi.fn() } } as any, reply as any)
    expect(reply.statusCode).toBe(400)
    expect(reply.payload.success).toBe(false)
  })

  it('returns 400 when any bound param is non-numeric', async () => {
    const handler = fastify.routes['GET /bounds']
    await handler(
      {
        query: { south: 'abc', north: '47.5', west: '18.0', east: '19.0' },
        session: mockSession,
        log: { error: vi.fn() },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(400)
  })

  it('returns profiles, posts and tags for valid bounds', async () => {
    mockFindInBounds.mockResolvedValue({
      profiles: [{ id: 'p1', publicName: 'Mónika', tags: [] }],
      posts: [{ id: 'post1', title: 'Cherry harvest' }],
      tags: [{ id: 't1', name: 'Biokert', slug: 'biokert' }],
    })

    const handler = fastify.routes['GET /bounds']
    await handler(
      {
        query: { south: '46.5', north: '47.5', west: '18.0', east: '19.0' },
        session: mockSession,
        log: { error: vi.fn() },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.profiles).toHaveLength(1)
    expect(reply.payload.posts).toHaveLength(1)
    expect(reply.payload.tags).toHaveLength(1)
    expect(mockFindInBounds).toHaveBeenCalledWith(
      'profile-123',
      { south: 46.5, north: 47.5, west: 18.0, east: 19.0 },
      'en'
    )
  })

  it('returns 500 when service throws', async () => {
    mockFindInBounds.mockRejectedValue(new Error('DB error'))

    const handler = fastify.routes['GET /bounds']
    await handler(
      {
        query: { south: '46.5', north: '47.5', west: '18.0', east: '19.0' },
        session: mockSession,
        log: { error: vi.fn() },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(500)
    expect(reply.payload.success).toBe(false)
  })
})
