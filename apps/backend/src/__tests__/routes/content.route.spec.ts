import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockFastify, MockReply } from '../../test-utils/fastify'

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))

let fastify: MockFastify
let reply: MockReply
let mockUserContentService: any
let mockPostService: any
let mockEventService: any
let mockCommunityService: any

vi.mock('@/services/userContent.service', () => ({
  UserContentService: { getInstance: () => mockUserContentService },
}))
vi.mock('@/services/post.service', () => ({
  PostService: { getInstance: () => mockPostService },
}))
vi.mock('@/services/event.service', () => ({
  EventService: { getInstance: () => mockEventService },
}))
vi.mock('@/services/community.service', () => ({
  CommunityService: { getInstance: () => mockCommunityService },
}))

import contentRoutes from '../../api/routes/content.route'

beforeEach(async () => {
  mockUserContentService = {
    findFeed: vi.fn().mockResolvedValue([]),
    findInBounds: vi.fn().mockResolvedValue([]),
    findNearby: vi.fn().mockResolvedValue([]),
    findByProfileId: vi.fn().mockResolvedValue([]),
    findByIdMetadata: vi.fn().mockResolvedValue(null),
  }
  mockPostService = { findByIdHydrated: vi.fn().mockResolvedValue(null) }
  mockEventService = { findByIdHydrated: vi.fn().mockResolvedValue(null) }
  mockCommunityService = { findByIdHydrated: vi.fn().mockResolvedValue(null) }
  fastify = new MockFastify()
  reply = new MockReply()
  await contentRoutes(fastify as any, {})
})

describe('GET /feed', () => {
  it('returns metadata items wrapped in success envelope', async () => {
    const handler = fastify.routes['GET /feed']
    mockUserContentService.findFeed.mockResolvedValue([])
    await handler({ session: { profileId: 'p1' }, query: {} } as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({ success: true, items: [] })
  })

  it('forwards query opts (limit, offset, kind) to findFeed', async () => {
    const handler = fastify.routes['GET /feed']
    await handler(
      { session: { profileId: 'p1' }, query: { limit: '5', offset: '10', kind: 'event' } } as any,
      reply as any
    )
    expect(mockUserContentService.findFeed).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 5, offset: 10, kind: 'event' })
    )
  })
})

describe('GET /bounds', () => {
  it('parses bounds and calls findInBounds', async () => {
    const handler = fastify.routes['GET /bounds']
    await handler(
      {
        session: { profileId: 'p1' },
        query: { south: '40', north: '50', west: '10', east: '20' },
      } as any,
      reply as any
    )
    expect(mockUserContentService.findInBounds).toHaveBeenCalledWith({
      south: 40,
      north: 50,
      west: 10,
      east: 20,
    })
    expect(reply.statusCode).toBe(200)
  })

  it('returns 400 on invalid bounds', async () => {
    const handler = fastify.routes['GET /bounds']
    await handler({ session: { profileId: 'p1' }, query: {} } as any, reply as any)
    expect(reply.statusCode).toBe(400)
  })
})

describe('GET /nearby', () => {
  it('calls findNearby with parsed lat/lon/radius', async () => {
    const handler = fastify.routes['GET /nearby']
    await handler(
      { session: { profileId: 'p1' }, query: { lat: '50', lon: '14', radius: '25' } } as any,
      reply as any
    )
    expect(mockUserContentService.findNearby).toHaveBeenCalledWith(50, 14, 25, expect.any(Object))
  })
})

describe('GET /profile/:profileId', () => {
  it('calls findByProfileId with includeInvisible=true when viewer is owner', async () => {
    const handler = fastify.routes['GET /profile/:profileId']
    await handler(
      { session: { profileId: 'pself' }, params: { profileId: 'pself' }, query: {} } as any,
      reply as any
    )
    expect(mockUserContentService.findByProfileId).toHaveBeenCalledWith(
      'pself',
      expect.objectContaining({ includeInvisible: true })
    )
  })

  it('calls findByProfileId with includeInvisible=false for stranger', async () => {
    const handler = fastify.routes['GET /profile/:profileId']
    await handler(
      { session: { profileId: 'viewer' }, params: { profileId: 'other' }, query: {} } as any,
      reply as any
    )
    expect(mockUserContentService.findByProfileId).toHaveBeenCalledWith(
      'other',
      expect.objectContaining({ includeInvisible: false })
    )
  })
})

describe('GET /:id (unified detail)', () => {
  it('returns 404 when row not found', async () => {
    const handler = fastify.routes['GET /:id']
    mockUserContentService.findByIdMetadata.mockResolvedValue(null)
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'cuc00000000000000001' } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })

  it('dispatches to PostService.findByIdHydrated when kind=post', async () => {
    const handler = fastify.routes['GET /:id']
    mockUserContentService.findByIdMetadata.mockResolvedValue({
      id: 'cuc00000000000000001',
      kind: 'post',
      postedById: 'someone',
    })
    mockPostService.findByIdHydrated.mockResolvedValue({
      id: 'cuc00000000000000001',
      kind: 'post',
      content: 'x',
      isDeleted: false,
      isVisible: true,
      country: null,
      cityName: null,
      lat: null,
      lon: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      postedById: 'someone',
      post: { userContentId: 'cuc00000000000000001', type: 'OFFER' },
      postedBy: {
        id: 'someone',
        publicName: 'X',
        profileImages: [],
        conversationAsA: [],
        conversationAsB: [],
      },
    })
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'cuc00000000000000001' } } as any,
      reply as any
    )
    expect(mockPostService.findByIdHydrated).toHaveBeenCalled()
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({ success: true })
  })

  it('dispatches to EventService.findByIdHydrated when kind=event', async () => {
    const handler = fastify.routes['GET /:id']
    mockUserContentService.findByIdMetadata.mockResolvedValue({
      id: 'cuc00000000000000002',
      kind: 'event',
      postedById: 'someone',
    })
    mockEventService.findByIdHydrated.mockResolvedValue({
      id: 'cuc00000000000000002',
      kind: 'event',
      content: 'party',
      isDeleted: false,
      isVisible: true,
      country: null,
      cityName: null,
      lat: null,
      lon: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      postedById: 'someone',
      event: {
        userContentId: 'cuc00000000000000002',
        startsAt: new Date('2027-01-01'),
        venue: null,
      },
      postedBy: {
        id: 'someone',
        publicName: 'Y',
        profileImages: [],
        conversationAsA: [],
        conversationAsB: [],
      },
    })
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'cuc00000000000000002' } } as any,
      reply as any
    )
    expect(mockEventService.findByIdHydrated).toHaveBeenCalled()
    expect(reply.statusCode).toBe(200)
  })

  it('dispatches to CommunityService.findByIdHydrated when kind=community', async () => {
    const handler = fastify.routes['GET /:id']
    mockUserContentService.findByIdMetadata.mockResolvedValue({
      id: 'cuc00000000000000003',
      kind: 'community',
      postedById: 'someone',
    })
    mockCommunityService.findByIdHydrated.mockResolvedValue({
      id: 'cuc00000000000000003',
      kind: 'community',
      content: 'guild',
      isDeleted: false,
      isVisible: true,
      country: null,
      cityName: null,
      lat: null,
      lon: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      postedById: 'someone',
      community: { userContentId: 'cuc00000000000000003', yearFounded: 1998 },
      postedBy: {
        id: 'someone',
        publicName: 'Z',
        profileImages: [],
        conversationAsA: [],
        conversationAsB: [],
      },
    })
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'cuc00000000000000003' } } as any,
      reply as any
    )
    expect(mockCommunityService.findByIdHydrated).toHaveBeenCalled()
    expect(reply.statusCode).toBe(200)
  })

  it('uses owner mapper when viewer === postedById', async () => {
    const handler = fastify.routes['GET /:id']
    mockUserContentService.findByIdMetadata.mockResolvedValue({
      id: 'cuc00000000000000001',
      kind: 'post',
      postedById: 'p1', // same as session
    })
    mockPostService.findByIdHydrated.mockResolvedValue({
      id: 'cuc00000000000000001',
      kind: 'post',
      content: 'x',
      isDeleted: false,
      isVisible: true,
      country: null,
      cityName: null,
      lat: null,
      lon: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      postedById: 'p1',
      post: { userContentId: 'cuc00000000000000001', type: 'OFFER' },
      postedBy: {
        id: 'p1',
        publicName: 'X',
        profileImages: [],
        conversationAsA: [],
        conversationAsB: [],
      },
    })
    await handler(
      { session: { profileId: 'p1' }, params: { id: 'cuc00000000000000001' } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({
      success: true,
      item: expect.objectContaining({ isOwn: true }),
    })
  })
})
