import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
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
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/appconfig', () => ({
  appConfig: {},
}))

import adminRoutes from '../../api/routes/admin.route'
import { MockReply } from '../../test-utils/fastify'

// Extended mock that supports addHook
class AdminMockFastify {
  public routes: Record<string, any> = {}
  public hooks: Record<string, any[]> = {}
  public log = { error: vi.fn(), warn: vi.fn(), info: vi.fn() }
  public authenticate = vi.fn()

  addHook(name: string, fn: any) {
    if (!this.hooks[name]) this.hooks[name] = []
    this.hooks[name].push(fn)
  }
  get(path: string, opts: any, handler?: any) {
    this.routes[`GET ${path}`] = typeof opts === 'function' ? opts : handler
  }
  post(path: string, opts: any, handler?: any) {
    this.routes[`POST ${path}`] = typeof opts === 'function' ? opts : handler
  }
  patch(path: string, opts: any, handler?: any) {
    this.routes[`PATCH ${path}`] = typeof opts === 'function' ? opts : handler
  }
  delete(path: string, opts: any, handler?: any) {
    this.routes[`DELETE ${path}`] = typeof opts === 'function' ? opts : handler
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

describe('admin hooks', () => {
  it('registers authenticate and admin role check hooks', () => {
    expect(fastify.hooks['onRequest']).toHaveLength(2)
  })

  it('admin role check rejects non-admin users', async () => {
    const roleCheck = fastify.hooks['onRequest'][1]
    const req = { session: { roles: ['user'] } }
    await roleCheck(req, reply)
    expect(reply.statusCode).toBe(403)
  })

  it('admin role check allows admin users', async () => {
    const roleCheck = fastify.hooks['onRequest'][1]
    const req = { session: { roles: ['user', 'admin'] } }
    await roleCheck(req, reply)
    // Should not set status 403
    expect(reply.statusCode).toBe(200) // default
  })
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
  it('toggles isActive', async () => {
    mockPrisma.user.update.mockResolvedValue({ id: 'user1', isActive: false, isBlocked: false })

    const handler = fastify.routes['PATCH /users/:id']
    await handler({ params: { id: 'user1' }, body: { isActive: false } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(reply.payload.success).toBe(true)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: { isActive: false },
    })
  })

  it('toggles isBlocked', async () => {
    mockPrisma.user.update.mockResolvedValue({ id: 'user1', isActive: true, isBlocked: true })

    const handler = fastify.routes['PATCH /users/:id']
    await handler({ params: { id: 'user1' }, body: { isBlocked: true } }, reply)

    expect(reply.statusCode).toBe(200)
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: { isBlocked: true },
    })
  })

  it('rejects empty body', async () => {
    const handler = fastify.routes['PATCH /users/:id']
    await handler({ params: { id: 'user1' }, body: {} }, reply)

    expect(reply.statusCode).toBe(400)
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
