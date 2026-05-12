import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockFastify, MockReply } from '../../../test-utils/fastify'

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))

let fastify: MockFastify
let reply: MockReply
let mockCommunityService: any
let mockCluster: any

vi.mock('@/services/community.service', () => ({
  CommunityService: { getInstance: () => mockCommunityService },
}))
vi.mock('@/services/cluster.service', () => ({
  ClusterService: { getInstance: () => mockCluster },
}))

vi.mock('@/api/mappers/community.mappers', () => ({
  mapDbCommunityToOwner: (row: any) => ({ ...row, _isOwn: true }),
  mapDbCommunityToDetail: (row: any) => ({ ...row, _isOwn: false }),
}))

import communityRoutes from '../../../api/routes/content/community.route'

const ownerProfileId = 'cmprofile00000000000o1'
const otherProfileId = 'cmprofile00000000000v1'
const communityId = 'cmcommun000000000000001'

const makeRow = (postedById: string) => ({
  id: communityId,
  kind: 'community',
  content: 'a local guild',
  isDeleted: false,
  isVisible: true,
  country: null,
  cityName: null,
  lat: null,
  lon: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  postedById,
  community: { userContentId: communityId, yearFounded: 1998 },
  postedBy: { id: postedById, publicName: 'X', profileImages: [] },
})

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  mockCommunityService = {
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findByIdHydrated: vi.fn(),
    findByProfileIdHydrated: vi.fn(),
  }
  mockCluster = { evictAll: vi.fn().mockResolvedValue(undefined) }
  await communityRoutes(fastify as any, {})
})

describe('POST /', () => {
  it('returns 401 when no profile', async () => {
    const handler = fastify.routes['POST /']
    await handler({ session: {}, body: {} } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('creates and returns owner DTO', async () => {
    const handler = fastify.routes['POST /']
    mockCommunityService.create.mockResolvedValue(makeRow(ownerProfileId))
    await handler(
      {
        session: { profileId: ownerProfileId },
        body: { content: 'a local guild', yearFounded: 1998 },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(201)
    expect(reply.payload).toMatchObject({
      success: true,
      community: expect.objectContaining({ _isOwn: true }),
    })
    expect(mockCluster.evictAll).toHaveBeenCalled()
  })
})

describe('GET /:id', () => {
  it('returns 404 when missing', async () => {
    const handler = fastify.routes['GET /:id']
    mockCommunityService.findByIdHydrated.mockResolvedValue(null)
    await handler(
      { session: { profileId: ownerProfileId }, params: { id: communityId } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })

  it('uses owner mapper when viewer === postedById', async () => {
    const handler = fastify.routes['GET /:id']
    mockCommunityService.findByIdHydrated.mockResolvedValue(makeRow(ownerProfileId))
    await handler(
      { session: { profileId: ownerProfileId }, params: { id: communityId } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({
      community: expect.objectContaining({ _isOwn: true }),
    })
  })

  it('uses detail mapper when viewer !== postedById', async () => {
    const handler = fastify.routes['GET /:id']
    mockCommunityService.findByIdHydrated.mockResolvedValue(makeRow(ownerProfileId))
    await handler(
      { session: { profileId: otherProfileId }, params: { id: communityId } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({
      community: expect.objectContaining({ _isOwn: false }),
    })
  })
})

describe('DELETE /:id', () => {
  it('returns 401 when no profile', async () => {
    const handler = fastify.routes['DELETE /:id']
    await handler({ session: {}, params: { id: communityId } } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 404 when service returns null', async () => {
    const handler = fastify.routes['DELETE /:id']
    mockCommunityService.softDelete.mockResolvedValue(null)
    await handler(
      { session: { profileId: ownerProfileId }, params: { id: communityId } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })

  it('soft-deletes and evicts cluster on success', async () => {
    const handler = fastify.routes['DELETE /:id']
    mockCommunityService.softDelete.mockResolvedValue({ id: communityId })
    await handler(
      { session: { profileId: ownerProfileId }, params: { id: communityId } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(mockCluster.evictAll).toHaveBeenCalled()
  })
})
