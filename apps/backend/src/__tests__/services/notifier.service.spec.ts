import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockPrisma } from '../../test-utils/prisma'
import en from '../../../../../packages/shared/i18n/api/en.json'
import hu from '../../../../../packages/shared/i18n/api/hu.json'

let mockPrisma: any = {}
const sendEmail = vi.fn()

vi.mock('../../lib/prisma', () => ({
  get prisma() {
    return mockPrisma
  },
}))

vi.mock('../../queues/dispatcher', () => ({
  dispatcher: {
    sendEmail,
  },
}))

vi.mock('../../lib/appconfig', () => ({
  appConfig: {
    SITE_NAME: 'OpenCupid',
  },
}))

function simpleT(dict: any, key: string, vars: Record<string, string>) {
  const parts = key.split('.')
  let out = dict
  for (const part of parts) {
    out = out[part]
  }
  return String(out).replace(/\{\{(\w+)\}\}/g, (_m, name) => vars[name] ?? '')
}

vi.mock('i18next', () => ({
  default: {
    getFixedT: (lang: string) => (key: string, vars: Record<string, string>) =>
      simpleT(lang === 'hu' ? hu : en, key, vars),
  },
}))

describe('NotifierService email templates', () => {
  beforeEach(() => {
    Object.assign(mockPrisma, createMockPrisma())
    sendEmail.mockReset()
  })

  it('sends styled login_link email in English', async () => {
    const { NotifierService } = await import('../../services/notifier.service')

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'test@example.com',
      language: 'en',
    })

    const notifier = new NotifierService()
    await notifier.notifyUser('u1', 'login_link', {
      link: 'https://example.com/login',
      otp: '123456',
    })

    expect(sendEmail).toHaveBeenCalledOnce()
    const [_to, _subject, html] = sendEmail.mock.calls[0]
    expect(html).toContain('background-color:#f8f5f0')
    expect(html).toContain('color:#3e3f3a')
    expect(html).toContain('background:#325d88')
    expect(html).toContain('background:#93c54b')
    expect(html).toContain('border-radius:999px')
    expect(html).toContain('123456')
    expect(html).toContain('https://example.com/login')
  })

  it('uses Hungarian copy for welcome email', async () => {
    const { NotifierService } = await import('../../services/notifier.service')

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u2',
      email: 'teszt@example.com',
      language: 'hu',
    })

    const notifier = new NotifierService()
    await notifier.notifyUser('u2', 'welcome', {
      link: 'https://example.com/hu',
    })

    const [_to, _subject, html] = sendEmail.mock.calls[0]
    expect(html).toContain('Üdv a fedélzeten!')
    expect(html).toContain('Kapcsolódj most')
  })
})
