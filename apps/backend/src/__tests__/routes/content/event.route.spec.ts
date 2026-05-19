import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockFastify, MockReply } from '../../../test-utils/fastify'
import { CreateEventPayloadSchema, UpdateEventPayloadSchema } from '@zod/event/event.dto'

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))

let fastify: MockFastify
let reply: MockReply
let mockEventService: any
let mockCluster: any

vi.mock('@/services/event.service', () => ({
  EventService: { getInstance: () => mockEventService },
}))
vi.mock('@/services/cluster.service', () => ({
  ClusterService: { getInstance: () => mockCluster },
}))
vi.mock('@/services/image.service', () => ({
  ImageService: { getInstance: () => ({}) },
  ImageServiceError: class extends Error {
    constructor(public code: string, message: string) { super(message) }
  },
}))

vi.mock('@/api/mappers/event.mappers', () => ({
  mapDbEventToOwner: (row: any) => ({ ...row, _isOwn: true }),
  mapDbEventToDetail: (row: any) => ({ ...row, _isOwn: false }),
}))

import eventRoutes from '../../../api/routes/content/event.route'

const ownerProfileId = 'cmprofile00000000000o1'
const otherProfileId = 'cmprofile00000000000v1'
const eventId = 'cmevent000000000000001'

const makeRow = (postedById: string) => ({
  id: eventId,
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
  postedById,
  event: { userContentId: eventId, startsAt: new Date('2027-01-01'), venue: null },
  postedBy: { id: postedById, publicName: 'X', profileImages: [] },
})

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  mockEventService = {
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findByIdHydrated: vi.fn(),
    findByProfileIdHydrated: vi.fn(),
  }
  mockCluster = { evictAll: vi.fn().mockResolvedValue(undefined) }
  await eventRoutes(fastify as any, {})
})

describe('POST /', () => {
  it('returns 401 when no profile', async () => {
    const handler = fastify.routes['POST /']
    await handler({ session: {}, body: {} } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('creates and returns owner DTO', async () => {
    const handler = fastify.routes['POST /']
    mockEventService.create.mockResolvedValue(makeRow(ownerProfileId))
    await handler(
      {
        session: { profileId: ownerProfileId },
        body: { content: 'party', startsAt: '2027-01-01T18:00:00Z' },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(201)
    expect(reply.payload).toMatchObject({
      success: true,
      event: expect.objectContaining({ _isOwn: true }),
    })
    expect(mockCluster.evictAll).toHaveBeenCalled()
  })

  it('returns 400 when ImageServiceError is thrown by service.create', async () => {
    const handler = fastify.routes['POST /']
    const { ImageServiceError } = await import('@/services/image.service')
    mockEventService.create.mockRejectedValue(
      new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
    )

    await handler(
      {
        session: { profileId: ownerProfileId },
        body: {
          content: 'hello world hello',
          startsAt: new Date('2030-01-01T10:00:00Z').toISOString(),
          imageIds: ['cmimg00000000000000000a'],
        },
      } as any,
      reply as any
    )

    expect(reply.statusCode).toBe(400)
  })
})

describe('GET /:id', () => {
  it('returns 404 when missing', async () => {
    const handler = fastify.routes['GET /:id']
    mockEventService.findByIdHydrated.mockResolvedValue(null)
    await handler(
      { session: { profileId: ownerProfileId }, params: { id: eventId } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })

  it('uses owner mapper when viewer === postedById', async () => {
    const handler = fastify.routes['GET /:id']
    mockEventService.findByIdHydrated.mockResolvedValue(makeRow(ownerProfileId))
    await handler(
      { session: { profileId: ownerProfileId }, params: { id: eventId } } as any,
      reply as any
    )
    expect(reply.payload).toMatchObject({
      success: true,
      event: expect.objectContaining({ _isOwn: true }),
    })
  })

  it('uses detail mapper when viewer is not owner', async () => {
    const handler = fastify.routes['GET /:id']
    mockEventService.findByIdHydrated.mockResolvedValue(makeRow(otherProfileId))
    await handler(
      { session: { profileId: ownerProfileId }, params: { id: eventId } } as any,
      reply as any
    )
    expect(reply.payload).toMatchObject({
      success: true,
      event: expect.objectContaining({ _isOwn: false }),
    })
  })
})

describe('GET /:id/ics', () => {
  it('returns 401 when no profile', async () => {
    const handler = fastify.routes['GET /:id/ics']
    await handler({ session: {}, params: { id: eventId } } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 404 when event missing', async () => {
    const handler = fastify.routes['GET /:id/ics']
    mockEventService.findByIdHydrated.mockResolvedValue(null)
    await handler(
      { session: { profileId: ownerProfileId }, params: { id: eventId } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })

  it('returns 200 with calendar mime + attachment disposition + VCALENDAR body', async () => {
    const handler = fastify.routes['GET /:id/ics']
    mockEventService.findByIdHydrated.mockResolvedValue(makeRow(ownerProfileId))
    await handler(
      { session: { profileId: ownerProfileId }, params: { id: eventId } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.headers['Content-Type']).toBe('text/calendar; charset=utf-8')
    expect(reply.headers['Content-Disposition']).toContain(`event-${eventId}.ics`)
    expect(reply.payload).toContain('BEGIN:VCALENDAR')
    expect(reply.payload).toContain('END:VCALENDAR')
  })
})

describe('PATCH /:id', () => {
  it('returns 401 when no profile', async () => {
    const handler = fastify.routes['PATCH /:id']
    await handler(
      { session: {}, params: { id: eventId }, body: { isVisible: false } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(401)
  })

  it('returns 404 when ownership mismatch', async () => {
    const handler = fastify.routes['PATCH /:id']
    mockEventService.update.mockResolvedValue(null)
    await handler(
      {
        session: { profileId: otherProfileId },
        params: { id: eventId },
        body: { isVisible: false },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })

  it('returns updated owner DTO', async () => {
    const handler = fastify.routes['PATCH /:id']
    mockEventService.update.mockResolvedValue({ ...makeRow(ownerProfileId), content: 'updated' })
    await handler(
      {
        session: { profileId: ownerProfileId },
        params: { id: eventId },
        body: { content: 'updated' },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({
      success: true,
      event: expect.objectContaining({ content: 'updated' }),
    })
    expect(mockCluster.evictAll).toHaveBeenCalled()
  })
})

describe('DELETE /:id', () => {
  it('returns 401 when no profile', async () => {
    const handler = fastify.routes['DELETE /:id']
    await handler({ session: {}, params: { id: eventId } } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 404 when ownership mismatch', async () => {
    const handler = fastify.routes['DELETE /:id']
    mockEventService.softDelete.mockResolvedValue(null)
    await handler(
      { session: { profileId: otherProfileId }, params: { id: eventId } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(404)
  })

  it('returns 200 on successful soft-delete', async () => {
    const handler = fastify.routes['DELETE /:id']
    mockEventService.softDelete.mockResolvedValue({ id: eventId })
    await handler(
      { session: { profileId: ownerProfileId }, params: { id: eventId } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(mockCluster.evictAll).toHaveBeenCalled()
  })
})

describe('GET /me', () => {
  it('returns own events including invisible', async () => {
    const handler = fastify.routes['GET /me']
    mockEventService.findByProfileIdHydrated.mockResolvedValue([makeRow(ownerProfileId)])
    await handler({ session: { profileId: ownerProfileId }, query: {} } as any, reply as any)
    expect(mockEventService.findByProfileIdHydrated).toHaveBeenCalledWith(
      ownerProfileId,
      ownerProfileId,
      expect.objectContaining({ includeInvisible: true })
    )
    expect(reply.payload).toMatchObject({
      success: true,
      events: expect.arrayContaining([expect.objectContaining({ _isOwn: true })]),
    })
  })
})

describe('GET /profile/:profileId', () => {
  it('owner viewing own profile gets owner mapper + includeInvisible', async () => {
    const handler = fastify.routes['GET /profile/:profileId']
    mockEventService.findByProfileIdHydrated.mockResolvedValue([makeRow(ownerProfileId)])
    await handler(
      {
        session: { profileId: ownerProfileId },
        params: { profileId: ownerProfileId },
        query: {},
      } as any,
      reply as any
    )
    expect(mockEventService.findByProfileIdHydrated).toHaveBeenCalledWith(
      ownerProfileId,
      ownerProfileId,
      expect.objectContaining({ includeInvisible: true })
    )
    expect(reply.payload).toMatchObject({
      success: true,
      events: [expect.objectContaining({ _isOwn: true })],
    })
  })

  it('stranger gets detail mapper + visible-only', async () => {
    const handler = fastify.routes['GET /profile/:profileId']
    mockEventService.findByProfileIdHydrated.mockResolvedValue([makeRow(otherProfileId)])
    await handler(
      {
        session: { profileId: ownerProfileId },
        params: { profileId: otherProfileId },
        query: {},
      } as any,
      reply as any
    )
    expect(mockEventService.findByProfileIdHydrated).toHaveBeenCalledWith(
      otherProfileId,
      ownerProfileId,
      expect.objectContaining({ includeInvisible: false })
    )
    expect(reply.payload).toMatchObject({
      success: true,
      events: [expect.objectContaining({ _isOwn: false })],
    })
  })
})

describe('CreateEventPayloadSchema imageIds', () => {
  const baseFields = { content: 'x'.repeat(20), startsAt: new Date('2030-01-01T10:00:00Z') }

  it('accepts up to 6 cuids', () => {
    const ids = Array.from({ length: 6 }, (_, i) => `cmimg00000000000000000${i}`)
    const parsed = CreateEventPayloadSchema.parse({ ...baseFields, imageIds: ids })
    expect(parsed.imageIds).toEqual(ids)
  })

  it('rejects more than 6 imageIds', () => {
    const ids = Array.from({ length: 7 }, (_, i) => `cmimg00000000000000000${i}`)
    expect(() => CreateEventPayloadSchema.parse({ ...baseFields, imageIds: ids })).toThrow()
  })

  it('accepts payload without imageIds', () => {
    const parsed = CreateEventPayloadSchema.parse(baseFields)
    expect(parsed.imageIds).toBeUndefined()
  })

  it('UpdateEventPayloadSchema strips imageIds (create-only field)', () => {
    const parsed = UpdateEventPayloadSchema.parse({
      content: 'updated',
      startsAt: new Date('2030-01-01T10:00:00Z'),
      imageIds: ['cmimg00000000000000000a'],
    } as any)
    expect((parsed as any).imageIds).toBeUndefined()
  })
})
