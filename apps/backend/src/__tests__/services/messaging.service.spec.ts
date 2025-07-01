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

describe('MessageService.listConversationsForProfile', () => {
  it('queries prisma with correct filters', async () => {
    mockPrisma.conversationParticipant.findMany.mockResolvedValue([])
    await service.listConversationsForProfile('p1')
    const args = mockPrisma.conversationParticipant.findMany.mock.calls[0][0]
    expect(args.where.profileId).toBe('p1')
    expect(args.orderBy).toEqual({ conversation: { updatedAt: 'desc' } })
    // ensure blocklist filters applied
    expect(args.where.conversation.participants.some.profile.blockedProfiles.none.id).toBe('p1')
  })
})

describe('MessageService.acceptConversationOnMatch', () => {
  it('returns null when no conversation exists', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue(null)
    const result = await service.acceptConversationOnMatch('p1', 'p2')
    expect(result).toBeNull()
    expect(mockPrisma.conversation.findUnique).toHaveBeenCalledWith({
      where: { profileAId_profileBId: { profileAId: 'p1', profileBId: 'p2' } }
    })
  })

  it('updates conversation status to ACCEPTED when status is INITIATED', async () => {
    const existingConvo = { id: 'c1', status: 'INITIATED', profileAId: 'p1', profileBId: 'p2' }
    const updatedConvo = { ...existingConvo, status: 'ACCEPTED' }
    
    mockPrisma.conversation.findUnique.mockResolvedValue(existingConvo)
    mockPrisma.conversation.update.mockResolvedValue(updatedConvo)
    
    const result = await service.acceptConversationOnMatch('p1', 'p2')
    
    expect(mockPrisma.conversation.update).toHaveBeenCalledWith({
      where: { profileAId_profileBId: { profileAId: 'p1', profileBId: 'p2' } },
      data: { status: 'ACCEPTED', updatedAt: expect.any(Date) }
    })
    expect(result.status).toBe('ACCEPTED')
  })

  it('does not update conversation when status is already ACCEPTED', async () => {
    const existingConvo = { id: 'c1', status: 'ACCEPTED', profileAId: 'p1', profileBId: 'p2' }
    
    mockPrisma.conversation.findUnique.mockResolvedValue(existingConvo)
    
    const result = await service.acceptConversationOnMatch('p1', 'p2')
    
    expect(mockPrisma.conversation.update).not.toHaveBeenCalled()
    expect(result).toBe(existingConvo)
  })

  it('sorts profile IDs consistently', async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue(null)
    
    await service.acceptConversationOnMatch('p2', 'p1')
    
    expect(mockPrisma.conversation.findUnique).toHaveBeenCalledWith({
      where: { profileAId_profileBId: { profileAId: 'p1', profileBId: 'p2' } }
    })
  })
})
