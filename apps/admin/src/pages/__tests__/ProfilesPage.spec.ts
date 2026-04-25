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

function listResponse(profiles: any[]) {
  return { success: true, profiles, total: profiles.length, page: 1, pageSize: 25 }
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
    apiRequestMock.mockResolvedValue({
      success: true,
      profile: { ...baseProfile, trustFlags: [] },
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
})
