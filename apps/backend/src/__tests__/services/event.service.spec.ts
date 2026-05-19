import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let mockPrisma: any = {}
vi.mock('../../lib/prisma', () => ({
  get prisma() {
    return mockPrisma
  },
}))

let mockAttachMany: any
vi.mock('../../services/image.service', () => ({
  ImageService: {
    getInstance: () => ({ attachManyToUserContentTx: mockAttachMany }),
  },
  ImageServiceError: class extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message)
    }
  },
}))

let service: any

beforeEach(async () => {
  Object.assign(mockPrisma, createMockPrisma())
  mockPrisma.userContent.create = vi.fn().mockResolvedValue({
    id: 'content-1',
    kind: 'event',
    content: 'hello world hello world',
    postedById: 'profile-1',
    event: { startsAt: new Date('2030-01-01T10:00:00Z'), venue: null },
    postedBy: { id: 'profile-1', profileImages: [] },
  })
  mockPrisma.$transaction = vi.fn((fn: any) => fn(mockPrisma))
  mockAttachMany = vi.fn().mockResolvedValue(undefined)
  const mod = await import('../../services/event.service')
  ;(mod.EventService as any).eventInstance = undefined
  service = mod.EventService.getInstance()
})

describe('EventService.create with imageIds', () => {
  const baseData = {
    content: 'x'.repeat(20),
    startsAt: new Date('2030-01-01T10:00:00Z'),
  }

  it('calls attachManyToUserContentTx with imageIds + new contentId', async () => {
    await service.create('profile-1', { ...baseData, imageIds: ['img-a'] })
    expect(mockAttachMany).toHaveBeenCalledWith(mockPrisma, ['img-a'], 'content-1', 'profile-1')
  })

  it('does not call attach for omitted imageIds', async () => {
    await service.create('profile-1', baseData)
    expect(mockAttachMany).not.toHaveBeenCalled()
  })

  it('does not call attach for empty imageIds', async () => {
    await service.create('profile-1', { ...baseData, imageIds: [] })
    expect(mockAttachMany).not.toHaveBeenCalled()
  })
})
