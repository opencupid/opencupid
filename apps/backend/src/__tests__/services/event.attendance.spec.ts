import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let mockPrisma: any = {}
vi.mock('../../lib/prisma', () => ({
  get prisma() {
    return mockPrisma
  },
}))

vi.mock('../../services/image.service', () => ({
  ImageService: { getInstance: () => ({ attachManyToUserContentTx: vi.fn() }) },
  ImageServiceError: class extends Error {
    constructor(
      public code: string,
      message: string
    ) {
      super(message)
    }
  },
}))

let service: any

beforeEach(async () => {
  Object.assign(mockPrisma, createMockPrisma())
  // Default: event is visible to viewer
  mockPrisma.userContent.findFirst = vi.fn().mockResolvedValue({ id: 'evt-1' })
  const mod = await import('../../services/event.service')
  service = mod.EventService.getInstance()
})

describe('EventService.rsvp', () => {
  it('upserts an attendance row on the composite PK', async () => {
    mockPrisma.eventAttendance.upsert = vi.fn().mockResolvedValue({
      eventContentId: 'evt-1',
      profileId: 'prof-1',
      status: 'MAYBE',
    })

    const result = await service.rsvp('prof-1', 'evt-1', 'MAYBE')

    expect(mockPrisma.eventAttendance.upsert).toHaveBeenCalledWith({
      where: { eventContentId_profileId: { eventContentId: 'evt-1', profileId: 'prof-1' } },
      create: { eventContentId: 'evt-1', profileId: 'prof-1', status: 'MAYBE' },
      update: { status: 'MAYBE' },
    })
    expect(result.status).toBe('MAYBE')
  })
})

describe('EventService.cancelRsvp', () => {
  it('hard-deletes the attendance row', async () => {
    mockPrisma.eventAttendance.deleteMany = vi.fn().mockResolvedValue({ count: 1 })

    await service.cancelRsvp('prof-1', 'evt-1')

    expect(mockPrisma.eventAttendance.deleteMany).toHaveBeenCalledWith({
      where: { eventContentId: 'evt-1', profileId: 'prof-1' },
    })
  })

  it('is idempotent when no row exists (no throw)', async () => {
    mockPrisma.eventAttendance.deleteMany = vi.fn().mockResolvedValue({ count: 0 })
    await expect(service.cancelRsvp('prof-1', 'evt-1')).resolves.not.toThrow()
  })
})

describe('EventService.getMyRsvp', () => {
  it("returns the viewer's attendance row by composite PK", async () => {
    const row = { eventContentId: 'evt-1', profileId: 'prof-1', status: 'GOING' }
    mockPrisma.eventAttendance.findUnique = vi.fn().mockResolvedValue(row)

    const result = await service.getMyRsvp('prof-1', 'evt-1')

    expect(mockPrisma.eventAttendance.findUnique).toHaveBeenCalledWith({
      where: { eventContentId_profileId: { eventContentId: 'evt-1', profileId: 'prof-1' } },
    })
    expect(result).toEqual(row)
  })

  it('returns null when no row exists', async () => {
    mockPrisma.eventAttendance.findUnique = vi.fn().mockResolvedValue(null)
    const result = await service.getMyRsvp('prof-1', 'evt-1')
    expect(result).toBeNull()
  })
})

describe('EventService.listAttendees', () => {
  it('returns all attendees ordered by rsvpedAt ascending', async () => {
    const rows = [
      { profileId: 'a', status: 'GOING', rsvpedAt: new Date('2030-01-01'), profile: {} },
      { profileId: 'b', status: 'MAYBE', rsvpedAt: new Date('2030-01-02'), profile: {} },
    ]
    mockPrisma.eventAttendance.findMany = vi.fn().mockResolvedValue(rows)

    const result = await service.listAttendees('viewer-1', 'evt-1')

    expect(mockPrisma.eventAttendance.findMany).toHaveBeenCalledWith({
      where: { eventContentId: 'evt-1' },
      include: { profile: { include: { profileImages: { include: { image: true } } } } },
      orderBy: { rsvpedAt: 'asc' },
    })
    expect(result).toEqual(rows)
  })

  it('filters by status when provided', async () => {
    mockPrisma.eventAttendance.findMany = vi.fn().mockResolvedValue([])

    await service.listAttendees('viewer-1', 'evt-1', 'GOING')

    expect(mockPrisma.eventAttendance.findMany).toHaveBeenCalledWith({
      where: { eventContentId: 'evt-1', status: 'GOING' },
      include: { profile: { include: { profileImages: { include: { image: true } } } } },
      orderBy: { rsvpedAt: 'asc' },
    })
  })
})

describe('EventService visibility gate', () => {
  it('rsvp throws EventNotVisibleError when event is invisible to viewer', async () => {
    mockPrisma.userContent.findFirst = vi.fn().mockResolvedValue(null)
    const mod = await import('../../services/event.service')
    const { EventNotVisibleError } = mod
    await expect(service.rsvp('prof-1', 'evt-1', 'GOING')).rejects.toBeInstanceOf(
      EventNotVisibleError
    )
    expect(mockPrisma.eventAttendance.upsert).not.toHaveBeenCalled()
  })

  it('rsvp proceeds when event is visible', async () => {
    mockPrisma.userContent.findFirst = vi.fn().mockResolvedValue({ id: 'evt-1' })
    mockPrisma.eventAttendance.upsert = vi.fn().mockResolvedValue({})
    await service.rsvp('prof-1', 'evt-1', 'GOING')
    expect(mockPrisma.eventAttendance.upsert).toHaveBeenCalled()
  })

  it('getMyRsvp throws when event is invisible', async () => {
    mockPrisma.userContent.findFirst = vi.fn().mockResolvedValue(null)
    const mod = await import('../../services/event.service')
    const { EventNotVisibleError } = mod
    await expect(service.getMyRsvp('prof-1', 'evt-1')).rejects.toBeInstanceOf(EventNotVisibleError)
  })

  it('listAttendees throws when event is invisible', async () => {
    mockPrisma.userContent.findFirst = vi.fn().mockResolvedValue(null)
    const mod = await import('../../services/event.service')
    const { EventNotVisibleError } = mod
    await expect(service.listAttendees('prof-1', 'evt-1')).rejects.toBeInstanceOf(
      EventNotVisibleError
    )
  })

  it('cancelRsvp does NOT check visibility (idempotent)', async () => {
    mockPrisma.eventAttendance.deleteMany = vi.fn().mockResolvedValue({ count: 0 })
    await expect(service.cancelRsvp('prof-1', 'evt-1')).resolves.not.toThrow()
    expect(mockPrisma.userContent.findFirst).not.toHaveBeenCalled()
  })
})
