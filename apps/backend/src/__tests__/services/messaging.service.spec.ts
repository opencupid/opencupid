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
        sender: {
          select: {
            id: true,
            publicName: true,
            country: true,
            cityName: true,
            lat: true,
            lon: true,
            profileImages: { orderBy: { position: 'asc' } },
          },
        },
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

describe('MessageService.resolveConversation', () => {
  const existing = {
    id: 'c-existing',
    status: 'ACCEPTED',
    initiatorProfileId: 'alice',
    profileAId: 'alice',
    profileBId: 'bob',
  }

  it('returns wasCreated: false for an existing pair (either argument order)', async () => {
    const tx: any = {
      conversation: {
        findUnique: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
      },
      likedProfile: { count: vi.fn() },
    }

    const r1 = await service.resolveConversation(tx, 'alice', 'bob')
    const r2 = await service.resolveConversation(tx, 'bob', 'alice')

    expect(r1).toEqual({ convo: existing, wasCreated: false })
    expect(r2).toEqual({ convo: existing, wasCreated: false })
    expect(tx.conversation.create).not.toHaveBeenCalled()
    expect(tx.conversation.findUnique).toHaveBeenCalledTimes(2)
    // Both orderings resolve to the canonical sorted pair:
    for (const call of tx.conversation.findUnique.mock.calls) {
      expect(call[0].where.profileAId_profileBId).toEqual({
        profileAId: 'alice',
        profileBId: 'bob',
      })
    }
  })

  it('creates INITIATED convo for fresh pair without mutual like', async () => {
    const created = {
      id: 'c-new',
      status: 'INITIATED',
      initiatorProfileId: 'alice',
      profileAId: 'alice',
      profileBId: 'bob',
    }
    const tx: any = {
      conversation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(created),
      },
      likedProfile: { count: vi.fn().mockResolvedValue(0) },
    }

    const result = await service.resolveConversation(tx, 'alice', 'bob')

    expect(result).toEqual({ convo: created, wasCreated: true })
    expect(tx.conversation.create).toHaveBeenCalledTimes(1)
    const createArgs = tx.conversation.create.mock.calls[0][0]
    expect(createArgs.data.status).toBe('INITIATED')
    expect(createArgs.data.initiatorProfileId).toBe('alice')
    expect(createArgs.data.profileAId).toBe('alice')
    expect(createArgs.data.profileBId).toBe('bob')
  })

  it('creates ACCEPTED convo for fresh pair with mutual like', async () => {
    const created = {
      id: 'c-match',
      status: 'ACCEPTED',
      initiatorProfileId: 'alice',
      profileAId: 'alice',
      profileBId: 'bob',
    }
    const tx: any = {
      conversation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(created),
      },
      likedProfile: { count: vi.fn().mockResolvedValue(2) },
    }

    const result = await service.resolveConversation(tx, 'alice', 'bob')

    expect(result).toEqual({ convo: created, wasCreated: true })
    expect(tx.conversation.create.mock.calls[0][0].data.status).toBe('ACCEPTED')
  })

  it('handles P2002 by re-querying and returning existing row with wasCreated: false', async () => {
    const existing = {
      id: 'c-race-winner',
      status: 'INITIATED',
      initiatorProfileId: 'bob',
      profileAId: 'alice',
      profileBId: 'bob',
    }
    const p2002: any = new Error('Unique constraint failed')
    p2002.code = 'P2002'

    const findUnique = vi
      .fn()
      // first call: no existing
      .mockResolvedValueOnce(null)
      // re-query after P2002: existing
      .mockResolvedValueOnce(existing)

    const tx: any = {
      conversation: {
        findUnique,
        create: vi.fn().mockRejectedValue(p2002),
      },
      likedProfile: { count: vi.fn().mockResolvedValue(0) },
    }

    const result = await service.resolveConversation(tx, 'alice', 'bob')

    expect(result).toEqual({ convo: existing, wasCreated: false })
    expect(findUnique).toHaveBeenCalledTimes(2)
  })

  it('rethrows non-P2002 errors from conversation.create', async () => {
    const boom = new Error('something else')
    const tx: any = {
      conversation: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockRejectedValue(boom),
      },
      likedProfile: { count: vi.fn().mockResolvedValue(0) },
    }

    await expect(service.resolveConversation(tx, 'alice', 'bob')).rejects.toBe(boom)
  })
})

// acceptConversationOnReply is a thin mechanism: it trusts the caller
// (the route, via computeSendOutcome) to have already validated that the
// accept is legal. The service just writes the state transition.
describe('MessageService.acceptConversationOnReply', () => {
  it('updates conversation status to ACCEPTED', async () => {
    const updated = {
      id: 'c1',
      status: 'ACCEPTED',
      initiatorProfileId: 'alice',
      profileAId: 'alice',
      profileBId: 'bob',
    }
    const tx: any = {
      conversation: {
        update: vi.fn().mockResolvedValue(updated),
      },
    }

    const result = await service.acceptConversationOnReply(tx, 'c1')

    expect(result).toEqual(updated)
    const updateArgs = tx.conversation.update.mock.calls[0][0]
    expect(updateArgs.where).toEqual({ id: 'c1' })
    expect(updateArgs.data.status).toBe('ACCEPTED')
    expect(updateArgs.data.updatedAt).toBeInstanceOf(Date)
  })
})

// sendMessage is a thin mechanism: it trusts the caller (route, via
// computeSendOutcome) that the convo exists and the sender is allowed.
// It owns only input validation (empty content) and dedup.
describe('MessageService.sendMessage (new primitive)', () => {
  const builtMsg = {
    id: 'm-new',
    conversationId: 'c1',
    senderId: 'bob',
    content: 'hi',
    messageType: 'text/plain',
    createdAt: new Date(),
    sender: { id: 'bob', publicName: 'Bob', profileImages: [] },
    attachment: null,
  }

  function txForSend(opts: { duplicate?: any; created?: any } = {}): any {
    return {
      message: {
        findFirst: vi.fn().mockResolvedValue(opts.duplicate ?? null),
        create: vi.fn().mockResolvedValue(opts.created ?? builtMsg),
      },
    }
  }

  it('writes a message and returns isDuplicate: false', async () => {
    const tx = txForSend({})
    const result = await service.sendMessage(tx, 'c1', 'bob', 'hi', 'text/plain')
    expect(result.isDuplicate).toBe(false)
    expect(result.message.id).toBe('m-new')
    expect(tx.message.create).toHaveBeenCalledTimes(1)
  })

  it('returns isDuplicate: true for identical text within 5s, no new row', async () => {
    const tx = txForSend({ duplicate: builtMsg })
    const result = await service.sendMessage(tx, 'c1', 'bob', 'hi', 'text/plain')
    expect(result.isDuplicate).toBe(true)
    expect(tx.message.create).not.toHaveBeenCalled()
  })

  it('skips dedup for attachment-bearing (voice) messages', async () => {
    const tx = txForSend({})
    await service.sendMessage(tx, 'c1', 'bob', '', 'audio/voice', {
      filePath: 'voice/x.opus',
      mimeType: 'audio/ogg',
      fileSize: 1000,
      duration: 5,
    })
    expect(tx.message.findFirst).not.toHaveBeenCalled()
    expect(tx.message.create).toHaveBeenCalledTimes(1)
  })

  it('throws on empty text content', async () => {
    const tx = txForSend({})
    await expect(service.sendMessage(tx, 'c1', 'bob', '   ', 'text/plain')).rejects.toMatchObject({
      code: 'EMPTY_MESSAGE',
    })
    expect(tx.message.create).not.toHaveBeenCalled()
  })
})
