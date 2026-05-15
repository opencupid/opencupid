import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockFastify, MockReply } from '../../../test-utils/fastify'

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))

let fastify: MockFastify
let reply: MockReply
let mockPostService: any
let mockCluster: any

vi.mock('@/services/post.service', () => ({
  PostService: { getInstance: () => mockPostService },
}))
vi.mock('@/services/cluster.service', () => ({
  ClusterService: { getInstance: () => mockCluster },
}))

vi.mock('@/api/mappers/post.mappers', () => ({
  mapDbPostToOwner: (row: any) => ({ ...row, _isOwn: true }),
  mapDbPostToDetail: (row: any) => ({ ...row, _isOwn: false }),
  mapDbPostToPublic: (row: any) => ({ id: row.id, _public: true }),
}))

import postRoutes from '../../../api/routes/content/post.route'

const ownerProfileId = 'cmprofile00000000000o1'
const otherProfileId = 'cmprofile00000000000v1'
const postId = 'cmpost000000000000001'

const makeRow = (postedById: string) => ({
  id: postId,
  kind: 'post',
  content: 'hello',
  isDeleted: false,
  isVisible: true,
  country: null,
  cityName: null,
  lat: null,
  lon: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  postedById,
  post: { userContentId: postId, type: 'OFFER' },
  postedBy: { id: postedById, publicName: 'X', galleryImages: [] },
})

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  mockPostService = {
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findByIdHydrated: vi.fn(),
    findByProfileIdHydrated: vi.fn(),
    findFeedHydrated: vi.fn(),
    findNearbyHydrated: vi.fn(),
  }
  mockCluster = { evictAll: vi.fn().mockResolvedValue(undefined) }
  await postRoutes(fastify as any, {})
})

describe('POST /', () => {
  it('returns 401 when no profile', async () => {
    const handler = fastify.routes['POST /']
    await handler({ session: {}, body: {} } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('creates and returns owner DTO', async () => {
    const handler = fastify.routes['POST /']
    mockPostService.create.mockResolvedValue(makeRow(ownerProfileId))
    await handler(
      { session: { profileId: ownerProfileId }, body: { content: 'hello', type: 'OFFER' } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(201)
    expect(reply.payload).toMatchObject({
      success: true,
      post: expect.objectContaining({ _isOwn: true }),
    })
    expect(mockCluster.evictAll).toHaveBeenCalled()
  })
})

describe('GET /:id', () => {
  it('returns 404 when missing', async () => {
    const handler = fastify.routes['GET /:id']
    mockPostService.findByIdHydrated.mockResolvedValue(null)
    await handler(
      { session: { profileId: ownerProfileId }, params: { id: postId } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })

  it('uses owner mapper when viewer === postedById', async () => {
    const handler = fastify.routes['GET /:id']
    mockPostService.findByIdHydrated.mockResolvedValue(makeRow(ownerProfileId))
    await handler(
      { session: { profileId: ownerProfileId }, params: { id: postId } } as any,
      reply as any
    )
    expect(reply.payload).toMatchObject({
      success: true,
      post: expect.objectContaining({ _isOwn: true }),
    })
  })

  it('uses detail mapper when viewer is not owner', async () => {
    const handler = fastify.routes['GET /:id']
    mockPostService.findByIdHydrated.mockResolvedValue(makeRow(otherProfileId))
    await handler(
      { session: { profileId: ownerProfileId }, params: { id: postId } } as any,
      reply as any
    )
    expect(reply.payload).toMatchObject({
      success: true,
      post: expect.objectContaining({ _isOwn: false }),
    })
  })
})

describe('PATCH /:id', () => {
  it('returns 401 when no profile', async () => {
    const handler = fastify.routes['PATCH /:id']
    await handler(
      { session: {}, params: { id: postId }, body: { isVisible: false } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(401)
  })

  it('returns 404 when ownership mismatch', async () => {
    const handler = fastify.routes['PATCH /:id']
    mockPostService.update.mockResolvedValue(null)
    await handler(
      {
        session: { profileId: otherProfileId },
        params: { id: postId },
        body: { isVisible: false },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })

  it('returns updated owner DTO', async () => {
    const handler = fastify.routes['PATCH /:id']
    mockPostService.update.mockResolvedValue({ ...makeRow(ownerProfileId), content: 'updated' })
    await handler(
      {
        session: { profileId: ownerProfileId },
        params: { id: postId },
        body: { content: 'updated' },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({
      success: true,
      post: expect.objectContaining({ content: 'updated' }),
    })
    expect(mockCluster.evictAll).toHaveBeenCalled()
  })
})

describe('DELETE /:id', () => {
  it('returns 401 when no profile', async () => {
    const handler = fastify.routes['DELETE /:id']
    await handler({ session: {}, params: { id: postId } } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 404 when ownership mismatch', async () => {
    const handler = fastify.routes['DELETE /:id']
    mockPostService.softDelete.mockResolvedValue(null)
    await handler(
      { session: { profileId: otherProfileId }, params: { id: postId } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })

  it('returns 200 on successful soft-delete', async () => {
    const handler = fastify.routes['DELETE /:id']
    mockPostService.softDelete.mockResolvedValue({ id: postId })
    await handler(
      { session: { profileId: ownerProfileId }, params: { id: postId } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(mockCluster.evictAll).toHaveBeenCalled()
  })
})

describe('GET /me', () => {
  it('returns own posts including invisible', async () => {
    const handler = fastify.routes['GET /me']
    mockPostService.findByProfileIdHydrated.mockResolvedValue([makeRow(ownerProfileId)])
    await handler({ session: { profileId: ownerProfileId }, query: {} } as any, reply as any)
    expect(mockPostService.findByProfileIdHydrated).toHaveBeenCalledWith(
      ownerProfileId,
      ownerProfileId,
      expect.objectContaining({ includeInvisible: true })
    )
    expect(reply.payload).toMatchObject({
      success: true,
      posts: expect.arrayContaining([expect.objectContaining({ _isOwn: true })]),
    })
  })
})

describe('GET /profile/:profileId', () => {
  it('owner viewing own profile gets owner mapper + includeInvisible', async () => {
    const handler = fastify.routes['GET /profile/:profileId']
    mockPostService.findByProfileIdHydrated.mockResolvedValue([makeRow(ownerProfileId)])
    await handler(
      {
        session: { profileId: ownerProfileId },
        params: { profileId: ownerProfileId },
        query: {},
      } as any,
      reply as any
    )
    expect(mockPostService.findByProfileIdHydrated).toHaveBeenCalledWith(
      ownerProfileId,
      ownerProfileId,
      expect.objectContaining({ includeInvisible: true })
    )
    expect(reply.payload).toMatchObject({
      success: true,
      posts: [expect.objectContaining({ _isOwn: true })],
    })
  })

  it('stranger gets detail mapper + visible-only', async () => {
    const handler = fastify.routes['GET /profile/:profileId']
    mockPostService.findByProfileIdHydrated.mockResolvedValue([makeRow(otherProfileId)])
    await handler(
      {
        session: { profileId: ownerProfileId },
        params: { profileId: otherProfileId },
        query: {},
      } as any,
      reply as any
    )
    expect(mockPostService.findByProfileIdHydrated).toHaveBeenCalledWith(
      otherProfileId,
      ownerProfileId,
      expect.objectContaining({ includeInvisible: false })
    )
    expect(reply.payload).toMatchObject({
      success: true,
      posts: [expect.objectContaining({ _isOwn: false })],
    })
  })
})

describe('GET /feed', () => {
  it('returns posts envelope with public mapper', async () => {
    const handler = fastify.routes['GET /feed']
    mockPostService.findFeedHydrated.mockResolvedValue([makeRow(otherProfileId)])
    await handler(
      { session: { profileId: ownerProfileId }, query: { limit: 20, offset: 0 } } as any,
      reply as any
    )
    expect(mockPostService.findFeedHydrated).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0, includeInvisible: false })
    )
    expect(reply.payload).toMatchObject({
      success: true,
      posts: [expect.objectContaining({ _public: true })],
    })
  })
})

describe('GET /nearby', () => {
  it('passes lat/lon/radius and returns posts envelope', async () => {
    const handler = fastify.routes['GET /nearby']
    mockPostService.findNearbyHydrated.mockResolvedValue([makeRow(otherProfileId)])
    await handler(
      {
        session: { profileId: ownerProfileId },
        query: { lat: 47.5, lon: 19, radius: 50, limit: 20, offset: 0 },
      } as any,
      reply as any
    )
    expect(mockPostService.findNearbyHydrated).toHaveBeenCalledWith(
      47.5,
      19,
      50,
      expect.objectContaining({ limit: 20, offset: 0, includeInvisible: false })
    )
    expect(reply.payload).toMatchObject({
      success: true,
      posts: [expect.objectContaining({ _public: true })],
    })
  })
})
