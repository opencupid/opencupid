import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NotifierService } from '../../services/notifier.service'

let mockPrisma: any
const { mockGetFixedT } = vi.hoisted(() => ({
  mockGetFixedT: vi.fn(),
}))

vi.mock('../../lib/prisma', () => ({
  get prisma() {
    return mockPrisma
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
    mockGetFixedT.mockReturnValue((key: string) => `${key}-translated`)
  })

  it('uses persisted user language directly for translations', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      language: 'de',
      profile: { publicName: 'Alice' },
    })

    const queueEmail = vi.fn().mockResolvedValue(undefined)
    const service = new NotifierService({ queueEmail } as any)

    await service.notifyUser('user-1', 'welcome', {
      link: 'https://frontend.test/me',
    })

    expect(mockGetFixedT).toHaveBeenCalledWith('de')
    expect(queueEmail).toHaveBeenCalledTimes(1)
  })
})
