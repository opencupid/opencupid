import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'
import { canSendMessageInConversation } from '../../services/messaging.service'

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: class {} }))

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
    expect(canSendMessageInConversation(null, 'p1')).toBe(true)
  })

  it('allows when accepted', () => {
    const convo: any = { status: 'ACCEPTED', initiatorProfileId: 'p1' }
    expect(canSendMessageInConversation(convo, 'p1')).toBe(true)
  })

  it('allows when initiated by other user', () => {
    const convo: any = { status: 'INITIATED', initiatorProfileId: 'other' }
    expect(canSendMessageInConversation(convo, 'p1')).toBe(true)
  })

  it('rejects when initiated by sender', () => {
    const convo: any = { status: 'INITIATED', initiatorProfileId: 'p1' }
    expect(canSendMessageInConversation(convo, 'p1')).toBe(false)
  })

  it('rejects when blocked', () => {
    const convo: any = { status: 'BLOCKED', initiatorProfileId: 'x' }
    expect(canSendMessageInConversation(convo, 'p1')).toBe(false)
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

describe('MessageService.sendOrStartConversation dedup', () => {
  it('returns isDuplicate: true for recent identical message', async () => {
    const existingMsg = {
      id: 'm-existing',
      conversationId: 'c1',
      senderId: 'sender',
      content: 'hello',
      messageType: 'text/plain',
      createdAt: new Date(),
      sender: { id: 'sender', publicName: 'Test', profileImages: [] },
      attachment: null,
    }

    const tx: any = {
      conversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'c1',
          status: 'ACCEPTED',
          initiatorProfileId: 'other',
          profileAId: 'recipient',
          profileBId: 'sender',
        }),
        update: vi.fn(),
      },
      conversationParticipant: {},
      message: {
        findFirst: vi.fn().mockResolvedValue(existingMsg), // duplicate found
        create: vi.fn(),
      },
    }

    const result = await service.sendOrStartConversation(
      tx,
      'sender',
      'recipient',
      'hello',
      'text/plain'
    )
    expect(result.isDuplicate).toBe(true)
    expect(result.message.id).toBe('m-existing')
    expect(tx.message.create).not.toHaveBeenCalled()
  })

  it('returns isDuplicate: false for new message', async () => {
    const newMsg = {
      id: 'm-new',
      conversationId: 'c1',
      senderId: 'sender',
      content: 'hello',
      messageType: 'text/plain',
      createdAt: new Date(),
      sender: { id: 'sender', publicName: 'Test', profileImages: [] },
      attachment: null,
    }

    const tx: any = {
      conversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'c1',
          status: 'ACCEPTED',
          initiatorProfileId: 'other',
          profileAId: 'recipient',
          profileBId: 'sender',
        }),
        update: vi.fn(),
      },
      conversationParticipant: {},
      message: {
        findFirst: vi.fn().mockResolvedValue(null), // no duplicate
        create: vi.fn().mockResolvedValue(newMsg),
      },
    }

    const result = await service.sendOrStartConversation(
      tx,
      'sender',
      'recipient',
      'hello',
      'text/plain'
    )
    expect(result.isDuplicate).toBe(false)
    expect(result.message.id).toBe('m-new')
    expect(tx.message.create).toHaveBeenCalled()
  })

  it('skips dedup for non-text messages (voice)', async () => {
    const newMsg = {
      id: 'm-voice',
      conversationId: 'c1',
      senderId: 'sender',
      content: '',
      messageType: 'audio/voice',
      createdAt: new Date(),
      sender: { id: 'sender', publicName: 'Test', profileImages: [] },
      attachment: null,
    }

    const tx: any = {
      conversation: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'c1',
          status: 'ACCEPTED',
          initiatorProfileId: 'other',
          profileAId: 'recipient',
          profileBId: 'sender',
        }),
        update: vi.fn(),
      },
      conversationParticipant: {},
      message: {
        findFirst: vi.fn(),
        create: vi.fn().mockResolvedValue(newMsg),
      },
    }

    const result = await service.sendOrStartConversation(
      tx,
      'sender',
      'recipient',
      '',
      'audio/voice',
      { filePath: 'voice/test.opus', mimeType: 'audio/ogg', fileSize: 1000, duration: 5 }
    )
    expect(result.isDuplicate).toBe(false)
    expect(tx.message.findFirst).not.toHaveBeenCalled()
    expect(tx.message.create).toHaveBeenCalled()
  })
})

describe('MessageService.findOrCreateConversation auto-accept on match', () => {
  const newMsg = {
    id: 'm-new',
    conversationId: 'c1',
    senderId: 'alice',
    content: 'hi',
    messageType: 'text/plain',
    createdAt: new Date(),
    sender: { id: 'alice', publicName: 'Alice', profileImages: [] },
    attachment: null,
  }

  it('creates conversation as INITIATED when no mutual like exists', async () => {
    const createdConvo = {
      id: 'c1',
      status: 'INITIATED',
      initiatorProfileId: 'alice',
      profileAId: 'alice',
      profileBId: 'bob',
    }

    const tx: any = {
      conversation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(createdConvo),
      },
      likedProfile: {
        count: vi.fn().mockResolvedValue(0),
      },
      message: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(newMsg),
      },
    }

    await service.sendOrStartConversation(tx, 'alice', 'bob', 'hi', 'text/plain')

    expect(tx.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'INITIATED' }),
      })
    )
  })

  it('creates conversation as ACCEPTED when mutual like exists', async () => {
    const createdConvo = {
      id: 'c1',
      status: 'ACCEPTED',
      initiatorProfileId: 'alice',
      profileAId: 'alice',
      profileBId: 'bob',
    }

    const tx: any = {
      conversation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(createdConvo),
      },
      likedProfile: {
        count: vi.fn().mockResolvedValue(2),
      },
      message: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(newMsg),
      },
    }

    await service.sendOrStartConversation(tx, 'alice', 'bob', 'hi', 'text/plain')

    expect(tx.likedProfile.count).toHaveBeenCalledWith({
      where: {
        OR: [
          { fromId: 'alice', toId: 'bob' },
          { fromId: 'bob', toId: 'alice' },
        ],
      },
    })
    expect(tx.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'ACCEPTED' }),
      })
    )
  })
})

describe('MessageService.listMessagesForConversation', () => {
  it('fetches latest page in descending order and returns ascending payload', async () => {
    mockPrisma.message.findMany.mockResolvedValue([
      { id: 'm3', createdAt: new Date('2024-01-03') },
      { id: 'm2', createdAt: new Date('2024-01-02') },
    ])

    const result = await service.listMessagesForConversation('c1')

    expect(mockPrisma.message.findMany).toHaveBeenCalledWith({
      where: { conversationId: 'c1' },
      include: {
        sender: { include: { profileImages: { where: { position: 0 } } } },
        attachment: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 11,
    })
    expect(result.messages.map((m: any) => m.id)).toEqual(['m2', 'm3'])
    expect(result.hasMore).toBe(false)
    expect(result.nextCursor).toBeNull()
  })

  it('supports cursor pagination', async () => {
    mockPrisma.message.findMany.mockResolvedValue([
      { id: 'm9', createdAt: new Date('2024-01-09') },
      { id: 'm8', createdAt: new Date('2024-01-08') },
      { id: 'm7', createdAt: new Date('2024-01-07') },
    ])

    const result = await service.listMessagesForConversation('c1', { cursor: 'm10', take: 2 })

    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: 'm10' },
        skip: 1,
        take: 3,
      })
    )
    expect(result.messages.map((m: any) => m.id)).toEqual(['m8', 'm9'])
    expect(result.hasMore).toBe(true)
    expect(result.nextCursor).toBe('m8')
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
      where: { profileAId_profileBId: { profileAId: 'p1', profileBId: 'p2' } },
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
      data: { status: 'ACCEPTED', updatedAt: expect.any(Date) },
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
      where: { profileAId_profileBId: { profileAId: 'p1', profileBId: 'p2' } },
    })
  })
})
