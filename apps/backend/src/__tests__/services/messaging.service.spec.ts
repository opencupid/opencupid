import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'

let service: any
let mockPrisma: any

beforeEach(async () => {
  vi.resetModules()
  mockPrisma = createMockPrisma()
  vi.doMock('../../lib/prisma', () => ({ prisma: mockPrisma }))
  const module = await import('../../services/messaging.service')
  ;(module.MessageService as any).instance = undefined
  service = module.MessageService.getInstance()
})

describe('MessageService.sortProfilePair', () => {
  it('sorts profiles lexicographically', () => {
    const [a, b] = service.sortProfilePair('b', 'a')
    expect(a).toBe('a')
    expect(b).toBe('b')
  })
})

describe('MessageService.canSendMessageInConversation', () => {
  it('allows when no conversation', () => {
    expect(service.canSendMessageInConversation(null, 'p1')).toBe(true)
  })

  it('allows when accepted', () => {
    const convo: any = { status: 'ACCEPTED', profileAId: 'p1' }
    expect(service.canSendMessageInConversation(convo, 'p1')).toBe(true)
  })

  it('allows when initiated by other user', () => {
    const convo: any = { status: 'INITIATED', profileAId: 'other' }
    expect(service.canSendMessageInConversation(convo, 'p1')).toBe(true)
  })

  it('rejects when initiated by sender', () => {
    const convo: any = { status: 'INITIATED', profileAId: 'p1' }
    expect(service.canSendMessageInConversation(convo, 'p1')).toBe(false)
  })

  it('rejects when blocked', () => {
    const convo: any = { status: 'BLOCKED', profileAId: 'x' }
    expect(service.canSendMessageInConversation(convo, 'p1')).toBe(false)
  })
})


describe('MessageService.getConversationSummary', () => {
  it('queries prisma with correct args', async () => {
    mockPrisma.conversationParticipant.findFirst.mockResolvedValue({ id: 'cp' })
    const res = await service.getConversationSummary('c1', 'p1')
    expect(mockPrisma.conversationParticipant.findFirst).toHaveBeenCalled()
    const args = mockPrisma.conversationParticipant.findFirst.mock.calls[0][0]
    expect(args.where).toEqual({ conversationId: 'c1', profileId: 'p1' })
    expect(res.id).toBe('cp')
  })
})

describe('MessageService.listMessagesForConversation', () => {
  it('fetches messages ordered by creation', async () => {
    mockPrisma.message.findMany.mockResolvedValue([])
    await service.listMessagesForConversation('c1')
    expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
      where: { conversationId: 'c1' },
      include: {
        sender: { include: { profileImages: { where: { position: 0 } } } },
      },
      orderBy: { createdAt: 'asc' },
    })
  })
})

describe('MessageService.markConversationRead', () => {
  it('updates participant lastReadAt', async () => {
    mockPrisma.conversationParticipant.update.mockResolvedValue({ id: 'cp' })
    await service.markConversationRead('c1', 'p1')
    expect(mockPrisma.conversationParticipant.update).toHaveBeenCalledWith({
      where: { profileId_conversationId: { profileId: 'p1', conversationId: 'c1' } },
      data: { lastReadAt: expect.any(Date) },
    })
  })
})
