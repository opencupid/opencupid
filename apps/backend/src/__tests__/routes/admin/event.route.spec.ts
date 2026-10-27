import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockFastify, MockReply } from '../../../test-utils/fastify'

const PrismaKnownError = vi.hoisted(
  () =>
    class PrismaKnownError extends Error {
      constructor(public code: string) {
        super(code)
      }
    }
)
vi.mock('@prisma/client', () => ({
  Prisma: { PrismaClientKnownRequestError: PrismaKnownError },
  PrismaClient: class {},
}))

let mockEventService: any
let mockCluster: any

vi.mock('@/services/event.service', () => ({
  EventService: { getInstance: () => mockEventService },
}))
vi.mock('@/services/cluster.service', () => ({
  ClusterService: { getInstance: () => mockCluster },
}))
vi.mock('@/services/image.service', () => ({
  ImageServiceError: class ImageServiceError extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message)
    }
  },
}))
vi.mock('@/services/tag.service', () => ({
  TagServiceError: class TagServiceError extends Error {},
}))

import adminEventRoutes from '../../../api/routes/admin/event.route'
import { ImageServiceError } from '@/services/image.service'

const profileId = 'cmprofile00000000000o1'
const eventId = 'cmevent000000000000001'

const validBody = {
  postedById: profileId,
  externalSource: 'parasztsuli',
  externalId: '97',
  content: 'Gyógynövénytúra',
  startsAt: '2030-10-17T08:00:00Z',
  venue: 'Visnyeszéplak, Visnye, Somogy',
  country: 'HU',
  cityName: 'Visnyeszéplak',
  lat: 46.22,
  lon: 17.71,
  tagIds: ['cmtag0000000000000001'],
  imageIds: ['cmimage00000000000001'],
}

let fastify: MockFastify
let reply: MockReply

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  mockEventService = {
    create: vi.fn().mockResolvedValue({ id: eventId }),
    findByExternalSource: vi.fn(),
    adminSoftDelete: vi.fn(),
  }
  mockCluster = { evictAll: vi.fn() }
  await adminEventRoutes(fastify as any, {})
})

describe('GET /', () => {
  it('requires externalSource', async () => {
    await fastify.routes['GET /']({ query: {} }, reply)
    expect(reply.statusCode).toBe(400)
  })

  it('lists events of the source', async () => {
    const events = [{ id: eventId, externalId: '97', startsAt: new Date() }]
    mockEventService.findByExternalSource.mockResolvedValue(events)

    await fastify.routes['GET /']({ query: { externalSource: 'parasztsuli' } }, reply)

    expect(mockEventService.findByExternalSource).toHaveBeenCalledWith('parasztsuli')
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({ success: true, events })
  })
})

describe('POST /', () => {
  it('creates the event for postedById with the external ref', async () => {
    await fastify.routes['POST /']({ body: validBody }, reply)

    expect(reply.statusCode).toBe(201)
    expect(reply.payload).toEqual({ success: true, id: eventId })
    const [poster, payload, external] = mockEventService.create.mock.calls[0]
    expect(poster).toBe(profileId)
    expect(external).toEqual({ source: 'parasztsuli', id: '97' })
    expect(payload).not.toHaveProperty('postedById')
    expect(payload).not.toHaveProperty('externalId')
    expect(payload.startsAt).toEqual(new Date('2030-10-17T08:00:00Z'))
    expect(mockCluster.evictAll).toHaveBeenCalled()
  })

  it('rejects a body without the external ref', async () => {
    const { externalId: _omit, ...body } = validBody
    await fastify.routes['POST /']({ body }, reply)
    expect(reply.statusCode).toBe(400)
    expect(mockEventService.create).not.toHaveBeenCalled()
  })

  it('returns 409 when the external ref already exists', async () => {
    mockEventService.create.mockRejectedValue(new PrismaKnownError('P2002'))
    await fastify.routes['POST /']({ body: validBody }, reply)
    expect(reply.statusCode).toBe(409)
  })

  it('returns 400 for an unknown poster', async () => {
    mockEventService.create.mockRejectedValue(new PrismaKnownError('P2003'))
    await fastify.routes['POST /']({ body: validBody }, reply)
    expect(reply.statusCode).toBe(400)
  })

  it('returns 400 for image errors', async () => {
    mockEventService.create.mockRejectedValue(
      new ImageServiceError('OWNER_MISMATCH', 'Image owner mismatch')
    )
    await fastify.routes['POST /']({ body: validBody }, reply)
    expect(reply.statusCode).toBe(400)
  })

  it('returns 500 for unexpected errors', async () => {
    mockEventService.create.mockRejectedValue(new Error('boom'))
    await fastify.routes['POST /']({ body: validBody }, reply)
    expect(reply.statusCode).toBe(500)
  })
})

describe('DELETE /:id', () => {
  it('soft-deletes the event', async () => {
    mockEventService.adminSoftDelete.mockResolvedValue({ id: eventId })
    await fastify.routes['DELETE /:id']({ params: { id: eventId } }, reply)
    expect(mockEventService.adminSoftDelete).toHaveBeenCalledWith(eventId)
    expect(reply.statusCode).toBe(200)
    expect(mockCluster.evictAll).toHaveBeenCalled()
  })

  it('returns 404 when not found', async () => {
    mockEventService.adminSoftDelete.mockResolvedValue(null)
    await fastify.routes['DELETE /:id']({ params: { id: eventId } }, reply)
    expect(reply.statusCode).toBe(404)
  })

  it('rejects an invalid id', async () => {
    await fastify.routes['DELETE /:id']({ params: { id: 'nope' } }, reply)
    expect(reply.statusCode).toBe(400)
  })
})
