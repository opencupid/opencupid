import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UserService } from '../../services/user.service'
import { createMockPrisma } from '../../test-utils/prisma'

vi.mock('fs', () => ({
  default: { promises: { rm: vi.fn().mockResolvedValue(undefined) } },
}))
vi.mock('../../lib/media', () => ({
  getMediaRoot: () => '/tmp/media',
  MEDIA_SUBDIR: { IMAGES: 'images', VOICE: 'voice' },
}))

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

describe('UserService.findByAuthId', () => {
  it('canonicalizes the auth id before lookup', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    await service.findByAuthId('J.Smith+promo@Gmail.com')
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'jsmith@gmail.com' },
    })
  })
})

describe('UserService.setLoginToken', () => {
  it('updates existing user and gates the update on isBlocked=false', async () => {
    const user = { id: 'u1', isRegistrationConfirmed: true }
    mockPrisma.user.findUnique.mockResolvedValue(user)
    const res = await service.setLoginToken({ email: 'a@a.com' }, 'en', 'test.local')
    expect(res.user).toBe(user)
    expect(res.isNewUser).toBe(false)
    expect(res.token).toHaveLength(6)
    expect(mockPrisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 'u1', isBlocked: false, isActive: true },
      data: { loginToken: res.token, loginTokenExp: expect.any(Date) },
    })
  })

  it('re-sends the still-valid token so earlier magic links keep working', async () => {
    const user = {
      id: 'u1',
      isRegistrationConfirmed: true,
      loginToken: 'KEEP42',
      loginTokenExp: new Date(Date.now() + 60_000),
    }
    mockPrisma.user.findUnique.mockResolvedValue(user)
    const res = await service.setLoginToken({ email: 'a@a.com' }, 'en', 'test.local')
    expect(res.token).toBe('KEEP42')
    const { data } = mockPrisma.user.updateMany.mock.calls[0][0]
    expect(data.loginToken).toBe('KEEP42')
    expect(data.loginTokenExp.getTime()).toBeGreaterThan(user.loginTokenExp.getTime())
  })

  it('issues a new token when the previous one has expired', async () => {
    const user = {
      id: 'u1',
      isRegistrationConfirmed: true,
      loginToken: 'OLD123',
      loginTokenExp: new Date(Date.now() - 1000),
    }
    mockPrisma.user.findUnique.mockResolvedValue(user)
    const res = await service.setLoginToken({ email: 'a@a.com' }, 'en', 'test.local')
    expect(res.token).not.toBe('OLD123')
    expect(res.token).toHaveLength(6)
  })

  it('makes the token valid for 120 minutes', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', isRegistrationConfirmed: true })
    const before = Date.now()
    await service.setLoginToken({ email: 'a@a.com' }, 'en', 'test.local')
    const { data } = mockPrisma.user.updateMany.mock.calls[0][0]
    const ttl = data.loginTokenExp.getTime() - before
    expect(ttl).toBeGreaterThanOrEqual(120 * 60_000 - 1000)
    expect(ttl).toBeLessThanOrEqual(120 * 60_000 + 1000)
  })

  it('refuses to issue a login token to a blocked user', async () => {
    // Contract: setLoginToken passes isBlocked=false in the updateMany filter so
    // no new login token is persisted for a blocked user. This is the
    // server-side gate preventing magic links from being sent to blocked
    // accounts — see apps/backend/src/api/routes/auth.route.ts.
    const blockedUser = { id: 'u-blocked', isRegistrationConfirmed: true, isBlocked: true }
    mockPrisma.user.findUnique.mockResolvedValue(blockedUser)
    await service.setLoginToken({ email: 'blocked@example.com' }, 'en', 'test.local')
    expect(mockPrisma.user.updateMany).toHaveBeenCalledTimes(1)
    const call = mockPrisma.user.updateMany.mock.calls[0][0]
    expect(call.where).toEqual({ id: 'u-blocked', isBlocked: false, isActive: true })
  })

  it('creates new user when missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({ id: 'new' })
    const res = await service.setLoginToken({ email: 'new@example.com' }, 'en', 'test.local')
    expect(res.isNewUser).toBe(true)
    expect(res.token).toHaveLength(6)
    expect(mockPrisma.user.create).toHaveBeenCalled()
    expect(res.user.id).toBe('new')
  })

  it('normalizes email to lowercase when looking up user', async () => {
    const user = { id: 'u1', email: 'test@example.com', isRegistrationConfirmed: true }
    mockPrisma.user.findUnique.mockResolvedValue(user)
    await service.setLoginToken({ email: 'Test@Example.COM' }, 'en', 'test.local')
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'test@example.com' },
    })
  })

  it('canonicalizes Gmail dots and plus when looking up user', async () => {
    const user = { id: 'u1', email: 'jsmith@gmail.com', isRegistrationConfirmed: true }
    mockPrisma.user.findUnique.mockResolvedValue(user)
    await service.setLoginToken({ email: 'J.Smith+promo@Gmail.com' }, 'en', 'test.local')
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'jsmith@gmail.com' },
    })
  })

  it('preserves dots for non-Gmail domains when looking up user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({ id: 'new' })
    await service.setLoginToken({ email: 'Foo.Bar@Example.com' }, 'en', 'test.local')
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'foo.bar@example.com' },
    })
  })

  it('normalizes email to lowercase when creating new user', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)
    mockPrisma.user.create.mockResolvedValue({ id: 'new', email: 'new@example.com' })
    await service.setLoginToken({ email: 'NEW@EXAMPLE.COM' }, 'en', 'test.local')
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        loginToken: expect.stringMatching(/^.{6}$/),
        loginTokenExp: expect.any(Date),
        language: 'en',
        originDomain: 'test.local',
      },
    })
  })
})

describe('UserService.deleteAccount', () => {
  it('archives conversations by pair fields before deleting profile', async () => {
    const profileId = 'prof1'
    mockPrisma.profile.findUnique.mockResolvedValue({ id: profileId })
    mockPrisma.likedProfile.deleteMany.mockResolvedValue({})
    mockPrisma.hiddenProfile.deleteMany.mockResolvedValue({})
    mockPrisma.conversation.updateMany.mockResolvedValue({})
    mockPrisma.profile.delete.mockResolvedValue({})
    mockPrisma.user.delete.mockResolvedValue({})

    await service.deleteAccount('user1')

    // Pair fields, not participant rows — PENDING conversations where this
    // profile is the recipient have no participant row for it.
    expect(mockPrisma.conversation.updateMany).toHaveBeenCalledWith({
      where: { OR: [{ profileAId: profileId }, { profileBId: profileId }] },
      data: { status: 'ARCHIVED' },
    })
    expect(mockPrisma.conversation.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      mockPrisma.profile.delete.mock.invocationCallOrder[0]
    )
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user1' } })
  })

  it('still deletes user when profile does not exist', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue(null)
    mockPrisma.user.delete.mockResolvedValue({})

    await service.deleteAccount('user1')

    expect(mockPrisma.profile.delete).not.toHaveBeenCalled()
    expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user1' } })
  })
})

describe('UserService.deactivate', () => {
  it('marks the user inactive, voids any pending login token and revokes refreshes', async () => {
    mockPrisma.user.update.mockResolvedValue({})

    await service.deactivate('user1')

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user1' },
      data: {
        isActive: false,
        loginToken: null,
        loginTokenExp: null,
        tokenVersion: { increment: 1 },
      },
    })
  })
})

describe('UserService.saveAccountDeletionFeedback', () => {
  it('stores the answer and returns its id', async () => {
    mockPrisma.accountDeletionFeedback.create.mockResolvedValue({ id: 'fb1' })

    const id = await service.saveAccountDeletionFeedback({ reason: 'other', comment: 'Too quiet' })

    expect(mockPrisma.accountDeletionFeedback.create).toHaveBeenCalledWith({
      data: { reason: 'other', comment: 'Too quiet' },
      select: { id: true },
    })
    expect(id).toBe('fb1')
  })
})

describe('UserService.addAccountDeletionFeedbackComment', () => {
  it('sets the comment only on an answer that has none', async () => {
    mockPrisma.accountDeletionFeedback.updateMany.mockResolvedValue({ count: 1 })

    const updated = await service.addAccountDeletionFeedbackComment('fb1', 'Upload kept failing')

    expect(mockPrisma.accountDeletionFeedback.updateMany).toHaveBeenCalledWith({
      where: { id: 'fb1', comment: null },
      data: { comment: 'Upload kept failing' },
    })
    expect(updated).toBe(true)
  })

  it('reports when no answer was updated', async () => {
    mockPrisma.accountDeletionFeedback.updateMany.mockResolvedValue({ count: 0 })

    expect(await service.addAccountDeletionFeedbackComment('nope', 'Hi')).toBe(false)
  })
})
