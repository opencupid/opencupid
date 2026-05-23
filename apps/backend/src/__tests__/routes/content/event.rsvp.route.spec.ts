import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockFastify, MockReply } from '../../../test-utils/fastify'

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
    constructor(
      public code: string,
      message: string
    ) {
      super(message)
    }
  },
}))

vi.mock('@/api/mappers/event.mappers', () => ({
  mapDbEventToOwner: (row: any) => ({ ...row, _isOwn: true }),
  mapDbEventToDetail: (row: any) => ({ ...row, _isOwn: false }),
}))

import eventRoutes from '../../../api/routes/content/event.route'

const profileId = 'cmprofile00000000000p1'
const eventId = 'cmevent000000000000001'

beforeEach(async () => {
  fastify = new MockFastify()
  reply = new MockReply()
  mockEventService = {
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findByIdHydrated: vi.fn(),
    findByProfileIdHydrated: vi.fn(),
    rsvp: vi.fn(),
    cancelRsvp: vi.fn(),
    listAttendees: vi.fn(),
    getMyRsvp: vi.fn(),
  }
  mockCluster = { evictAll: vi.fn().mockResolvedValue(undefined) }
  await eventRoutes(fastify as any, {})
})

describe('GET /:id/rsvp', () => {
  it('returns 401 when no profile', async () => {
    const handler = fastify.routes['GET /:id/rsvp']
    await handler({ session: {}, params: { id: eventId } } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 200 with status GOING when service returns a row', async () => {
    const handler = fastify.routes['GET /:id/rsvp']
    mockEventService.getMyRsvp.mockResolvedValue({ status: 'GOING' })
    await handler({ session: { profileId }, params: { id: eventId } } as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({ success: true, status: 'GOING' })
    expect(mockEventService.getMyRsvp).toHaveBeenCalledWith(profileId, eventId)
  })

  it('returns 200 with status null when service returns null', async () => {
    const handler = fastify.routes['GET /:id/rsvp']
    mockEventService.getMyRsvp.mockResolvedValue(null)
    await handler({ session: { profileId }, params: { id: eventId } } as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({ success: true, status: null })
  })
})

describe('POST /:id/rsvp', () => {
  it('returns 401 when no profile', async () => {
    const handler = fastify.routes['POST /:id/rsvp']
    await handler(
      { session: {}, params: { id: eventId }, body: { status: 'GOING' } } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(401)
  })

  it('returns 200 and calls svc.rsvp with correct args', async () => {
    const handler = fastify.routes['POST /:id/rsvp']
    mockEventService.rsvp.mockResolvedValue(undefined)
    await handler(
      {
        session: { profileId },
        params: { id: eventId },
        body: { status: 'GOING' },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({ success: true })
    expect(mockEventService.rsvp).toHaveBeenCalledWith(profileId, eventId, 'GOING')
  })

  it('returns 400 when status is invalid', async () => {
    const handler = fastify.routes['POST /:id/rsvp']
    await handler(
      {
        session: { profileId },
        params: { id: eventId },
        body: { status: 'INVALID' },
      } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(400)
  })
})

describe('DELETE /:id/rsvp', () => {
  it('returns 401 when no profile', async () => {
    const handler = fastify.routes['DELETE /:id/rsvp']
    await handler({ session: {}, params: { id: eventId } } as any, reply as any)
    expect(reply.statusCode).toBe(401)
  })

  it('returns 200 and calls svc.cancelRsvp', async () => {
    const handler = fastify.routes['DELETE /:id/rsvp']
    mockEventService.cancelRsvp.mockResolvedValue(undefined)
    await handler({ session: { profileId }, params: { id: eventId } } as any, reply as any)
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toEqual({ success: true })
    expect(mockEventService.cancelRsvp).toHaveBeenCalledWith(profileId, eventId)
  })
})

describe('GET /:id/attendees', () => {
  const makeAttendeeRow = (status = 'GOING') => ({
    profile: { id: profileId, publicName: 'Alice', profileImages: [] },
    status,
    rsvpedAt: new Date('2027-01-01T12:00:00Z'),
  })

  it('returns 200 with attendees list', async () => {
    const handler = fastify.routes['GET /:id/attendees']
    const row = makeAttendeeRow()
    mockEventService.listAttendees.mockResolvedValue([row])
    await handler(
      { session: { profileId }, params: { id: eventId }, query: {} } as any,
      reply as any
    )
    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({
      success: true,
      attendees: [
        expect.objectContaining({
          profile: row.profile,
          status: 'GOING',
        }),
      ],
    })
  })

  it('propagates status filter to service', async () => {
    const handler = fastify.routes['GET /:id/attendees']
    mockEventService.listAttendees.mockResolvedValue([makeAttendeeRow('GOING')])
    await handler(
      { session: { profileId }, params: { id: eventId }, query: { status: 'GOING' } } as any,
      reply as any
    )
    expect(mockEventService.listAttendees).toHaveBeenCalledWith(eventId, 'GOING')
  })
})
