import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))

import {
  defaultEmailPreferencesCreate,
  isGranted,
  setEmailPreferences,
  toEmailPreferences,
} from '@/services/emailPreference.service'

describe('emailPreference.service', () => {
  it('creates one default row per scope', () => {
    expect(defaultEmailPreferencesCreate()).toEqual({
      createMany: {
        data: [
          { scope: 'notifications', granted: true, source: 'default' },
          { scope: 'reminders', granted: true, source: 'default' },
          { scope: 'newsletter', granted: false, source: 'default' },
        ],
      },
    })
  })

  it('treats a missing row as not granted', () => {
    expect(isGranted([], 'notifications')).toBe(false)
    expect(isGranted([{ scope: 'reminders', granted: true }], 'notifications')).toBe(false)
    expect(isGranted([{ scope: 'notifications', granted: false }], 'notifications')).toBe(false)
    expect(isGranted([{ scope: 'notifications', granted: true }], 'notifications')).toBe(true)
  })

  it('maps rows to a value for every scope', () => {
    expect(toEmailPreferences([{ scope: 'reminders', granted: true }])).toEqual({
      notifications: false,
      reminders: true,
      newsletter: false,
    })
  })

  it('upserts each changed scope with its source', async () => {
    const db = { emailPreference: { upsert: vi.fn() } }

    await setEmailPreferences(db as any, 'u1', { reminders: false, newsletter: true }, 'settings')

    expect(db.emailPreference.upsert).toHaveBeenCalledTimes(2)
    expect(db.emailPreference.upsert).toHaveBeenCalledWith({
      where: { userId_scope: { userId: 'u1', scope: 'newsletter' } },
      create: { userId: 'u1', scope: 'newsletter', granted: true, source: 'settings' },
      update: { granted: true, source: 'settings' },
    })
  })
})
