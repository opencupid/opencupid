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

import adminRoutes from '../../api/routes/admin.route'
import { MockReply } from '../../test-utils/fastify'

class AdminMockFastify {
  public routes: Record<string, any> = {}
  public hooks: Record<string, any[]> = {}
  public log = { error: vi.fn(), warn: vi.fn(), info: vi.fn() }

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
  it('returns daily signups and logins with zero-filled days', async () => {
    mockPrisma.$queryRaw
      .mockResolvedValueOnce([{ date: '2026-02-20', count: BigInt(3) }]) // signups
      .mockResolvedValueOnce([
        { date: '2026-02-19', count: BigInt(7) },
        { date: '2026-02-21', count: BigInt(2) },
      ]) // logins

    const handler = fastify.routes['GET /stats/daily']
    await handler({}, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.dailySignups).toHaveLength(7)
    expect(reply.payload.dailyLogins).toHaveLength(7)

    // Verify zero-fill: each entry has date and count
    for (const entry of reply.payload.dailySignups) {
      expect(entry).toHaveProperty('date')
      expect(entry).toHaveProperty('count')
      expect(typeof entry.count).toBe('number')
    }
  })

  it('returns all zeros when no data exists', async () => {
    mockPrisma.$queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    const handler = fastify.routes['GET /stats/daily']
    await handler({}, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.dailySignups.every((d: any) => d.count === 0)).toBe(true)
    expect(reply.payload.dailyLogins.every((d: any) => d.count === 0)).toBe(true)
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
  it('returns paginated user list', async () => {
    const mockUsers = [
      {
        id: 'user1',
        email: 'test@test.com',
        phonenumber: null,
        isActive: true,
        isBlocked: false,
        roles: ['user'],
        createdAt: new Date(),
        lastLoginAt: null,
        profile: { id: 'prof1', publicName: 'Test' },
      },
    ]
    mockPrisma.user.findMany.mockResolvedValue(mockUsers)
    mockPrisma.user.count.mockResolvedValue(1)

    const handler = fastify.routes['GET /users']
    await handler({ query: { page: '1', pageSize: '25', search: '' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.users).toEqual(mockUsers)
    expect(reply.payload.total).toBe(1)
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
  it('returns user detail', async () => {
    const mockUser = { id: 'user1', email: 'test@test.com', isActive: true }
    mockPrisma.user.findUnique.mockResolvedValue(mockUser)

    const handler = fastify.routes['GET /users/:id']
    await handler({ params: { id: 'user1' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.user).toEqual(mockUser)
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
      },
    ]
    mockPrisma.profile.findMany.mockResolvedValue(mockProfiles)
    mockPrisma.profile.count.mockResolvedValue(1)

    const handler = fastify.routes['GET /profiles']
    await handler({ query: { page: '1', pageSize: '25', search: '' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.profiles).toEqual(mockProfiles)
    expect(reply.payload.total).toBe(1)
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
})

describe('GET /profiles/:id', () => {
  it('returns profile detail', async () => {
    const mockProfile = { id: 'prof1', publicName: 'Test', user: { id: 'user1' } }
    mockPrisma.profile.findUnique.mockResolvedValue(mockProfile)

    const handler = fastify.routes['GET /profiles/:id']
    await handler({ params: { id: 'prof1' } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(reply.payload.profile).toEqual(mockProfile)
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
        language: null,
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
