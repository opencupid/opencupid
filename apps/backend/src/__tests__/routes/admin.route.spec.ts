import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

const mockPrisma = vi.hoisted(() => {
  const mock: any = {
    user: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    profile: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      groupBy: vi.fn(),
    },
    profileActivitySummary: {
      groupBy: vi.fn(),
    },
    profileTrustFlag: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tag: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    tagTranslation: {
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $executeRawUnsafe: vi.fn(),
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  }
  // $transaction passes the same mock as the tx argument
  mock.$transaction.mockImplementation((fn: any) => fn(mock))
  return mock
})

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

const mockAppConfig = vi.hoisted(() => ({
  DEEPL_API_KEY: 'test-deepl-key',
  WELCOME_MESSAGE_SENDER_PROFILE_ID: 'sys-sender',
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: mockAppConfig,
}))

const mockTranslateText = vi.hoisted(() => vi.fn())

vi.mock('deepl-node', () => {
  return {
    DeepLClient: class {
      translateText = mockTranslateText
    },
  }
})

const mockMessageService = vi.hoisted(() => ({
  resolveConversation: vi.fn(),
  acceptConversationOnReply: vi.fn(),
  promoteConversation: vi.fn(),
  sendMessage: vi.fn(),
}))

vi.mock('@/services/messaging.service', () => {
  const MessagingErrorCodes = {
    CONVERSATION_BLOCKED: 'CONVERSATION_BLOCKED',
    EMPTY_MESSAGE: 'EMPTY_MESSAGE',
  } as const
  type MessagingErrorCode = (typeof MessagingErrorCodes)[keyof typeof MessagingErrorCodes]
  class MessagingError extends Error {
    readonly code: MessagingErrorCode
    constructor(code: MessagingErrorCode, message: string) {
      super(message)
      this.name = 'MessagingError'
      this.code = code
    }
  }
  return {
    MessageService: {
      getInstance: () => mockMessageService,
    },
    MessagingError,
    MessagingErrorCodes,
  }
})

const mockComputeSendOutcome = vi.hoisted(() => vi.fn())

vi.mock('@/services/messaging.stateMachine', () => ({
  computeSendOutcome: mockComputeSendOutcome,
}))

const mockBroadcastToProfile = vi.hoisted(() => vi.fn())

vi.mock('@/utils/wsUtils', () => ({
  broadcastToProfile: mockBroadcastToProfile,
}))

const mockMapMessageToDTO = vi.hoisted(() => vi.fn((m: any) => ({ ...m, mapped: true })))

vi.mock('../../api/mappers/messaging.mappers', () => ({
  mapMessageToDTO: mockMapMessageToDTO,
}))

import adminRoutes from '../../api/routes/admin.route'
import { MockReply } from '../../test-utils/fastify'
import { ProfileTrustService } from '../../services/profileTrust.service'

class AdminMockFastify {
  public routes: Record<string, any> = {}
  public hooks: Record<string, any[]> = {}
  public log = { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
  // Mirrors the WS plugin's profileId → Set<socket> map. Tests pre-populate
  // entries for recipients they want to receive a broadcast; absent entries
  // mean "offline" and exercise the pre-check path that skips broadcasting.
  public connections: Map<string, Set<unknown>> = new Map()

  get(path: string, opts: any, handler?: any) {
    this.routes[`GET ${path}`] = typeof opts === 'function' ? opts : handler
  }
  post(path: string, opts: any, handler?: any) {
    this.routes[`POST ${path}`] = typeof opts === 'function' ? opts : handler
  }
  patch(path: string, opts: any, handler?: any) {
    this.routes[`PATCH ${path}`] = typeof opts === 'function' ? opts : handler
  }
  addHook(name: string, fn: any) {
    if (!this.hooks[name]) this.hooks[name] = []
    this.hooks[name].push(fn)
  }
  register() {}
}

let fastify: AdminMockFastify
let reply: MockReply

beforeEach(async () => {
  fastify = new AdminMockFastify()
  reply = new MockReply()
  await adminRoutes(fastify as any, {})
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('GET /stats', () => {
  it('returns dashboard stats', async () => {
    mockPrisma.user.count
      .mockResolvedValueOnce(100) // totalUsers
      .mockResolvedValueOnce(5) // recentSignups
      .mockResolvedValueOnce(2) // blockedUsers
    mockPrisma.profile.count
      .mockResolvedValueOnce(90) // totalProfiles
      .mockResolvedValueOnce(80) // activeProfiles
      .mockResolvedValueOnce(3) // reportedProfiles
    mockPrisma.profileActivitySummary.groupBy.mockResolvedValueOnce([
      { segment: 'new', _count: { segment: 10 } },
      { segment: 'returning', _count: { segment: 30 } },
      { segment: 'frequent', _count: { segment: 20 } },
      { segment: 'dormant', _count: { segment: 40 } },
    ])

    const handler = fastify.routes['GET /stats']
    await handler({}, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.stats).toEqual({
      totalUsers: 100,
      totalProfiles: 90,
      activeProfiles: 80,
      recentSignups: 5,
      blockedUsers: 2,
      reportedProfiles: 3,
      segmentCounts: [
        { segment: 'new', count: 10 },
        { segment: 'returning', count: 30 },
        { segment: 'frequent', count: 20 },
        { segment: 'dormant', count: 40 },
      ],
    })
  })

  it('handles errors gracefully', async () => {
    mockPrisma.user.count.mockRejectedValueOnce(new Error('DB error'))

    const handler = fastify.routes['GET /stats']
    await handler({}, reply)

    expect(reply.statusCode).toBe(500)
    expect(reply.payload.success).toBe(false)
  })
})

describe('GET /stats/daily', () => {
  it('returns daily signups and last-seen counts with zero-filled days', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ date: '2026-02-20', count: BigInt(3) }]) // signups
      .mockResolvedValueOnce([
        { date: '2026-02-19', count: BigInt(7) },
        { date: '2026-02-21', count: BigInt(2) },
      ]) // last seen
      .mockResolvedValueOnce([{ date: '2026-03-29', count: BigInt(5) }]) // interactions
      .mockResolvedValueOnce([{ date: '2026-03-30', count: BigInt(2) }]) // matches
      .mockResolvedValueOnce([{ date: '2026-03-28', count: BigInt(10) }]) // messages

    const handler = fastify.routes['GET /stats/daily']
    await handler({}, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.dailySignups).toHaveLength(7)
    expect(reply.payload.dailyLastSeen).toHaveLength(7)
    expect(reply.payload.dailyInteractions).toHaveLength(7)
    expect(reply.payload.dailyMatches).toHaveLength(7)
    expect(reply.payload.dailyMessages).toHaveLength(7)

    // Verify zero-fill: each entry has date and count
    for (const entry of reply.payload.dailySignups) {
      expect(entry).toHaveProperty('date')
      expect(entry).toHaveProperty('count')
      expect(typeof entry.count).toBe('number')
    }
    for (const entry of reply.payload.dailyInteractions) {
      expect(entry).toHaveProperty('date')
      expect(entry).toHaveProperty('count')
      expect(typeof entry.count).toBe('number')
    }
  })

  it('returns all zeros when no data exists', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([]) // signups
      .mockResolvedValueOnce([]) // last seen
      .mockResolvedValueOnce([]) // interactions
      .mockResolvedValueOnce([]) // matches
      .mockResolvedValueOnce([]) // messages

    const handler = fastify.routes['GET /stats/daily']
    await handler({}, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.dailySignups.every((d: any) => d.count === 0)).toBe(true)
    expect(reply.payload.dailyLastSeen.every((d: any) => d.count === 0)).toBe(true)
    expect(reply.payload.dailyInteractions.every((d: any) => d.count === 0)).toBe(true)
    expect(reply.payload.dailyMatches.every((d: any) => d.count === 0)).toBe(true)
    expect(reply.payload.dailyMessages.every((d: any) => d.count === 0)).toBe(true)
  })

  it('handles errors gracefully', async () => {
    mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('DB error'))

    const handler = fastify.routes['GET /stats/daily']
    await handler({}, reply)

    expect(reply.statusCode).toBe(500)
    expect(reply.payload.success).toBe(false)
  })
})

describe('GET /users', () => {
  it('returns paginated user list with lastSeenAt flattened from activitySummary', async () => {
    const seen = new Date('2026-04-20T10:00:00Z')
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'user1',
        email: 'test@test.com',
        phonenumber: null,
        isActive: true,
        isBlocked: false,
        roles: ['user'],
        createdAt: new Date(),
        profile: {
          id: 'prof1',
          publicName: 'Test',
          activitySummary: { lastSeenAt: seen },
        },
      },
    ])
    mockPrisma.user.count.mockResolvedValue(1)

    const handler = fastify.routes['GET /users']
    await handler({ query: { page: '1', pageSize: '25', search: '' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.total).toBe(1)
    expect(reply.payload.users).toHaveLength(1)
    expect(reply.payload.users[0]).toMatchObject({
      id: 'user1',
      lastSeenAt: seen,
      profile: { id: 'prof1', publicName: 'Test' },
    })
    // activitySummary is not leaked through the flattened profile
    expect(reply.payload.users[0].profile).not.toHaveProperty('activitySummary')
  })

  it('returns lastSeenAt: null when profile is missing', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'user2',
        email: 'x@y.z',
        phonenumber: null,
        isActive: false,
        isBlocked: false,
        roles: ['user'],
        createdAt: new Date(),
        profile: null,
      },
    ])
    mockPrisma.user.count.mockResolvedValue(1)

    const handler = fastify.routes['GET /users']
    await handler({ query: { page: '1', pageSize: '25', search: '' } }, reply)

    expect(reply.payload.users[0]).toMatchObject({ lastSeenAt: null, profile: null })
  })

  it('returns lastSeenAt: null when activitySummary is missing', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'user3',
        email: 'a@b.c',
        phonenumber: null,
        isActive: true,
        isBlocked: false,
        roles: ['user'],
        createdAt: new Date(),
        profile: { id: 'prof3', publicName: 'Newbie', activitySummary: null },
      },
    ])
    mockPrisma.user.count.mockResolvedValue(1)

    const handler = fastify.routes['GET /users']
    await handler({ query: { page: '1', pageSize: '25', search: '' } }, reply)

    expect(reply.payload.users[0]).toMatchObject({
      lastSeenAt: null,
      profile: { id: 'prof3', publicName: 'Newbie' },
    })
  })

  it('applies search filter', async () => {
    mockPrisma.user.findMany.mockResolvedValue([])
    mockPrisma.user.count.mockResolvedValue(0)

    const handler = fastify.routes['GET /users']
    await handler({ query: { page: '1', pageSize: '25', search: 'test@' } }, reply)

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { email: { contains: 'test@', mode: 'insensitive' } },
            { phonenumber: { contains: 'test@' } },
          ],
        },
      })
    )
  })
})

describe('GET /users/:id', () => {
  it('returns user detail with lastSeenAt flattened from activitySummary', async () => {
    const seen = new Date('2026-04-22T09:00:00Z')
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user1',
      email: 'test@test.com',
      isActive: true,
      profile: {
        id: 'prof1',
        publicName: 'Test',
        isActive: true,
        isSocialActive: true,
        isDatingActive: false,
        activitySummary: { lastSeenAt: seen },
      },
    })

    const handler = fastify.routes['GET /users/:id']
    await handler({ params: { id: 'user1' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.user).toMatchObject({
      id: 'user1',
      lastSeenAt: seen,
      profile: {
        id: 'prof1',
        publicName: 'Test',
        isActive: true,
        isSocialActive: true,
        isDatingActive: false,
      },
    })
    expect(reply.payload.user.profile).not.toHaveProperty('activitySummary')
  })

  it('returns lastSeenAt: null when the user has no profile', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user2',
      email: 'x@y.z',
      isActive: false,
      profile: null,
    })

    const handler = fastify.routes['GET /users/:id']
    await handler({ params: { id: 'user2' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.user).toMatchObject({ id: 'user2', lastSeenAt: null, profile: null })
  })

  it('returns 404 for missing user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const handler = fastify.routes['GET /users/:id']
    await handler({ params: { id: 'nonexistent' } }, reply)

    expect(reply.statusCode).toBe(404)
  })
})

describe('PATCH /users/:id', () => {
  it('updates user isActive and isBlocked', async () => {
    const updatedUser = { id: 'user1', isActive: false, isBlocked: true }
    mockPrisma.user.update.mockResolvedValue(updatedUser)

    const handler = fastify.routes['PATCH /users/:id']
    await handler({ params: { id: 'user1' }, body: { isActive: false, isBlocked: true } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: { isActive: false, isBlocked: true },
      omit: {
        tokenVersion: true,
        loginToken: true,
        loginTokenExp: true,
      },
    })
  })

  it('returns 400 when no valid fields provided', async () => {
    const handler = fastify.routes['PATCH /users/:id']
    await handler({ params: { id: 'user1' }, body: {} }, reply)

    expect(reply.statusCode).toBe(400)
  })

  it('handles errors gracefully', async () => {
    mockPrisma.user.update.mockRejectedValueOnce(new Error('DB error'))

    const handler = fastify.routes['PATCH /users/:id']
    await handler({ params: { id: 'user1' }, body: { isActive: true } }, reply)

    expect(reply.statusCode).toBe(500)
  })
})

describe('GET /profiles/countries', () => {
  it('returns distinct country list', async () => {
    mockPrisma.profile.groupBy.mockResolvedValue([
      { country: 'DE' },
      { country: 'FR' },
      { country: 'GB' },
    ])

    const handler = fastify.routes['GET /profiles/countries']
    await handler({}, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.countries).toEqual(['DE', 'FR', 'GB'])
  })
})

describe('GET /profiles', () => {
  it('returns paginated profile list', async () => {
    const mockProfiles = [
      {
        id: 'prof1',
        publicName: 'Test User',
        country: 'DE',
        cityName: 'Berlin',
        isActive: true,
        _count: { trustFlags: 0 },
      },
    ]
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)
    mockPrisma.profile.count.mockResolvedValue(1)

    const handler = fastify.routes['GET /profiles']
    await handler({ query: { page: '1', pageSize: '25', search: '' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.profiles).toHaveLength(1)
    expect(reply.payload.profiles[0].id).toBe('prof1')
    expect(reply.payload.profiles[0].hasActiveTrustFlag).toBe(false)
    expect(reply.payload.total).toBe(1)
  })

  it('exposes hasActiveTrustFlag derived from _count.trustFlags', async () => {
    mockPrisma.profile.findMany.mockResolvedValue([
      { id: 'p1', _count: { trustFlags: 1 } },
      { id: 'p2', _count: { trustFlags: 0 } },
    ])
    mockPrisma.profile.count.mockResolvedValue(2)

    const handler = fastify.routes['GET /profiles']
    await handler({ query: {} }, reply)

    const profiles = reply.payload.profiles as Array<{ id: string; hasActiveTrustFlag: boolean }>
    expect(profiles.find((p) => p.id === 'p1')?.hasActiveTrustFlag).toBe(true)
    expect(profiles.find((p) => p.id === 'p2')?.hasActiveTrustFlag).toBe(false)
  })

  it('filters by country when provided', async () => {
    mockPrisma.profile.findMany.mockResolvedValue([])
    mockPrisma.profile.count.mockResolvedValue(0)

    const handler = fastify.routes['GET /profiles']
    await handler({ query: { page: '1', pageSize: '25', search: '', country: 'DE' } }, reply)

    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ country: 'DE' }] },
      })
    )
  })

  it('filters by segments when provided', async () => {
    mockPrisma.profile.findMany.mockResolvedValue([])
    mockPrisma.profile.count.mockResolvedValue(0)

    const handler = fastify.routes['GET /profiles']
    await handler(
      { query: { page: '1', pageSize: '25', search: '', segments: 'new,frequent' } },
      reply
    )

    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { AND: [{ activitySummary: { segment: { in: ['new', 'frequent'] } } }] },
      })
    )
  })

  it('combines country and segments filters', async () => {
    mockPrisma.profile.findMany.mockResolvedValue([])
    mockPrisma.profile.count.mockResolvedValue(0)

    const handler = fastify.routes['GET /profiles']
    await handler(
      { query: { page: '1', pageSize: '25', search: '', country: 'AT', segments: 'dormant' } },
      reply
    )

    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [{ country: 'AT' }, { activitySummary: { segment: { in: ['dormant'] } } }],
        },
      })
    )
  })

  it('search OR clause includes id, publicName, cityName, country', async () => {
    mockPrisma.profile.findMany.mockResolvedValue([])
    mockPrisma.profile.count.mockResolvedValue(0)

    const handler = fastify.routes['GET /profiles']
    await handler({ query: { page: '1', pageSize: '25', search: 'cmod8' } }, reply)

    expect(mockPrisma.profile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          AND: [
            {
              OR: [
                { id: { contains: 'cmod8', mode: 'insensitive' } },
                { publicName: { contains: 'cmod8', mode: 'insensitive' } },
                { cityName: { contains: 'cmod8', mode: 'insensitive' } },
                { country: { contains: 'cmod8', mode: 'insensitive' } },
              ],
            },
          ],
        },
      })
    )
  })
})

describe('GET /profiles/:id', () => {
  it('returns profile detail with trustFlags and hasActiveTrustFlag derived', async () => {
    const mockProfile = {
      id: 'prof1',
      publicName: 'Test',
      user: { id: 'user1' },
      trustFlags: [
        {
          id: 'f1',
          reason: 'PROFILE_UNVETTED',
          flaggedBy: 'admin:manual',
          evidence: { note: 'hold' },
        },
      ],
    }
    mockPrisma.profile.findUnique.mockResolvedValue(mockProfile)

    const handler = fastify.routes['GET /profiles/:id']
    await handler({ params: { id: 'prof1' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.profile.id).toBe('prof1')
    expect(reply.payload.profile.trustFlags).toHaveLength(1)
    expect(reply.payload.profile.hasActiveTrustFlag).toBe(true)
  })

  it('reports hasActiveTrustFlag=false when no flags', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue({ id: 'p2', trustFlags: [] })
    const handler = fastify.routes['GET /profiles/:id']
    await handler({ params: { id: 'p2' } }, reply)
    expect(reply.payload.profile.hasActiveTrustFlag).toBe(false)
  })

  it('returns 404 for missing profile', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue(null)

    const handler = fastify.routes['GET /profiles/:id']
    await handler({ params: { id: 'nonexistent' } }, reply)

    expect(reply.statusCode).toBe(404)
  })
})

describe('POST /tags', () => {
  it('creates a new tag', async () => {
    const mockTag = {
      id: 'tag-new',
      slug: 'hiking',
      name: 'Hiking',
      translations: [{ locale: 'en', name: 'Hiking' }],
      _count: { profiles: 0 },
    }
    mockPrisma.tag.create.mockResolvedValue(mockTag)

    const handler = fastify.routes['POST /tags']
    await handler({ body: { name: 'Hiking' } }, reply)

    expect(reply.statusCode).toBe(201)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.tag).toEqual(mockTag)
  })

  it('uses provided slug if given', async () => {
    mockPrisma.tag.create.mockResolvedValue({ id: 'tag-new' })

    const handler = fastify.routes['POST /tags']
    await handler({ body: { name: 'Hiking', slug: 'custom-slug' } }, reply)

    expect(mockPrisma.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ slug: 'custom-slug' }),
      })
    )
  })

  it('returns 400 when name is missing', async () => {
    const handler = fastify.routes['POST /tags']
    await handler({ body: {} }, reply)

    expect(reply.statusCode).toBe(400)
  })

  it('handles errors gracefully', async () => {
    mockPrisma.tag.create.mockRejectedValueOnce(new Error('Unique constraint'))

    const handler = fastify.routes['POST /tags']
    await handler({ body: { name: 'Duplicate' } }, reply)

    expect(reply.statusCode).toBe(500)
  })
})

describe('GET /tags', () => {
  it('returns paginated tag list', async () => {
    const mockTags = [
      {
        id: 'tag1',
        slug: 'hiking',
        name: 'Hiking',
        isUserCreated: false,
        isApproved: true,
        createdAt: new Date(),
        translations: [{ locale: 'en', name: 'Hiking' }],
        _count: { profiles: 5 },
      },
    ]
    mockPrisma.tag.findMany.mockResolvedValue(mockTags)
    mockPrisma.tag.count.mockResolvedValue(1)

    const handler = fastify.routes['GET /tags']
    await handler({ query: { page: '1', pageSize: '25', search: '' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.tags).toEqual(mockTags)
    expect(reply.payload.total).toBe(1)
  })

  it('applies search filter', async () => {
    mockPrisma.tag.findMany.mockResolvedValue([])
    mockPrisma.tag.count.mockResolvedValue(0)

    const handler = fastify.routes['GET /tags']
    await handler({ query: { page: '1', pageSize: '25', search: 'hike' } }, reply)

    expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isDeleted: false,
          OR: [
            { name: { contains: 'hike', mode: 'insensitive' } },
            { slug: { contains: 'hike', mode: 'insensitive' } },
            { translations: { some: { name: { contains: 'hike', mode: 'insensitive' } } } },
          ],
        },
      })
    )
  })

  it('filters to user-submitted tags when userSubmitted=true', async () => {
    mockPrisma.tag.findMany.mockResolvedValue([])
    mockPrisma.tag.count.mockResolvedValue(0)

    const handler = fastify.routes['GET /tags']
    await handler(
      { query: { page: '1', pageSize: '25', search: '', userSubmitted: 'true' } },
      reply
    )

    expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isDeleted: false, isUserCreated: true },
      })
    )
  })

  it('filters to admin-created tags when userSubmitted=false', async () => {
    mockPrisma.tag.findMany.mockResolvedValue([])
    mockPrisma.tag.count.mockResolvedValue(0)

    const handler = fastify.routes['GET /tags']
    await handler(
      { query: { page: '1', pageSize: '25', search: '', userSubmitted: 'false' } },
      reply
    )

    expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isDeleted: false, isUserCreated: false },
      })
    )
  })

  it('handles errors gracefully', async () => {
    mockPrisma.tag.findMany.mockRejectedValueOnce(new Error('DB error'))

    const handler = fastify.routes['GET /tags']
    await handler({ query: { page: '1', pageSize: '25', search: '' } }, reply)

    expect(reply.statusCode).toBe(500)
    expect(reply.payload.success).toBe(false)
  })
})

describe('PATCH /tags/:id', () => {
  it('updates tag fields', async () => {
    const updatedTag = {
      id: 'tag1',
      slug: 'hiking-updated',
      name: 'Hiking Updated',
      translations: [],
    }
    mockPrisma.tag.update.mockResolvedValue(updatedTag)

    const handler = fastify.routes['PATCH /tags/:id']
    await handler(
      { params: { id: 'tag1' }, body: { slug: 'hiking-updated', name: 'Hiking Updated' } },
      reply
    )

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(mockPrisma.tag.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tag1' },
        data: expect.objectContaining({ slug: 'hiking-updated', name: 'Hiking Updated' }),
      })
    )
  })

  it('upserts translations', async () => {
    const updatedTag = {
      id: 'tag1',
      slug: 'hiking',
      translations: [{ locale: 'en', name: 'Hiking' }],
    }
    mockPrisma.tag.update.mockResolvedValue(updatedTag)

    const handler = fastify.routes['PATCH /tags/:id']
    await handler(
      {
        params: { id: 'tag1' },
        body: { translations: [{ locale: 'en', name: 'Hiking' }] },
      },
      reply
    )

    expect(reply.statusCode).toBe(200)
    expect(mockPrisma.tag.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          translations: {
            upsert: [
              {
                where: { tagId_locale: { tagId: 'tag1', locale: 'en' } },
                update: { name: 'Hiking' },
                create: { locale: 'en', name: 'Hiking' },
              },
            ],
          },
        }),
      })
    )
  })

  it('returns 400 when no valid fields provided', async () => {
    const handler = fastify.routes['PATCH /tags/:id']
    await handler({ params: { id: 'tag1' }, body: {} }, reply)

    expect(reply.statusCode).toBe(400)
  })

  it('handles errors gracefully', async () => {
    mockPrisma.tag.update.mockRejectedValueOnce(new Error('DB error'))

    const handler = fastify.routes['PATCH /tags/:id']
    await handler({ params: { id: 'tag1' }, body: { name: 'Test' } }, reply)

    expect(reply.statusCode).toBe(500)
  })
})

describe('POST /tags/merge', () => {
  it('merges loser tags into winner', async () => {
    mockPrisma.tagTranslation.findMany
      .mockResolvedValueOnce([{ locale: 'en' }]) // winner translations
      .mockResolvedValueOnce([{ id: 10, locale: 'hu', tagId: 'loser1' }]) // loser translations
    mockPrisma.tagTranslation.update.mockResolvedValue({})
    mockPrisma.$executeRawUnsafe.mockResolvedValue(0)
    mockPrisma.tag.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.tag.findUnique.mockResolvedValue({
      id: 'winner1',
      slug: 'hiking',
      translations: [
        { locale: 'en', name: 'Hiking' },
        { locale: 'hu', name: 'Túrázás' },
      ],
      _count: { profiles: 10 },
    })

    const handler = fastify.routes['POST /tags/merge']
    await handler({ body: { winnerTagId: 'winner1', loserTagIds: ['loser1'] } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.mergedCount).toBe(1)
    expect(reply.payload.tag.id).toBe('winner1')
  })

  it('returns 400 when winnerTagId is missing', async () => {
    const handler = fastify.routes['POST /tags/merge']
    await handler({ body: { loserTagIds: ['a'] } }, reply)

    expect(reply.statusCode).toBe(400)
  })

  it('returns 400 when loserTagIds is empty', async () => {
    const handler = fastify.routes['POST /tags/merge']
    await handler({ body: { winnerTagId: 'a', loserTagIds: [] } }, reply)

    expect(reply.statusCode).toBe(400)
  })

  it('returns 400 when winner is in loserTagIds', async () => {
    const handler = fastify.routes['POST /tags/merge']
    await handler({ body: { winnerTagId: 'a', loserTagIds: ['a', 'b'] } }, reply)

    expect(reply.statusCode).toBe(400)
  })

  it('deletes duplicate translations instead of moving', async () => {
    mockPrisma.tagTranslation.findMany
      .mockResolvedValueOnce([{ locale: 'en' }]) // winner already has 'en'
      .mockResolvedValueOnce([{ id: 20, locale: 'en', tagId: 'loser1' }]) // loser also has 'en'
    mockPrisma.tagTranslation.delete.mockResolvedValue({})
    mockPrisma.$executeRawUnsafe.mockResolvedValue(0)
    mockPrisma.tag.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.tag.findUnique.mockResolvedValue({ id: 'winner1' })

    const handler = fastify.routes['POST /tags/merge']
    await handler({ body: { winnerTagId: 'winner1', loserTagIds: ['loser1'] } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(mockPrisma.tagTranslation.delete).toHaveBeenCalledWith({ where: { id: 20 } })
    expect(mockPrisma.tagTranslation.update).not.toHaveBeenCalled()
  })

  it('handles errors gracefully', async () => {
    mockPrisma.$transaction.mockRejectedValueOnce(new Error('DB error'))

    const handler = fastify.routes['POST /tags/merge']
    await handler({ body: { winnerTagId: 'winner1', loserTagIds: ['loser1'] } }, reply)

    expect(reply.statusCode).toBe(500)
  })
})

describe('POST /tags/translate', () => {
  it('translates text to target locales', async () => {
    mockTranslateText
      .mockResolvedValueOnce({ text: 'Wandern' })
      .mockResolvedValueOnce({ text: 'Túrázás' })

    const handler = fastify.routes['POST /tags/translate']
    await handler({ body: { text: 'Hiking', targetLocales: ['de', 'hu'] } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.translations).toEqual({ de: 'Wandern', hu: 'Túrázás' })
  })

  it('maps en to en-GB for DeepL', async () => {
    mockTranslateText.mockResolvedValueOnce({ text: 'Hiking' })

    const handler = fastify.routes['POST /tags/translate']
    await handler({ body: { text: 'Wandern', targetLocales: ['en'] } }, reply)

    expect(mockTranslateText).toHaveBeenCalledWith('Wandern', null, 'en-GB')
  })

  it('returns 400 when text or targetLocales missing', async () => {
    const handler = fastify.routes['POST /tags/translate']
    await handler({ body: {} }, reply)

    expect(reply.statusCode).toBe(400)
  })

  it('returns 503 when DEEPL_API_KEY is not configured', async () => {
    const originalKey = mockAppConfig.DEEPL_API_KEY
    mockAppConfig.DEEPL_API_KEY = ''

    const handler = fastify.routes['POST /tags/translate']
    await handler({ body: { text: 'Hiking', targetLocales: ['de'] } }, reply)

    expect(reply.statusCode).toBe(503)
    mockAppConfig.DEEPL_API_KEY = originalKey
  })

  it('handles DeepL errors gracefully', async () => {
    mockTranslateText.mockRejectedValueOnce(new Error('DeepL quota exceeded'))

    const handler = fastify.routes['POST /tags/translate']
    await handler({ body: { text: 'Hiking', targetLocales: ['de'] } }, reply)

    expect(reply.statusCode).toBe(500)
  })
})

describe('GET /subscribers', () => {
  it('returns subscribers with correct shape', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'user1',
        email: 'alice@example.com',
        language: 'de',
        newsletterOptIn: true,
        profile: { publicName: 'Alice' },
      },
      {
        id: 'user2',
        email: 'bob@example.com',
        language: 'en',
        newsletterOptIn: false,
        profile: { publicName: 'Bob' },
      },
    ])

    const handler = fastify.routes['GET /subscribers']
    await handler({}, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.subscribers).toEqual([
      {
        id: 'user1',
        email: 'alice@example.com',
        name: 'Alice',
        language: 'de',
        newsletterOptIn: true,
      },
      {
        id: 'user2',
        email: 'bob@example.com',
        name: 'Bob',
        language: 'en',
        newsletterOptIn: false,
      },
    ])
  })

  it('only queries users with email and active profile', async () => {
    mockPrisma.user.findMany.mockResolvedValue([])

    const handler = fastify.routes['GET /subscribers']
    await handler({}, reply)

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: {
        email: { not: null },
        profile: { isActive: true },
      },
      select: {
        id: true,
        email: true,
        language: true,
        newsletterOptIn: true,
        profile: { select: { publicName: true } },
      },
    })
  })

  it('defaults name to empty string when profile is null', async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: 'user3',
        email: 'noname@example.com',
        language: 'en',
        newsletterOptIn: true,
        profile: null,
      },
    ])

    const handler = fastify.routes['GET /subscribers']
    await handler({}, reply)

    expect(reply.payload.subscribers[0].name).toBe('')
  })

  it('handles errors gracefully', async () => {
    mockPrisma.user.findMany.mockRejectedValueOnce(new Error('DB error'))

    const handler = fastify.routes['GET /subscribers']
    await handler({}, reply)

    expect(reply.statusCode).toBe(500)
    expect(reply.payload.success).toBe(false)
  })
})

describe('POST /messages', () => {
  // Helper: register a fake socket for `profileId` so the pre-check sees the
  // recipient as online and the WS broadcast runs.
  function bringOnline(profileId: string) {
    fastify.connections.set(profileId, new Set([{}]))
  }

  beforeEach(() => {
    mockAppConfig.WELCOME_MESSAGE_SENDER_PROFILE_ID = 'sys-sender'
    mockMessageService.resolveConversation.mockReset()
    mockMessageService.acceptConversationOnReply.mockReset()
    mockMessageService.promoteConversation.mockReset()
    mockMessageService.sendMessage.mockReset()
    mockComputeSendOutcome.mockReset()
    fastify.connections.clear()
  })

  it('returns 400 when profileIds is missing or empty', async () => {
    const handler = fastify.routes['POST /messages']
    await handler({ body: { content: 'hi' } }, reply)
    expect(reply.statusCode).toBe(400)

    const reply2 = new MockReply()
    await handler({ body: { profileIds: [], content: 'hi' } }, reply2)
    expect(reply2.statusCode).toBe(400)
  })

  it('returns 400 when content is empty', async () => {
    const handler = fastify.routes['POST /messages']
    await handler({ body: { profileIds: ['p1'], content: '   ' } }, reply)
    expect(reply.statusCode).toBe(400)
  })

  it('returns 503 when sender is not configured', async () => {
    mockAppConfig.WELCOME_MESSAGE_SENDER_PROFILE_ID = undefined as any
    const handler = fastify.routes['POST /messages']
    await handler({ body: { profileIds: ['p1'], content: 'hi' } }, reply)
    expect(reply.statusCode).toBe(503)
  })

  it('sends a message to every recipient and reports counts', async () => {
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: { id: 'c1', status: 'INITIATED', initiatorProfileId: 'sys-sender' },
      wasCreated: true,
    })
    mockComputeSendOutcome.mockReturnValue('new_conversation')
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1' },
      isDuplicate: false,
    })
    // Both recipients online — exercises the broadcast path.
    bringOnline('p1')
    bringOnline('p2')

    const handler = fastify.routes['POST /messages']
    await handler({ body: { profileIds: ['p1', 'p2'], content: 'hello' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({ success: true, sent: 2, failed: 0 })
    expect(mockMessageService.resolveConversation).toHaveBeenCalledTimes(2)
    expect(mockMessageService.sendMessage).toHaveBeenCalledWith(
      expect.anything(),
      'c1',
      'sys-sender',
      'hello',
      'text/plain'
    )
    // System sender is never quarantined: computeSendOutcome must be called with
    // senderIsQuarantined=false so the bulk-send path never produces 'pending'.
    // Also assert isAdminBroadcast=true so the self-initiated INITIATED override
    // (#1377) is in effect — without it admins can't follow up to unanswered
    // welcome threads.
    for (const call of mockComputeSendOutcome.mock.calls) {
      expect(call[3]).toBe(false)
      expect(call[4]).toBe(true)
    }
    // WS broadcast fires once per successful recipient with the mapped DTO.
    expect(mockBroadcastToProfile).toHaveBeenCalledTimes(2)
    expect(mockBroadcastToProfile).toHaveBeenCalledWith(
      expect.anything(),
      'p1',
      expect.objectContaining({
        type: 'ws:new_message',
        payload: expect.objectContaining({ mapped: true }),
      })
    )
    expect(mockBroadcastToProfile).toHaveBeenCalledWith(
      expect.anything(),
      'p2',
      expect.objectContaining({ type: 'ws:new_message' })
    )
    expect(mockMessageService.acceptConversationOnReply).not.toHaveBeenCalled()
  })

  it('calls acceptConversationOnReply when outcome is accepted_on_reply', async () => {
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: { id: 'c1', status: 'INITIATED', initiatorProfileId: 'p1' },
      wasCreated: false,
    })
    mockComputeSendOutcome.mockReturnValue('accepted_on_reply')
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1' },
      isDuplicate: false,
    })

    const handler = fastify.routes['POST /messages']
    await handler({ body: { profileIds: ['p1'], content: 'hello' } }, reply)

    expect(mockMessageService.acceptConversationOnReply).toHaveBeenCalledWith(
      expect.anything(),
      'c1'
    )
    expect(reply.payload).toMatchObject({ sent: 1, failed: 0 })
  })

  it('marks blocked recipients as failed but keeps sending to others', async () => {
    mockMessageService.resolveConversation
      .mockResolvedValueOnce({
        convo: { id: 'c1', status: 'BLOCKED', initiatorProfileId: 'p1' },
        wasCreated: false,
      })
      .mockResolvedValueOnce({
        convo: { id: 'c2', status: 'ACCEPTED', initiatorProfileId: 'sys-sender' },
        wasCreated: false,
      })
    mockComputeSendOutcome.mockReturnValueOnce('blocked').mockReturnValueOnce('reply')
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm2' },
      isDuplicate: false,
    })
    bringOnline('ok-p')

    const handler = fastify.routes['POST /messages']
    await handler({ body: { profileIds: ['blocked-p', 'ok-p'], content: 'hello' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({ success: true, sent: 1, failed: 1 })
    expect(reply.payload.results).toEqual([
      { profileId: 'blocked-p', error: 'CONVERSATION_BLOCKED' },
      { profileId: 'ok-p', outcome: 'reply' },
    ])
    // sendMessage was only called once — for the non-blocked recipient
    expect(mockMessageService.sendMessage).toHaveBeenCalledTimes(1)
    // Likewise, only the non-blocked recipient gets a WS broadcast.
    expect(mockBroadcastToProfile).toHaveBeenCalledTimes(1)
    expect(mockBroadcastToProfile).toHaveBeenCalledWith(
      expect.anything(),
      'ok-p',
      expect.objectContaining({ type: 'ws:new_message' })
    )
  })

  it('skips WS broadcast when the message was deduplicated', async () => {
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: { id: 'c1', status: 'ACCEPTED', initiatorProfileId: 'sys-sender' },
      wasCreated: false,
    })
    mockComputeSendOutcome.mockReturnValue('reply')
    // Same content sent twice within dedup window: service returns the prior
    // message and isDuplicate=true. The WS broadcast must NOT fire — the
    // recipient already got the original.
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1' },
      isDuplicate: true,
    })

    const handler = fastify.routes['POST /messages']
    await handler({ body: { profileIds: ['p1'], content: 'hello' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({ sent: 1, failed: 0 })
    expect(mockBroadcastToProfile).not.toHaveBeenCalled()
  })

  it('trims content before sending', async () => {
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: { id: 'c1', status: 'INITIATED', initiatorProfileId: 'sys-sender' },
      wasCreated: true,
    })
    mockComputeSendOutcome.mockReturnValue('new_conversation')
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1' },
      isDuplicate: false,
    })

    const handler = fastify.routes['POST /messages']
    await handler({ body: { profileIds: ['p1'], content: '  hello world  ' } }, reply)

    expect(mockMessageService.sendMessage).toHaveBeenCalledWith(
      expect.anything(),
      'c1',
      'sys-sender',
      'hello world',
      'text/plain'
    )
  })

  it('deduplicates recipient IDs so each recipient is messaged once', async () => {
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: { id: 'c1', status: 'INITIATED', initiatorProfileId: 'sys-sender' },
      wasCreated: true,
    })
    mockComputeSendOutcome.mockReturnValue('new_conversation')
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1' },
      isDuplicate: false,
    })

    const handler = fastify.routes['POST /messages']
    await handler({ body: { profileIds: ['p1', 'p1', 'p2', 'p1'], content: 'hi' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({ success: true, sent: 2, failed: 0 })
    expect(mockMessageService.resolveConversation).toHaveBeenCalledTimes(2)
  })

  it('rejects sending to the configured sender profile', async () => {
    const handler = fastify.routes['POST /messages']
    await handler({ body: { profileIds: ['sys-sender', 'p1'], content: 'hi' } }, reply)

    mockMessageService.resolveConversation.mockResolvedValue({
      convo: { id: 'c1', status: 'INITIATED', initiatorProfileId: 'sys-sender' },
      wasCreated: true,
    })

    // sys-sender is skipped without invoking the service
    expect(reply.payload.results).toEqual(
      expect.arrayContaining([{ profileId: 'sys-sender', error: 'SELF_SEND_NOT_ALLOWED' }])
    )
    // resolveConversation must not have been called for the sender
    for (const call of mockMessageService.resolveConversation.mock.calls) {
      expect(call[2]).not.toBe('sys-sender')
    }
  })

  // accept_and_promote_pending fires when a quarantined user previously sent into
  // the system sender's profile (creating a PENDING with the user as initiator,
  // system sender as silent recipient). The admin's bulk-send to that user must
  // promote the convo + add the system sender as a participant — exactly the
  // same handling as messaging.route.ts user-to-user.
  it('promotes + accepts when outcome is accept_and_promote_pending', async () => {
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: { id: 'c1', status: 'PENDING', initiatorProfileId: 'p1' },
      wasCreated: false,
    })
    mockComputeSendOutcome.mockReturnValue('accept_and_promote_pending')
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1' },
      isDuplicate: false,
    })

    const handler = fastify.routes['POST /messages']
    await handler({ body: { profileIds: ['p1'], content: 'hello' } }, reply)

    // promote first, then accept — order matters because acceptConversationOnReply's
    // updateMany is guarded on status='INITIATED', which is the post-promote state.
    expect(mockMessageService.promoteConversation).toHaveBeenCalledWith(
      expect.anything(),
      'c1',
      'sys-sender'
    )
    expect(mockMessageService.acceptConversationOnReply).toHaveBeenCalledWith(
      expect.anything(),
      'c1'
    )
    expect(reply.payload).toMatchObject({ sent: 1, failed: 0 })
  })

  // Pre-check: if the recipient has no active WebSocket connections, skip the
  // broadcast entirely so we don't fire the warn-log inside broadcastToProfile.
  // Bulk-sends to mostly-offline audiences would otherwise generate hundreds of
  // warning lines — see #1382 review thread.
  it('skips WS broadcast when recipient has no active sockets (no log noise)', async () => {
    mockMessageService.resolveConversation.mockResolvedValue({
      convo: { id: 'c1', status: 'INITIATED', initiatorProfileId: 'sys-sender' },
      wasCreated: true,
    })
    mockComputeSendOutcome.mockReturnValue('new_conversation')
    mockMessageService.sendMessage.mockResolvedValue({
      message: { id: 'm1' },
      isDuplicate: false,
    })
    // No bringOnline() — recipient is offline.

    const handler = fastify.routes['POST /messages']
    await handler({ body: { profileIds: ['offline-p'], content: 'hello' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({ sent: 1, failed: 0 })
    expect(mockBroadcastToProfile).not.toHaveBeenCalled()
  })

  it('returns stable INTERNAL_ERROR code for non-MessagingError failures', async () => {
    mockMessageService.resolveConversation.mockRejectedValue(
      new Error('raw prisma error with sensitive details')
    )

    const handler = fastify.routes['POST /messages']
    await handler({ body: { profileIds: ['p1'], content: 'hi' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload).toMatchObject({ success: true, sent: 0, failed: 1 })
    expect(reply.payload.results).toEqual([{ profileId: 'p1', error: 'INTERNAL_ERROR' }])
  })
})

describe('GET /trust-flags', () => {
  beforeEach(() => {
    // Reset the singleton so any new mock state takes effect.
    ;(ProfileTrustService as any).instance = null
  })

  it('returns flags + total with default pagination, active-only', async () => {
    mockPrisma.profileTrustFlag.findMany.mockResolvedValue([{ id: 'f1', profileId: 'p1' }])
    mockPrisma.profileTrustFlag.count.mockResolvedValue(1)

    const handler = fastify.routes['GET /trust-flags']
    await handler({ query: {} }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.flags).toHaveLength(1)
    expect(reply.payload.total).toBe(1)
    expect(mockPrisma.profileTrustFlag.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clearedAt: null } })
    )
  })

  it('respects activeOnly=false to include cleared rows', async () => {
    mockPrisma.profileTrustFlag.findMany.mockResolvedValue([])
    mockPrisma.profileTrustFlag.count.mockResolvedValue(0)

    const handler = fastify.routes['GET /trust-flags']
    await handler({ query: { activeOnly: 'false' } }, reply)

    const call = mockPrisma.profileTrustFlag.findMany.mock.calls[0][0]
    expect(call.where.clearedAt).toBeUndefined()
  })

  it('passes the reason filter through', async () => {
    mockPrisma.profileTrustFlag.findMany.mockResolvedValue([])
    mockPrisma.profileTrustFlag.count.mockResolvedValue(0)

    const handler = fastify.routes['GET /trust-flags']
    await handler({ query: { reason: 'SPAM_BURST' } }, reply)

    const call = mockPrisma.profileTrustFlag.findMany.mock.calls[0][0]
    expect(call.where.reason).toBe('SPAM_BURST')
  })

  it('clamps pageSize to a sane upper bound', async () => {
    mockPrisma.profileTrustFlag.findMany.mockResolvedValue([])
    mockPrisma.profileTrustFlag.count.mockResolvedValue(0)

    const handler = fastify.routes['GET /trust-flags']
    await handler({ query: { pageSize: '99999' } }, reply)

    expect(reply.payload.pageSize).toBe(100)
  })
})

describe('POST /trust-flags/:id/clear', () => {
  beforeEach(() => {
    ;(ProfileTrustService as any).instance = null
    vi.resetModules()
  })

  it('clears an admin-set flag and returns success', async () => {
    mockPrisma.profileTrustFlag.findUnique.mockResolvedValue({
      id: 'f1',
      profileId: 'p1',
      clearedAt: null,
      flaggedBy: 'admin:manual',
    })
    mockPrisma.profileTrustFlag.update.mockResolvedValue({})
    // The service dynamically imports the queue; provide a mock so the import succeeds.
    vi.doMock('@/queues/profileTrustQueue', () => ({
      profileTrustQueue: { add: vi.fn().mockResolvedValue({}) },
    }))

    const handler = fastify.routes['POST /trust-flags/:id/clear']
    await handler({ params: { id: 'f1' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(mockPrisma.profileTrustFlag.update).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: { clearedAt: expect.any(Date), clearedBy: 'admin:manual' },
    })
  })

  it('returns 404 when the flag is missing', async () => {
    mockPrisma.profileTrustFlag.findUnique.mockResolvedValue(null)

    const handler = fastify.routes['POST /trust-flags/:id/clear']
    await handler({ params: { id: 'missing' } }, reply)

    expect(reply.statusCode).toBe(404)
  })

  it('returns 409 when the flag is heuristic-set', async () => {
    mockPrisma.profileTrustFlag.findUnique.mockResolvedValue({
      id: 'f1',
      profileId: 'p1',
      clearedAt: null,
      flaggedBy: 'heuristic:spam_burst',
    })

    const handler = fastify.routes['POST /trust-flags/:id/clear']
    await handler({ params: { id: 'f1' } }, reply)

    expect(reply.statusCode).toBe(409)
    expect(mockPrisma.profileTrustFlag.update).not.toHaveBeenCalled()
  })

  it('returns 409 when the flag is already cleared', async () => {
    mockPrisma.profileTrustFlag.findUnique.mockResolvedValue({
      id: 'f1',
      profileId: 'p1',
      clearedAt: new Date(),
      flaggedBy: 'admin:manual',
    })

    const handler = fastify.routes['POST /trust-flags/:id/clear']
    await handler({ params: { id: 'f1' } }, reply)

    expect(reply.statusCode).toBe(409)
  })
})

describe('POST /profiles/:id/flag', () => {
  beforeEach(() => {
    ;(ProfileTrustService as any).instance = null
  })

  it('creates a new admin flag with the provided note', async () => {
    mockPrisma.profileTrustFlag.findFirst.mockResolvedValue(null)
    const created = {
      id: 'f1',
      profileId: 'p1',
      flaggedBy: 'admin:manual',
      evidence: { note: 'sketchy' },
    }
    mockPrisma.profileTrustFlag.create.mockResolvedValue(created)

    const handler = fastify.routes['POST /profiles/:id/flag']
    await handler({ params: { id: 'p1' }, body: { note: 'sketchy' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.flag).toEqual(created)
  })

  it('is idempotent — returns the existing admin flag without creating', async () => {
    const existing = {
      id: 'f1',
      profileId: 'p1',
      flaggedBy: 'admin:manual',
      evidence: { note: 'first' },
    }
    mockPrisma.profileTrustFlag.findFirst.mockResolvedValue(existing)

    const handler = fastify.routes['POST /profiles/:id/flag']
    await handler({ params: { id: 'p1' }, body: { note: 'second' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.flag).toEqual(existing)
    expect(mockPrisma.profileTrustFlag.create).not.toHaveBeenCalled()
  })

  it('returns 400 on empty note', async () => {
    const handler = fastify.routes['POST /profiles/:id/flag']
    await handler({ params: { id: 'p1' }, body: { note: '   ' } }, reply)
    expect(reply.statusCode).toBe(400)
  })

  it('returns 400 on note > 1000 chars', async () => {
    const handler = fastify.routes['POST /profiles/:id/flag']
    await handler({ params: { id: 'p1' }, body: { note: 'x'.repeat(1001) } }, reply)
    expect(reply.statusCode).toBe(400)
  })

  it('returns 400 when body is missing', async () => {
    const handler = fastify.routes['POST /profiles/:id/flag']
    await handler({ params: { id: 'p1' } }, reply)
    expect(reply.statusCode).toBe(400)
  })
})

describe('X-Admin-Authenticated header check', () => {
  it('returns 403 when header is missing', async () => {
    const hook = fastify.hooks['onRequest']?.[0]
    expect(hook).toBeDefined()

    const req = { headers: {} }
    await hook(req, reply)

    expect(reply.statusCode).toBe(403)
    expect(reply.payload.success).toBe(false)
    expect(reply.payload.message).toBe('Forbidden')
  })

  it('allows requests with X-Admin-Authenticated header', async () => {
    const hook = fastify.hooks['onRequest']?.[0]
    const req = { headers: { 'x-admin-authenticated': 'true' } }
    const freshReply = new MockReply()

    await hook(req, freshReply)

    // Hook does not override the default status code when allowing through
    expect(freshReply.statusCode).toBe(200)
  })
})
