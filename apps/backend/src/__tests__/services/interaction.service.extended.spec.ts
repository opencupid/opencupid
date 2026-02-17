import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let service: any
let mockPrisma: any

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()

  vi.doMock('../../lib/prisma', () => ({ prisma: mockPrisma }))
  vi.doMock('../../services/messaging.service', () => ({
    MessageService: { getInstance: () => ({ acceptConversationOnMatch: vi.fn() }) },
  }))

  const module = await import('../../services/interaction.service')
  ;(module.InteractionService as any).instance = undefined
  service = module.InteractionService.getInstance()
})

describe('InteractionService.like', () => {
  it('throws when liking yourself', async () => {
    await expect(service.like('p1', 'p1')).rejects.toThrow('Cannot like yourself')
  })
})

describe('InteractionService.unlike', () => {
  it('deletes like from prisma', async () => {
    mockPrisma.likedProfile.deleteMany.mockResolvedValue({ count: 1 })
    await service.unlike('p1', 'p2')
    expect(mockPrisma.likedProfile.deleteMany).toHaveBeenCalledWith({
      where: { fromId: 'p1', toId: 'p2' },
    })
  })
})

describe('InteractionService.pass', () => {
  it('throws when passing yourself', async () => {
    await expect(service.pass('p1', 'p1')).rejects.toThrow('Cannot pass yourself')
  })

  it('removes likes and hides profile in a transaction', async () => {
    const txMocks = {
      likedProfile: { deleteMany: vi.fn() },
      hiddenProfile: { upsert: vi.fn() },
    }
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(txMocks))

    await service.pass('p1', 'p2')

    expect(txMocks.likedProfile.deleteMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { fromId: 'p1', toId: 'p2' },
          { fromId: 'p2', toId: 'p1' },
        ],
      },
    })
    expect(txMocks.hiddenProfile.upsert).toHaveBeenCalledWith({
      where: { fromId_toId: { fromId: 'p1', toId: 'p2' } },
      update: {},
      create: { fromId: 'p1', toId: 'p2' },
    })
  })
})

describe('InteractionService.unpass', () => {
  it('removes hidden profile entry', async () => {
    mockPrisma.hiddenProfile.deleteMany.mockResolvedValue({ count: 1 })
    await service.unpass('p1', 'p2')
    expect(mockPrisma.hiddenProfile.deleteMany).toHaveBeenCalledWith({
      where: { fromId: 'p1', toId: 'p2' },
    })
  })
})

describe('InteractionService.getLikesReceivedCount', () => {
  it('returns count from prisma', async () => {
    mockPrisma.likedProfile.count.mockResolvedValue(7)
    const count = await service.getLikesReceivedCount('p1')
    expect(count).toBe(7)
  })
})

describe('InteractionService.getLikesSent', () => {
  it('returns mapped edges', async () => {
    mockPrisma.likedProfile.findMany.mockResolvedValue([
      {
        to: { id: 'p2', publicName: 'Alice', profileImages: [] },
        createdAt: new Date('2025-01-01'),
      },
    ])
    const result = await service.getLikesSent('p1')
    expect(result).toHaveLength(1)
    expect(result[0].profile.id).toBe('p2')
    expect(result[0].isMatch).toBe(false)
  })
})

describe('InteractionService.getMatches', () => {
  it('returns matched edges', async () => {
    mockPrisma.likedProfile.findMany.mockResolvedValue([
      {
        to: { id: 'p2', publicName: 'Bob', profileImages: [] },
        createdAt: new Date('2025-01-01'),
      },
    ])
    const result = await service.getMatches('p1')
    expect(result).toHaveLength(1)
    expect(result[0].isMatch).toBe(true)
  })
})

describe('InteractionService.getNewMatchesCount', () => {
  it('returns count of new matches', async () => {
    mockPrisma.likedProfile.count.mockResolvedValue(2)
    const count = await service.getNewMatchesCount('p1')
    expect(count).toBe(2)
  })
})

describe('InteractionService.markMatchAsSeen', () => {
  it('updates both directions', async () => {
    mockPrisma.likedProfile.updateMany.mockResolvedValue({ count: 2 })
    await service.markMatchAsSeen('p1', 'p2')
    expect(mockPrisma.likedProfile.updateMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { fromId: 'p1', toId: 'p2', isNew: true },
          { fromId: 'p2', toId: 'p1', isNew: true },
        ],
      },
      data: { isNew: false },
    })
  })
})

describe('InteractionService.getHiddenProfileIds', () => {
  it('returns hidden profile IDs', async () => {
    mockPrisma.hiddenProfile.findMany.mockResolvedValue([{ toId: 'p2' }, { toId: 'p3' }])
    const ids = await service.getHiddenProfileIds('p1')
    expect(ids).toEqual(['p2', 'p3'])
  })
})
