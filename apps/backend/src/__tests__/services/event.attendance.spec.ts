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
    constructor(public code: string, message: string) {
      super(message)
    }
  },
}))

let service: any

beforeEach(async () => {
  Object.assign(mockPrisma, createMockPrisma())
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
