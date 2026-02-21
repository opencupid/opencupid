import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let service: any
let mockPrisma: any
let mockMessageService: any

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()

  // Mock MessageService
  mockMessageService = {
    acceptConversationOnMatch: vi.fn(),
  }

  vi.doMock('../../lib/prisma', () => ({ prisma: mockPrisma }))
  vi.doMock('../../services/messaging.service', () => ({
    MessageService: {
      getInstance: () => mockMessageService,
    },
  }))

  const module = await import('../../services/interaction.service')
  ;(module.InteractionService as any).instance = undefined
  service = module.InteractionService.getInstance()
})

describe('InteractionService.like', () => {
  it('calls acceptConversationOnMatch when a match occurs', async () => {
    const fromId = 'user1'
    const toId = 'user2'

    // Mock the transaction to return a like
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      await fn({
        hiddenProfile: { deleteMany: vi.fn() },
        likedProfile: {
          upsert: vi.fn().mockResolvedValue({
            fromId,
            toId,
            createdAt: new Date(),
          }),
        },
      })
      return { like: { fromId, toId, createdAt: new Date() } }
    })

    // Mock profile fetches
    mockPrisma.profile.findUniqueOrThrow
      .mockResolvedValueOnce({ id: toId, profileImages: [] })
      .mockResolvedValueOnce({ id: fromId, profileImages: [] })

    // Mock finding a mutual like (indicating a match)
    mockPrisma.likedProfile.findUnique.mockResolvedValue({
      fromId: toId,
      toId: fromId,
    })

    await service.like(fromId, toId)

    expect(mockMessageService.acceptConversationOnMatch).toHaveBeenCalledWith(fromId, toId)
  })

  it('does not call acceptConversationOnMatch when no match occurs', async () => {
    const fromId = 'user1'
    const toId = 'user2'

    // Mock the transaction to return a like
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      await fn({
        hiddenProfile: { deleteMany: vi.fn() },
        likedProfile: {
          upsert: vi.fn().mockResolvedValue({
            fromId,
            toId,
            createdAt: new Date(),
          }),
        },
      })
      return { like: { fromId, toId, createdAt: new Date() } }
    })

    // Mock profile fetches
    mockPrisma.profile.findUniqueOrThrow
      .mockResolvedValueOnce({ id: toId, profileImages: [] })
      .mockResolvedValueOnce({ id: fromId, profileImages: [] })

    // Mock no mutual like (no match)
    mockPrisma.likedProfile.findUnique.mockResolvedValue(null)

    await service.like(fromId, toId)

    expect(mockMessageService.acceptConversationOnMatch).not.toHaveBeenCalled()
  })
})
