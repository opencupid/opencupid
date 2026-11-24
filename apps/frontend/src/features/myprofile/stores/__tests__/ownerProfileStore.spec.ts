import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/lib/bus', () => ({
  bus: { emit: vi.fn(), on: vi.fn() },
}))

const { get, patch, post, recordOnboarded } = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
  recordOnboarded: vi.fn(),
}))

vi.mock('@/lib/onboardedHint', () => ({ recordOnboarded }))

// Pass profiles through unvalidated: these tests are about what the store does
// with the server's answer, not about the profile schema.
vi.mock('@zod/profile/profile.dto', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  OwnerProfileSchema: { parse: (p: unknown) => p },
}))
vi.mock('@zod/profile/profile.form', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  CreateProfileFormToPayloadTransform: { parse: (p: unknown) => p },
}))

vi.mock('@/lib/api', () => ({
  api: { get, patch, post },
  safeApiCall: async (fn: () => Promise<unknown>) => fn(),
  isApiOnline: vi.fn(),
}))

import { useOwnerProfileStore } from '../ownerProfileStore'

describe('ownerProfileStore opt-in settings', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    get.mockReset()
    patch.mockReset()
    vi.stubGlobal('__APP_CONFIG__', { NODE_ENV: 'production' })
  })

  it('fetchOptInSettings calls /profiles/me/optin and stores result', async () => {
    get.mockResolvedValue({
      data: {
        optIn: {
          isCallable: false,
          newsletterOptIn: true,
          emailNotificationsOptIn: true,
          isPushNotificationEnabled: true,
        },
      },
    })

    const store = useOwnerProfileStore()
    const res = await store.fetchOptInSettings()

    expect(get).toHaveBeenCalledWith('/profiles/me/optin')
    expect(res.success).toBe(true)
    expect(store.optInSettings).toEqual({
      isCallable: false,
      newsletterOptIn: true,
      emailNotificationsOptIn: true,
      isPushNotificationEnabled: true,
    })
  })

  it('updateOptInSettings patches /profiles/me/optin and updates state', async () => {
    patch.mockResolvedValue({
      data: {
        optIn: {
          isCallable: true,
          newsletterOptIn: false,
          emailNotificationsOptIn: false,
          isPushNotificationEnabled: false,
        },
      },
    })

    const store = useOwnerProfileStore()
    const res = await store.updateOptInSettings({ isPushNotificationEnabled: false })

    expect(patch).toHaveBeenCalledWith('/profiles/me/optin', {
      isPushNotificationEnabled: false,
    })
    expect(res.success).toBe(true)
    expect(store.optInSettings).toEqual({
      isCallable: true,
      newsletterOptIn: false,
      emailNotificationsOptIn: false,
      isPushNotificationEnabled: false,
    })
  })
})

describe('ownerProfileStore.refreshHasFace', () => {
  const ownerProfilePayload = (hasFace: boolean) => ({
    id: 'ckabcdefghijklmnopqrstuvw',
    publicName: 'Me',
    languages: ['en'],
    isDatingActive: false,
    isSocialActive: true,
    isActive: true,
    isOnboarded: true,
    isCallable: true,
    hasKids: null,
    relationship: null,
    gender: null,
    birthday: null,
    pronouns: null,
    hasFace,
    introSocialLocalized: {},
    introDatingLocalized: {},
    profileImages: [],
    tags: [],
    location: { country: 'HU', cityName: 'Budapest', lat: 47.5, lon: 19.04 },
  })

  beforeEach(() => {
    setActivePinia(createPinia())
    get.mockReset()
  })

  it('patches only hasFace on the loaded profile', async () => {
    const store = useOwnerProfileStore()
    const profile = { ...ownerProfilePayload(false), publicName: 'Unsaved edit' } as any
    store.profile = profile
    get.mockResolvedValue({ data: { profile: ownerProfilePayload(true) } })

    const res = await store.refreshHasFace()

    expect(res.success).toBe(true)
    expect(get).toHaveBeenCalledWith('/profiles/me')
    expect(store.profile?.hasFace).toBe(true)
    expect(store.profile?.publicName).toBe('Unsaved edit')
  })

  it('ignores a refresh response that resolves after a newer one', async () => {
    const store = useOwnerProfileStore()
    store.profile = ownerProfilePayload(false) as any

    let resolveOld!: (v: unknown) => void
    get
      .mockImplementationOnce(() => new Promise((r) => (resolveOld = r)))
      .mockResolvedValueOnce({ data: { profile: ownerProfilePayload(true) } })

    const older = store.refreshHasFace()
    await store.refreshHasFace()
    resolveOld({ data: { profile: ownerProfilePayload(false) } })
    await older

    expect(store.profile?.hasFace).toBe(true)
  })
})

describe('ownerProfileStore onboarded hint', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    get.mockReset()
    post.mockReset()
    recordOnboarded.mockReset()
  })

  it.each([true, false])('records the fetched profile (isOnboarded=%s)', async (isOnboarded) => {
    const profile = { id: 'p1', isOnboarded }
    get.mockResolvedValue({ data: { profile } })

    await useOwnerProfileStore().fetchOwnerProfile()

    expect(recordOnboarded).toHaveBeenCalledWith(profile)
  })

  it('records the profile created by onboarding', async () => {
    const profile = { id: 'p1', isOnboarded: true }
    post.mockResolvedValue({ data: { profile } })

    await useOwnerProfileStore().createOwnerProfile({} as never)

    expect(recordOnboarded).toHaveBeenCalledWith(profile)
  })

  it('records nothing when the fetch fails', async () => {
    get.mockRejectedValue(new Error('offline'))

    await useOwnerProfileStore().fetchOwnerProfile()

    expect(recordOnboarded).not.toHaveBeenCalled()
  })
})
