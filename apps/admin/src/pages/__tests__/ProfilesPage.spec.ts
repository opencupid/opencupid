import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const mockRoute = { query: {} as Record<string, string | undefined> }
vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
}))

const useApiCall = vi.fn()
const apiRequestMock = vi.fn()
vi.mock('../../composables/useApi', () => ({
  useApi: () => ({
    call: useApiCall,
    loading: ref(false),
    error: ref<string | null>(null),
  }),
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}))

const flagProfileMock = vi.fn()
const clearTrustFlagMock = vi.fn()
vi.mock('../../composables/useTrustFlags', () => ({
  flagProfile: (...args: unknown[]) => flagProfileMock(...args),
  clearTrustFlag: (...args: unknown[]) => clearTrustFlagMock(...args),
}))

import ProfilesPage from '../ProfilesPage.vue'

const baseProfile = {
  id: 'p1',
  publicName: 'Alice',
  country: 'US',
  cityName: 'NYC',
  isSocialActive: true,
  isDatingActive: false,
  isActive: true,
  isReported: false,
  isBlocked: false,
  isOnboarded: true,
  gender: 'F',
  createdAt: '2026-01-01T00:00:00Z',
  userId: 'u1',
  user: { email: 'a@b.com', phonenumber: null },
  activitySummary: null,
  hasActiveTrustFlag: false,
}

const baseUser = {
  id: 'u1',
  email: 'a@b.com',
  phonenumber: null,
  isActive: true,
  isBlocked: false,
  roles: ['user'],
  createdAt: '2026-01-02T00:00:00Z',
  lastSeenAt: null,
  language: 'en',
  originDomain: 'example.org',
}

const baseUserRow = {
  id: 'u9',
  email: 'newbie@x.com',
  phonenumber: null,
  isActive: true,
  isBlocked: false,
  isRegistrationConfirmed: false,
  newsletterOptIn: false,
  createdAt: '2026-01-03T00:00:00Z',
  originDomain: 'example.org',
}

function listResponse(profiles: any[]) {
  return { success: true, profiles, total: profiles.length, page: 1, pageSize: 25 }
}

function usersResponse(users: any[]) {
  return { success: true, users, total: users.length, page: 1, pageSize: 25 }
}

describe('ProfilesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRoute.query = {}
    // /admin/profiles/countries + /admin/profiles list
    useApiCall.mockImplementation((path: string) => {
      if (path === '/admin/profiles/countries') {
        return Promise.resolve({ success: true, countries: ['US'] })
      }
      return Promise.resolve(listResponse([baseProfile]))
    })
    apiRequestMock.mockImplementation((path: string) => {
      if (path === '/admin/users') {
        return Promise.resolve(usersResponse([baseUserRow]))
      }
      if (typeof path === 'string' && path.startsWith('/admin/users/')) {
        return Promise.resolve({ success: true, user: baseUser })
      }
      return Promise.resolve({ success: true, profile: { ...baseProfile, trustFlags: [] } })
    })
  })

  it('applies table-warning class to flagged rows', async () => {
    const flagged = { ...baseProfile, id: 'p2', publicName: 'Bob', hasActiveTrustFlag: true }
    useApiCall.mockImplementation((path: string) => {
      if (path === '/admin/profiles/countries') {
        return Promise.resolve({ success: true, countries: ['US'] })
      }
      return Promise.resolve(listResponse([flagged, baseProfile]))
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].classes()).toContain('table-warning')
    expect(rows[1].classes()).not.toContain('table-warning')
  })

  it('shows "No active trust flags" in modal when profile is clean', async () => {
    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('No active trust flags')
  })

  it('shows admin flag note when present', async () => {
    apiRequestMock.mockResolvedValue({
      success: true,
      profile: {
        ...baseProfile,
        hasActiveTrustFlag: true,
        trustFlags: [
          {
            id: 'f1',
            reason: 'PROFILE_UNVETTED',
            flaggedAt: '2026-04-25T10:00:00Z',
            flaggedBy: 'admin:manual',
            evidence: 'manual hold',
          },
        ],
      },
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('manual hold')
    expect(wrapper.text()).toContain('admin:manual')
  })

  it('quarantine flow: posts note and updates row to flagged', async () => {
    flagProfileMock.mockResolvedValue({
      success: true,
      flag: {
        id: 'fNew',
        profileId: 'p1',
        reason: 'PROFILE_UNVETTED',
        flaggedAt: '2026-04-25T11:00:00Z',
        flaggedBy: 'admin:manual',
        evidence: 'sketchy',
      },
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Quarantine')[0]
      .trigger('click')
    await wrapper.find('textarea').setValue('sketchy')
    await wrapper
      .findAll('button')
      .filter((b) => b.text().includes('Confirm quarantine'))[0]
      .trigger('click')
    await flushPromises()

    expect(flagProfileMock).toHaveBeenCalledWith('p1', 'sketchy')
    expect(wrapper.find('tbody tr').classes()).toContain('table-warning')
  })

  it('per-flag clear: clears the targeted flag and updates row state', async () => {
    apiRequestMock.mockResolvedValue({
      success: true,
      profile: {
        ...baseProfile,
        hasActiveTrustFlag: true,
        trustFlags: [
          {
            id: 'fAdmin',
            reason: 'PROFILE_UNVETTED',
            flaggedAt: '2026-04-25T10:00:00Z',
            flaggedBy: 'admin:manual',
            evidence: 'hold',
          },
        ],
      },
    })
    useApiCall.mockImplementation((path: string) => {
      if (path === '/admin/profiles/countries') {
        return Promise.resolve({ success: true, countries: ['US'] })
      }
      return Promise.resolve(listResponse([{ ...baseProfile, hasActiveTrustFlag: true }]))
    })
    clearTrustFlagMock.mockResolvedValue({ success: true })

    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    // Per-flag Clear button lives in the Trust section card next to the flag
    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Clear')[0]
      .trigger('click')
    // Confirm dialog's primary button reads "Clear flag"
    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Clear flag')[0]
      .trigger('click')
    await flushPromises()

    expect(clearTrustFlagMock).toHaveBeenCalledWith('fAdmin')
    expect(wrapper.find('tbody tr').classes()).not.toContain('table-warning')
  })

  it('per-flag clear is available for system/heuristic flags too', async () => {
    apiRequestMock.mockResolvedValue({
      success: true,
      profile: {
        ...baseProfile,
        hasActiveTrustFlag: true,
        trustFlags: [
          {
            id: 'fSys',
            reason: 'PROFILE_UNVETTED',
            flaggedAt: '2026-04-25T10:00:00Z',
            flaggedBy: 'system:profile_create',
            evidence: '',
          },
        ],
      },
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    // System flag now also has a Clear button (per relaxed policy)
    const clearButtons = wrapper.findAll('button').filter((b) => b.text() === 'Clear')
    expect(clearButtons.length).toBeGreaterThanOrEqual(1)
    // Quarantine button still hidden because the profile already has an active flag
    const quarantineButtons = wrapper.findAll('button').filter((b) => b.text() === 'Quarantine')
    expect(quarantineButtons).toHaveLength(0)
  })

  it('auto-opens detail modal when ?profileId= is present', async () => {
    mockRoute.query = { profileId: 'p-deep' }
    apiRequestMock.mockResolvedValue({
      success: true,
      profile: {
        ...baseProfile,
        id: 'p-deep',
        publicName: 'Deep',
        hasActiveTrustFlag: false,
        trustFlags: [],
      },
    })
    useApiCall.mockImplementation((path: string) => {
      if (path === '/admin/profiles/countries') {
        return Promise.resolve({ success: true, countries: ['US'] })
      }
      return Promise.resolve(listResponse([])) // empty list — must hit slow path
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Profile Detail')
    expect(wrapper.text()).toContain('Deep')
  })

  it('detail modal has Profile and User tabs; User tab lazily loads user detail', async () => {
    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    // Lazy: no user detail fetch until the User tab is opened
    expect(apiRequestMock).not.toHaveBeenCalledWith('/admin/users/u1')

    const tabs = wrapper.findAll('.nav-tabs .nav-link')
    expect(tabs.map((t) => t.text())).toEqual(['Profile', 'User'])

    await tabs.filter((t) => t.text() === 'User')[0].trigger('click')
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u1')
    expect(wrapper.text()).toContain('a@b.com')
    expect(wrapper.text()).toContain('example.org')
    expect(wrapper.find('#editUserActive').exists()).toBe(true)
  })

  it('saving from the User tab patches /admin/users/:id', async () => {
    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    await wrapper
      .findAll('.nav-tabs .nav-link')
      .filter((t) => t.text() === 'User')[0]
      .trigger('click')
    await flushPromises()
    await wrapper.find('#editUserBlocked').setValue(true)
    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Save')[0]
      .trigger('click')
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u1', {
      method: 'PATCH',
      body: { isActive: true, isBlocked: true },
    })
  })

  it('ignores a stale user detail response when another profile was opened', async () => {
    const profile2 = { ...baseProfile, id: 'p2', publicName: 'Bob', userId: 'u2' }
    useApiCall.mockImplementation((path: string) => {
      if (path === '/admin/profiles/countries') {
        return Promise.resolve({ success: true, countries: ['US'] })
      }
      return Promise.resolve(listResponse([baseProfile, profile2]))
    })
    let resolveU1!: (value: unknown) => void
    apiRequestMock.mockImplementation((path: string) => {
      if (path === '/admin/users') {
        return Promise.resolve(usersResponse([]))
      }
      if (path === '/admin/users/u1') {
        return new Promise((resolve) => {
          resolveU1 = resolve
        })
      }
      if (path === '/admin/users/u2') {
        return Promise.resolve({
          success: true,
          user: { ...baseUser, id: 'u2', email: 'bob@b.com' },
        })
      }
      return Promise.resolve({ success: true, profile: { ...baseProfile, trustFlags: [] } })
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()

    function userTab() {
      return wrapper.findAll('.nav-tabs .nav-link').filter((t) => t.text() === 'User')[0]
    }

    // Open p1's User tab: u1 fetch stays pending
    await wrapper.findAll('tbody tr')[0].trigger('click')
    await userTab().trigger('click')
    await flushPromises()

    // Switch to p2's User tab: u2 fetch resolves immediately
    await wrapper.findAll('tbody tr')[1].trigger('click')
    await userTab().trigger('click')
    await flushPromises()

    resolveU1({ success: true, user: baseUser }) // stale u1 response arrives last
    await flushPromises()

    expect(wrapper.text()).toContain('bob@b.com')
    expect(wrapper.text()).not.toContain('a@b.com')
  })

  it('Not onboarded tab lists users without profiles', async () => {
    const wrapper = mount(ProfilesPage)
    await flushPromises()

    const notOnboardedTab = wrapper
      .findAll('.nav-pills .nav-link')
      .filter((t) => t.text().startsWith('Not onboarded'))[0]
    expect(notOnboardedTab.text()).toBe('Not onboarded (1)')

    await notOnboardedTab.trigger('click')
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users', {
      params: expect.objectContaining({ hasProfile: 'false' }),
    })
    expect(wrapper.text()).toContain('newbie@x.com')
    // Profile-only controls are hidden on the users tab
    expect(
      wrapper.findAll('button').filter((b) => b.text().startsWith('Send message'))
    ).toHaveLength(0)
  })

  it('opens a user-only modal from the Not onboarded tab and saves', async () => {
    apiRequestMock.mockImplementation((path: string) => {
      if (path === '/admin/users') {
        return Promise.resolve(usersResponse([baseUserRow]))
      }
      if (typeof path === 'string' && path.startsWith('/admin/users/')) {
        return Promise.resolve({
          success: true,
          user: { ...baseUser, id: 'u9', email: 'newbie@x.com' },
        })
      }
      return Promise.resolve({ success: true, profile: { ...baseProfile, trustFlags: [] } })
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()

    await wrapper
      .findAll('.nav-pills .nav-link')
      .filter((t) => t.text().startsWith('Not onboarded'))[0]
      .trigger('click')
    await flushPromises()

    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u9')
    expect(wrapper.text()).toContain('User Detail')
    // No Profile/User tab bar in user-only mode
    expect(wrapper.find('.nav-tabs').exists()).toBe(false)

    await wrapper.find('#editUserBlocked').setValue(true)
    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Save')[0]
      .trigger('click')
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u9', {
      method: 'PATCH',
      body: { isActive: true, isBlocked: true },
    })
  })

  it('quarantine controls are hidden on the User tab', async () => {
    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('button').filter((b) => b.text() === 'Quarantine')).toHaveLength(1)

    await wrapper
      .findAll('.nav-tabs .nav-link')
      .filter((t) => t.text() === 'User')[0]
      .trigger('click')

    expect(wrapper.findAll('button').filter((b) => b.text() === 'Quarantine')).toHaveLength(0)
    expect(wrapper.findAll('button').filter((b) => b.text() === 'Save')).toHaveLength(1)
  })
})
