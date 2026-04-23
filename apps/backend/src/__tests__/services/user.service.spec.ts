import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UserService } from '../../services/user.service'
import { createMockPrisma } from '../../test-utils/prisma'

let mockPrisma: any = {}
vi.mock('../../lib/prisma', () => ({
  get prisma() {
    return mockPrisma
  },
}))

let service: UserService

beforeEach(() => {
  Object.assign(mockPrisma, createMockPrisma())
  service = UserService.getInstance()
})

describe('UserService.generateLoginToken', () => {
  it('generates a 6 character code', () => {
    const token = service.generateLoginToken()
    expect(token).toHaveLength(6)
  })
})

describe('UserService roles', () => {
  it('adds a role if missing', () => {
    const user = { roles: ['user'] }
    service.addRole(user as any, 'admin' as any)
    expect(user.roles).toContain('admin')
  })

  it('removes a role if present', () => {
    const user = { roles: ['user', 'admin'] }
    service.removeRole(user as any, 'admin' as any)
    expect(user.roles).not.toContain('admin')
  })
})

describe('UserService.validateLoginToken', () => {
  it('returns error when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    const result = await service.validateLoginToken('abc123')
    expect(result).toEqual({
      code: 'AUTH_INVALID_TOKEN',
      message: 'Invalid token',
      success: false,
    })
    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })

  it('updates user and returns result', async () => {
    const user = {
      id: 'u1',
      loginToken: 'abc123',
      isRegistrationConfirmed: false,
      roles: [],
      profile: { id: 'p1' },
    }
    mockPrisma.user.findUnique.mockResolvedValue(user)
    mockPrisma.user.update.mockResolvedValue({
      ...user,
      isRegistrationConfirmed: true,
      loginToken: null,
      loginTokenExp: null,
    })
    const res = await service.validateLoginToken('abc123')
    expect(res.success && res.isNewUser).toBe(true)
    expect(mockPrisma.user.update).toHaveBeenCalled()
  })
})

describe('UserService.setLoginToken', () => {
  it('updates existing user and gates the update on isBlocked=false', async () => {
    const user = { id: 'u1', isRegistrationConfirmed: true }
    mockPrisma.user.findUnique.mockResolvedValue(user)
    const res = await service.setLoginToken({ email: 'a@a.com' }, '123', 'en', 'test.local')
    expect(res.user).toBe(user)
    expect(res.isNewUser).toBe(false)
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', isBlocked: false },
      data: { loginToken: '123', loginTokenExp: expect.any(Date) },
    })
  })

  it('refuses to issue a login token to a blocked user', async () => {
    // Contract: setLoginToken passes isBlocked=false in the updateMany filter so
    // no new login token is persisted for a blocked user. This is the
    // server-side gate preventing magic links from being sent to blocked
    // accounts — see apps/backend/src/api/routes/auth.route.ts.
    const blockedUser = { id: 'u-blocked', isRegistrationConfirmed: true, isBlocked: true }
    mockPrisma.user.findUnique.mockResolvedValue(blockedUser)
    await service.setLoginToken({ email: 'blocked@example.com' }, 'tok', 'en', 'test.local')
    expect(mockPrisma.user.updateMany).toHaveBeenCalledTimes(1)
    const call = mockPrisma.user.updateMany.mock.calls[0][0]
    expect(call.where).toEqual({ id: 'u-blocked', isBlocked: false })
  })

  it('creates new user when missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({ id: 'new' })
    const res = await service.setLoginToken({ phonenumber: '+1' }, '999', 'en', 'test.local')
    expect(res.isNewUser).toBe(true)
    expect(mockPrisma.user.create).toHaveBeenCalled()
    expect(res.user.id).toBe('new')
  })

  it('normalizes email to lowercase when looking up user', async () => {
    const user = { id: 'u1', email: 'test@example.com', isRegistrationConfirmed: true }
    mockPrisma.user.findUnique.mockResolvedValue(user)
    await service.setLoginToken({ email: 'Test@Example.COM' }, '123', 'en', 'test.local')
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    })
  })

  it('normalizes email to lowercase when creating new user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({ id: 'new', email: 'new@example.com' })
    await service.setLoginToken({ email: 'NEW@EXAMPLE.COM' }, '123', 'en', 'test.local')
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        loginToken: '123',
        loginTokenExp: expect.any(Date),
        language: 'en',
        originDomain: 'test.local',
      },
    })
  })

  it('removes whitespace from phone number when looking up user', async () => {
    const user = { id: 'u2', phonenumber: '+12345678901', isRegistrationConfirmed: true }
    mockPrisma.user.findUnique.mockResolvedValue(user)
    await service.setLoginToken({ phonenumber: '+1 234 567 8901' }, '456', 'en', 'test.local')
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { phonenumber: '+12345678901' },
    })
  })

  it('removes whitespace from phone number when creating new user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({ id: 'new', phonenumber: '+12345678901' })
    await service.setLoginToken({ phonenumber: '+1 234 567 8901' }, '456', 'en', 'test.local')
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        phonenumber: '+12345678901',
        loginToken: '456',
        loginTokenExp: expect.any(Date),
        language: 'en',
        originDomain: 'test.local',
      },
    })
  })
})
