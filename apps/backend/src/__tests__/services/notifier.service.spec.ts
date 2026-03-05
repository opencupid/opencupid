import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotifierService } from '../../services/notifier.service'

let mockPrisma: any
const { mockGetFixedT, mockQueueEmail } = vi.hoisted(() => ({
  mockGetFixedT: vi.fn(),
  mockQueueEmail: vi.fn(),
}))

vi.mock('../../lib/prisma', () => ({
  get prisma() {
    return mockPrisma
  },
}))

vi.mock('../../queues/dispatcher', () => ({
  dispatcher: {
    queueEmail: mockQueueEmail,
  },
}))

vi.mock('i18next', () => ({
  default: {
    getFixedT: mockGetFixedT,
  },
}))

vi.mock('../../lib/appconfig', () => ({
  appConfig: {
    SITE_NAME: 'OpenCupid',
    FRONTEND_URL: 'https://frontend.test',
  },
}))

describe('NotifierService', () => {
  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      profile: {
        findUnique: vi.fn(),
      },
    }

    mockGetFixedT.mockReset()
    mockQueueEmail.mockReset()
    mockGetFixedT.mockReturnValue((key: string) => `${key}-translated`)
  })

  it('notifyUser: skips when user is missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    const service = new NotifierService({ queueEmail: mockQueueEmail } as any)
    await service.notifyUser('missing-user', 'welcome', { link: 'https://frontend.test/me' })

    expect(mockQueueEmail).not.toHaveBeenCalled()
  })

  it('notifyUser: skips when user email is missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: null,
      language: 'en',
      profile: { publicName: 'Alice' },
    })

    const service = new NotifierService({ queueEmail: mockQueueEmail } as any)
    await service.notifyUser('user-1', 'welcome', { link: 'https://frontend.test/me' })

    expect(mockQueueEmail).not.toHaveBeenCalled()
  })

  it('notifyProfile: skips when profile is missing', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue(null)

    const service = new NotifierService({ queueEmail: mockQueueEmail } as any)
    await service.notifyProfile('missing-profile', 'new_like', {
      link: 'https://frontend.test/browse',
    })

    expect(mockQueueEmail).not.toHaveBeenCalled()
  })

  it('notifyProfile: skips when profile has no user', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue({ id: 'profile-1', user: null })

    const service = new NotifierService({ queueEmail: mockQueueEmail } as any)
    await service.notifyProfile('profile-1', 'new_like', { link: 'https://frontend.test/browse' })

    expect(mockQueueEmail).not.toHaveBeenCalled()
  })

  it('notifyProfile: queues email for resolved profile user', async () => {
    mockPrisma.profile.findUnique.mockResolvedValue({
      id: 'profile-1',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        language: 'de',
        profile: { publicName: 'Alice' },
      },
    })

    const service = new NotifierService({ queueEmail: mockQueueEmail } as any)
    await service.notifyProfile('profile-1', 'new_like', { link: 'https://frontend.test/browse' })

    expect(mockGetFixedT).toHaveBeenCalledWith('de')
    expect(mockQueueEmail).toHaveBeenCalledTimes(1)
  })
})
