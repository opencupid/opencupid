import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let mockPrisma: any = {}
vi.mock('../../lib/prisma', () => ({
  get prisma() {
    return mockPrisma
  },
}))

let service: any

beforeEach(async () => {
  Object.assign(mockPrisma, createMockPrisma())
  mockPrisma.userContent.findMany = vi.fn().mockResolvedValue([])
  const { UserContentService } = await import('../../services/userContent.service')
  service = UserContentService.getInstance()
})

const box = { south: 40, north: 50, west: 10, east: 20 }

describe('findInBounds', () => {
  it('constrains the query to the requested kinds', async () => {
    await service.findInBounds(box, { kinds: ['post', 'event'] })

    const { where } = mockPrisma.userContent.findMany.mock.calls[0][0]
    expect(where.kind).toEqual({ in: ['post', 'event'] })
  })

  it('keeps the bounds and visibility filters alongside the kind filter', async () => {
    await service.findInBounds(box, { kinds: ['community'] })

    const { where } = mockPrisma.userContent.findMany.mock.calls[0][0]
    expect(where).toMatchObject({
      isDeleted: false,
      isVisible: true,
      lat: { gte: 40, lte: 50 },
      lon: { gte: 10, lte: 20 },
    })
  })
})
