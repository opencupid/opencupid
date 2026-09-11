import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockFastify, MockReply } from '../../../test-utils/fastify'
import {
  CreateCommunityPayloadSchema,
  UpdateCommunityPayloadSchema,
} from '@zod/community/community.dto'

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
vi.mock('@/services/image.service', () => ({
  ImageService: { getInstance: () => ({}) },
  ImageServiceError: class extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message)
    }
  },
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

  it('returns 400 when ImageServiceError is thrown by service.create', async () => {
    const handler = fastify.routes['POST /']
    const { ImageServiceError } = await import('@/services/image.service')
    mockCommunityService.create.mockRejectedValue(
      new ImageServiceError('ALREADY_ATTACHED', 'Image already attached')
    )

    await handler(
      {
        session: { profileId: ownerProfileId },
        body: { content: 'hello world hello', imageIds: ['cmimg00000000000000000a'] },
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(400)
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

describe('PATCH /:id', () => {
  it('returns 401 when no profile', async () => {
    const handler = fastify.routes['PATCH /:id']
    await handler(
      { session: {}, params: { id: communityId }, body: { isVisible: false } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(401)
  })

  it('returns 404 when ownership mismatch', async () => {
    const handler = fastify.routes['PATCH /:id']
    mockCommunityService.update.mockResolvedValue(null)
    await handler(
      {
        session: { profileId: otherProfileId },
        params: { id: communityId },
        body: { isVisible: false },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })

  it('returns updated owner DTO and evicts cluster', async () => {
    const handler = fastify.routes['PATCH /:id']
    mockCommunityService.update.mockResolvedValue({
      ...makeRow(ownerProfileId),
      content: 'updated guild',
    })
    await handler(
      {
        session: { profileId: ownerProfileId },
        params: { id: communityId },
        body: { content: 'updated guild' },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({
      success: true,
      community: expect.objectContaining({ content: 'updated guild' }),
    })
    expect(mockCluster.evictAll).toHaveBeenCalled()
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

describe('GET /me', () => {
  it('returns 401 when no profile', async () => {
    const handler = fastify.routes['GET /me']
    await handler({ session: {}, query: {} } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns own communities with includeInvisible=true', async () => {
    const handler = fastify.routes['GET /me']
    mockCommunityService.findByProfileIdHydrated.mockResolvedValue([makeRow(ownerProfileId)])
    await handler({ session: { profileId: ownerProfileId }, query: {} } as any, reply as any)
    expect(mockCommunityService.findByProfileIdHydrated).toHaveBeenCalledWith(
      ownerProfileId,
      ownerProfileId,
      expect.objectContaining({ includeInvisible: true })
    )
    expect(reply.payload).toMatchObject({
      success: true,
      communities: expect.arrayContaining([expect.objectContaining({ _isOwn: true })]),
    })
  })
})

describe('GET /profile/:profileId', () => {
  it('owner viewing own profile gets owner mapper + includeInvisible', async () => {
    const handler = fastify.routes['GET /profile/:profileId']
    mockCommunityService.findByProfileIdHydrated.mockResolvedValue([makeRow(ownerProfileId)])
    await handler(
      {
        session: { profileId: ownerProfileId },
        params: { profileId: ownerProfileId },
        query: {},
      } as any,
      reply as any
    )
    expect(mockCommunityService.findByProfileIdHydrated).toHaveBeenCalledWith(
      ownerProfileId,
      ownerProfileId,
      expect.objectContaining({ includeInvisible: true })
    )
    expect(reply.payload).toMatchObject({
      success: true,
      communities: [expect.objectContaining({ _isOwn: true })],
    })
  })

  it('stranger gets detail mapper + visible-only', async () => {
    const handler = fastify.routes['GET /profile/:profileId']
    mockCommunityService.findByProfileIdHydrated.mockResolvedValue([makeRow(otherProfileId)])
    await handler(
      {
        session: { profileId: ownerProfileId },
        params: { profileId: otherProfileId },
        query: {},
      } as any,
      reply as any
    )
    expect(mockCommunityService.findByProfileIdHydrated).toHaveBeenCalledWith(
      otherProfileId,
      ownerProfileId,
      expect.objectContaining({ includeInvisible: false })
    )
    expect(reply.payload).toMatchObject({
      success: true,
      communities: [expect.objectContaining({ _isOwn: false })],
    })
  })

  it('forwards pagination params', async () => {
    const handler = fastify.routes['GET /profile/:profileId']
    mockCommunityService.findByProfileIdHydrated.mockResolvedValue([])
    await handler(
      {
        session: { profileId: ownerProfileId },
        params: { profileId: otherProfileId },
        query: { limit: '5', offset: '10' },
      } as any,
      reply as any
    )
    expect(mockCommunityService.findByProfileIdHydrated).toHaveBeenCalledWith(
      otherProfileId,
      ownerProfileId,
      expect.objectContaining({ limit: 5, offset: 10 })
    )
  })
})

describe('CreateCommunityPayloadSchema imageIds', () => {
  const baseFields = { content: 'x'.repeat(20) }

  it('accepts up to 6 cuids', () => {
    const ids = Array.from({ length: 6 }, (_, i) => `cmimg00000000000000000${i}`)
    const parsed = CreateCommunityPayloadSchema.parse({ ...baseFields, imageIds: ids })
    expect(parsed.imageIds).toEqual(ids)
  })

  it('rejects more than 6 imageIds', () => {
    const ids = Array.from({ length: 7 }, (_, i) => `cmimg00000000000000000${i}`)
    expect(() => CreateCommunityPayloadSchema.parse({ ...baseFields, imageIds: ids })).toThrow()
  })

  it('accepts payload without imageIds', () => {
    const parsed = CreateCommunityPayloadSchema.parse(baseFields)
    expect(parsed.imageIds).toBeUndefined()
  })

  it('UpdateCommunityPayloadSchema strips imageIds (create-only field)', () => {
    const parsed = UpdateCommunityPayloadSchema.parse({
      content: 'updated',
      imageIds: ['cmimg00000000000000000a'],
    } as any)
    expect((parsed as any).imageIds).toBeUndefined()
  })
})

describe('CreateCommunityPayloadSchema contact fields', () => {
  const baseFields = { content: 'x'.repeat(20) }

  const parseContact = (contact: Record<string, unknown>) =>
    CreateCommunityPayloadSchema.safeParse({ ...baseFields, ...contact })

  it('omits both contact fields when absent', () => {
    const parsed = CreateCommunityPayloadSchema.parse(baseFields)
    expect(parsed.contactUrl).toBeUndefined()
    expect(parsed.contactEmail).toBeUndefined()
  })

  it('accepts null for both contact fields', () => {
    const parsed = CreateCommunityPayloadSchema.parse({
      ...baseFields,
      contactUrl: null,
      contactEmail: null,
    })
    expect(parsed.contactUrl).toBeNull()
    expect(parsed.contactEmail).toBeNull()
  })

  it('trims surrounding whitespace', () => {
    const parsed = CreateCommunityPayloadSchema.parse({
      ...baseFields,
      contactUrl: '  https://example.org/guild  ',
      contactEmail: '  hello@example.org  ',
    })
    expect(parsed.contactUrl).toBe('https://example.org/guild')
    expect(parsed.contactEmail).toBe('hello@example.org')
  })

  it.each(['https://example.org', 'http://example.org/path?a=1'])(
    'accepts %s as contactUrl',
    (url) => {
      expect(parseContact({ contactUrl: url }).success).toBe(true)
    }
  )

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script></script>',
    'ftp://example.org',
    'example.org',
    '',
  ])('rejects %s as contactUrl', (url) => {
    expect(parseContact({ contactUrl: url }).success).toBe(false)
  })

  it('rejects a contactUrl longer than 2048 chars', () => {
    const url = `https://example.org/${'a'.repeat(2100)}`
    expect(parseContact({ contactUrl: url }).success).toBe(false)
  })

  it.each(['not-an-email', 'foo@', '@example.org', ''])('rejects %s as contactEmail', (email) => {
    expect(parseContact({ contactEmail: email }).success).toBe(false)
  })

  it('rejects a contactEmail longer than 254 chars', () => {
    const email = `${'a'.repeat(250)}@example.org`
    expect(parseContact({ contactEmail: email }).success).toBe(false)
  })

  it('omits description when absent', () => {
    const parsed = CreateCommunityPayloadSchema.parse(baseFields)
    expect(parsed.description).toBeUndefined()
  })

  it('accepts null for description', () => {
    const parsed = CreateCommunityPayloadSchema.parse({ ...baseFields, description: null })
    expect(parsed.description).toBeNull()
  })

  it('trims surrounding whitespace on description', () => {
    const parsed = CreateCommunityPayloadSchema.parse({
      ...baseFields,
      description: '  A long description.  ',
    })
    expect(parsed.description).toBe('A long description.')
  })

  it('rejects a description longer than 2000 chars', () => {
    expect(parseContact({ description: 'a'.repeat(2001) }).success).toBe(false)
  })
})
