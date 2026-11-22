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
vi.mock('../../composables/useTrustFlags', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../composables/useTrustFlags')>()),
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
  hasFace: false,
  createdAt: '2026-01-01T00:00:00Z',
  userId: 'u1',
  user: { email: 'a@b.com', phonenumber: null },
  activitySummary: null,
  hasActiveTrustFlag: false,
}

const baseDetail = {
  ...baseProfile,
  profileImages: [] as {
    id: string
    hasFace: boolean
    position: number
    variants: { size: string; url: string }[]
  }[],
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
    // /admin/profiles/countries + /admin/users/origins + /admin/profiles list
    useApiCall.mockImplementation((path: string) => {
      if (path === '/admin/profiles/countries') {
        return Promise.resolve({ success: true, countries: ['US'] })
      }
      if (path === '/admin/users/origins') {
        return Promise.resolve({ success: true, origins: ['example.org'] })
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
      return Promise.resolve({ success: true, profile: { ...baseDetail, trustFlags: [] } })
    })
  })

  it('applies table-warning class to flagged rows', async () => {
    const flagged = { ...baseProfile, id: 'p2', publicName: 'Bob', hasActiveTrustFlag: true }
    useApiCall.mockImplementation((path: string) => {
      if (path === '/admin/profiles/countries') {
        return Promise.resolve({ success: true, countries: ['US'] })
      }
      if (path === '/admin/users/origins') {
        return Promise.resolve({ success: true, origins: ['example.org'] })
      }
      return Promise.resolve(listResponse([flagged, baseProfile]))
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()

    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].classes()).toContain('table-warning')
    expect(rows[1].classes()).not.toContain('table-warning')
  })

  it('renders the table columns, segment badge after the name, last active and profile link', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-17T12:00:00Z'))
    const seen = {
      ...baseProfile,
      activitySummary: { segment: 'frequent', lastSeenAt: '2026-11-14T12:00:00Z' },
    }
    useApiCall.mockImplementation((path: string) => {
      if (path === '/admin/profiles/countries') {
        return Promise.resolve({ success: true, countries: ['US'] })
      }
      if (path === '/admin/users/origins') {
        return Promise.resolve({ success: true, origins: ['example.org'] })
      }
      return Promise.resolve(listResponse([seen, { ...baseProfile, id: 'p2' }]))
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()
    vi.useRealTimers()

    const headers = wrapper.findAll('thead th').map((th) => th.text())
    expect(headers).toEqual(['', 'Name', 'Location', 'Last active', 'Created', 'Actions'])

    const [first, second] = wrapper.findAll('tbody tr')
    const cells = first.findAll('td')
    expect(cells[1].text()).toBe('Alice frequent')
    expect(cells[1].find('.badge').text()).toBe('frequent')
    expect(cells[3].text()).toBe('3 days ago')
    expect(second.findAll('td')[3].text()).toBe('—')

    const link = first.find('[data-testid="view-public-profile"]')
    expect(link.text()).toBe('Profile')
    expect(link.attributes('href')).toMatch(/\/profile\/p1$/)
    expect(first.findAll('button').filter((b) => b.text() === 'View')).toHaveLength(0)
  })

  it('renders Created as a relative date with the full timestamp as tooltip', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-01-08T00:00:00Z'))
    const wrapper = mount(ProfilesPage)
    await flushPromises()
    vi.useRealTimers()

    const created = wrapper.find('tbody tr').findAll('td')[4]
    expect(created.text()).toBe('last week')
    expect(created.attributes('title')).toBe(new Date('2026-01-01T00:00:00Z').toLocaleString())
  })

  it('shows a heart after the segment tag only for dating-active profiles', async () => {
    useApiCall.mockImplementation((path: string) => {
      if (path === '/admin/profiles/countries') {
        return Promise.resolve({ success: true, countries: ['US'] })
      }
      if (path === '/admin/users/origins') {
        return Promise.resolve({ success: true, origins: ['example.org'] })
      }
      return Promise.resolve(
        listResponse([
          {
            ...baseProfile,
            isDatingActive: true,
            activitySummary: { segment: 'new', lastSeenAt: '2026-01-01T00:00:00Z' },
          },
          { ...baseProfile, id: 'p2' },
        ])
      )
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()

    const [dating, social] = wrapper.findAll('tbody tr')
    const nameCell = dating.findAll('td')[1]
    expect(nameCell.find('[data-testid="dating-icon"]').exists()).toBe(true)
    expect(nameCell.find('.badge + [data-testid="dating-icon"]').exists()).toBe(true)
    expect(social.find('[data-testid="dating-icon"]').exists()).toBe(false)
  })

  it('shows the face icon after the name only for profiles with hasFace', async () => {
    useApiCall.mockImplementation((path: string) => {
      if (path === '/admin/profiles/countries') {
        return Promise.resolve({ success: true, countries: ['US'] })
      }
      if (path === '/admin/users/origins') {
        return Promise.resolve({ success: true, origins: ['example.org'] })
      }
      return Promise.resolve(
        listResponse([
          { ...baseProfile, hasFace: true },
          { ...baseProfile, id: 'p2' },
        ])
      )
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()

    const [withFace, withoutFace] = wrapper.findAll('tbody tr')
    const faceTag = withFace.findAll('td')[1].find('[data-testid="has-face-icon"]')
    expect(faceTag.classes()).toContain('badge')
    expect(faceTag.text()).toBe('face')
    expect(withoutFace.find('[data-testid="has-face-icon"]').exists()).toBe(false)
  })

  it('updates the row face icon when hasFace is toggled in the detail modal', async () => {
    apiRequestMock.mockImplementation((path: string, opts?: { method?: string }) =>
      opts?.method === 'PATCH'
        ? Promise.resolve({ success: true, profile: { id: 'p1', hasFace: true } })
        : Promise.resolve({ success: true, profile: { ...baseDetail, trustFlags: [] } })
    )

    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    expect(wrapper.find('tbody [data-testid="has-face-icon"]').exists()).toBe(false)
    await wrapper.find('[data-testid="profile-has-face"]').setValue(true)
    await flushPromises()

    expect(wrapper.find('tbody [data-testid="has-face-icon"]').exists()).toBe(true)
  })

  it('requests profiles sorted by date created, then by last active when chosen', async () => {
    const wrapper = mount(ProfilesPage)
    await flushPromises()

    expect(useApiCall).toHaveBeenCalledWith('/admin/profiles', {
      params: expect.objectContaining({ sort: 'created', page: 1 }),
    })

    await wrapper.find('[data-testid="profile-sort"]').setValue('lastActive')
    await flushPromises()

    expect(useApiCall).toHaveBeenLastCalledWith('/admin/profiles', {
      params: expect.objectContaining({ sort: 'lastActive', page: 1 }),
    })
  })

  it('shows "No active trust flags" in modal when profile is clean', async () => {
    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('No active trust flags')
  })

  it('shows the photo review above the ID row with the profile hasFace state', async () => {
    apiRequestMock.mockResolvedValue({
      success: true,
      profile: {
        ...baseDetail,
        hasFace: true,
        trustFlags: [],
        profileImages: [
          { id: 'i1', hasFace: true, position: 0, variants: [{ size: 'thumb', url: 't1' }] },
        ],
      },
    })
    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    const labels = wrapper.findAll('.modal dt').map((dt) => dt.text())
    expect(labels.slice(0, 2)).toEqual(['Photos', 'ID'])
    expect(wrapper.findAll('[data-testid="profile-image"]')).toHaveLength(1)
    const box = wrapper.get<HTMLInputElement>('[data-testid="profile-has-face"]')
    expect(box.element.checked).toBe(true)
  })

  it('omits the phone, gender and created rows from the profile tab', async () => {
    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    const labels = wrapper.findAll('.modal dt').map((dt) => dt.text())
    expect(labels).toContain('User Email')
    expect(labels).not.toContain('User Phone')
    expect(labels).not.toContain('Gender')
    expect(labels).not.toContain('Created')
  })

  it('Profile button links to the public profile in a new window', async () => {
    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    const link = wrapper.find('[data-testid="view-public-profile"]')
    expect(link.attributes('href')).toBe('https://app.example.org/profile/p1')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
  })

  it('shows admin flag note when present', async () => {
    apiRequestMock.mockResolvedValue({
      success: true,
      profile: {
        ...baseDetail,
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

  it('admin flag flow: posts note and updates row to flagged', async () => {
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
      .filter((b) => b.text() === 'Add admin flag')[0]
      .trigger('click')
    await wrapper.find('textarea').setValue('sketchy')
    await wrapper
      .findAll('button')
      .filter((b) => b.text().includes('Confirm admin flag'))[0]
      .trigger('click')
    await flushPromises()

    expect(flagProfileMock).toHaveBeenCalledWith('p1', 'sketchy')
    expect(wrapper.find('tbody tr').classes()).toContain('table-warning')
  })

  it('per-flag clear: clears the targeted flag and updates row state', async () => {
    apiRequestMock.mockResolvedValue({
      success: true,
      profile: {
        ...baseDetail,
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
      if (path === '/admin/users/origins') {
        return Promise.resolve({ success: true, origins: ['example.org'] })
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
        ...baseDetail,
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
    // A system flag clears itself, so an admin hold can still be added on top (#1547)
    const addButtons = wrapper.findAll('button').filter((b) => b.text() === 'Add admin flag')
    expect(addButtons).toHaveLength(1)
  })

  it('hides "Add admin flag" when an admin flag is already active', async () => {
    apiRequestMock.mockResolvedValue({
      success: true,
      profile: {
        ...baseDetail,
        hasActiveTrustFlag: true,
        trustFlags: [
          {
            id: 'fAdmin',
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

    expect(wrapper.findAll('button').filter((b) => b.text() === 'Add admin flag')).toHaveLength(0)
  })

  it('adds an admin flag alongside an active SPAM_BURST flag (#1547)', async () => {
    apiRequestMock.mockResolvedValue({
      success: true,
      profile: {
        ...baseDetail,
        hasActiveTrustFlag: true,
        trustFlags: [
          {
            id: 'fBurst',
            reason: 'SPAM_BURST',
            flaggedAt: '2026-04-25T10:00:00Z',
            flaggedBy: 'heuristic:spam_burst',
            evidence: '7',
          },
        ],
      },
    })
    flagProfileMock.mockResolvedValue({
      success: true,
      flag: {
        id: 'fNew',
        profileId: 'p1',
        reason: 'PROFILE_UNVETTED',
        flaggedAt: '2026-04-25T11:00:00Z',
        flaggedBy: 'admin:manual',
        evidence: 'mass templated openers',
      },
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Add admin flag')[0]
      .trigger('click')
    await wrapper.find('textarea').setValue('mass templated openers')
    await wrapper
      .findAll('button')
      .filter((b) => b.text().includes('Confirm admin flag'))[0]
      .trigger('click')
    await flushPromises()

    expect(flagProfileMock).toHaveBeenCalledWith('p1', 'mass templated openers')
    expect(wrapper.text()).toContain('heuristic:spam_burst')
    expect(wrapper.text()).toContain('mass templated openers')
    expect(wrapper.findAll('button').filter((b) => b.text() === 'Add admin flag')).toHaveLength(0)
  })

  it('labels each active flag with its origin', async () => {
    apiRequestMock.mockResolvedValue({
      success: true,
      profile: {
        ...baseDetail,
        hasActiveTrustFlag: true,
        trustFlags: [
          {
            id: 'fSys',
            reason: 'PROFILE_UNVETTED',
            flaggedAt: '2026-04-25T10:00:00Z',
            flaggedBy: 'system:profile_create',
            evidence: '',
          },
          {
            id: 'fBurst',
            reason: 'SPAM_BURST',
            flaggedAt: '2026-04-25T10:00:00Z',
            flaggedBy: 'heuristic:spam_burst',
            evidence: '5',
          },
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

    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    const badges = wrapper.findAll('.badge').map((b) => b.text())
    expect(badges).toEqual(expect.arrayContaining(['system', 'heuristic', 'admin']))
  })

  it('auto-opens detail modal when ?profileId= is present', async () => {
    mockRoute.query = { profileId: 'p-deep' }
    apiRequestMock.mockResolvedValue({
      success: true,
      profile: {
        ...baseDetail,
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
      if (path === '/admin/users/origins') {
        return Promise.resolve({ success: true, origins: ['example.org'] })
      }
      return Promise.resolve(listResponse([])) // empty list — must hit slow path
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()

    expect(wrapper.text()).toContain('Profile Detail')
    expect(wrapper.text()).toContain('Deep')
  })

  it('detail modal has Profile, Activity and User tabs; User tab lazily loads user detail', async () => {
    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    // Lazy: no user detail fetch until the User tab is opened
    expect(apiRequestMock).not.toHaveBeenCalledWith('/admin/users/u1')

    const tabs = wrapper.findAll('.nav-tabs .nav-link')
    expect(tabs.map((t) => t.text())).toEqual(['Profile', 'Activity', 'User'])

    await tabs.filter((t) => t.text() === 'User')[0].trigger('click')
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u1')
    expect(wrapper.text()).toContain('a@b.com')
    expect((wrapper.find('#editUserOrigin').element as HTMLSelectElement).value).toBe('example.org')
    expect(wrapper.find('#editUserActive').exists()).toBe(true)
  })

  it('Activity tab lazily loads and lists interaction counts', async () => {
    const activity = {
      conversations: { participating: 5, initiated: 2 },
      messages: { sent: 40, received: 31 },
      likes: { sent: 12, received: 9 },
      matches: 3,
      daily: {
        conversations: [{ date: '2026-11-21', initiated: 1, joined: 0 }],
        messages: [{ date: '2026-11-21', sent: 4, received: 2 }],
        likes: [{ date: '2026-11-21', sent: 0, received: 2 }],
        matches: [{ date: '2026-11-21', count: 0 }],
      },
    }
    apiRequestMock.mockImplementation((path: string) => {
      if (path === '/admin/profiles/p1/activity') {
        return Promise.resolve({ success: true, activity })
      }
      return Promise.resolve({ success: true, profile: { ...baseDetail, trustFlags: [] } })
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    expect(apiRequestMock).not.toHaveBeenCalledWith('/admin/profiles/p1/activity')

    await wrapper
      .findAll('.nav-tabs .nav-link')
      .filter((t) => t.text() === 'Activity')[0]
      .trigger('click')
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/profiles/p1/activity')
    const cards = wrapper.find('[data-testid="profile-activity"]').findAll('.kpi-card')
    expect(cards.map((c) => c.find('.card-title').text())).toEqual([
      'Conversations',
      'Messages',
      'Likes',
      'Matches',
    ])
    // Tiles show the 7-day sums of the daily series.
    expect(cards.map((c) => c.find('.kpi-value').text())).toEqual(['1', '6', '2', '0'])
    expect(cards.map((c) => c.find('.kpi-subtitle').text())).toEqual([
      '1 initiated · 0 joined',
      '4 sent · 2 received',
      '0 sent · 2 received',
      'mutual likes',
    ])
    // All-time figures are listed separately, without charts.
    const totals = wrapper.find('[data-testid="profile-activity-totals"]')
    const tile = (c: ReturnType<typeof totals.find>) =>
      ['.fw-semibold', '.fs-5', '.text-body-secondary'].map((sel) => c.find(sel).text())
    expect(totals.findAll('.col').map(tile)).toEqual([
      ['Conversations', '5', '2 initiated · 3 joined'],
      ['Messages', '71', '40 sent · 31 received'],
      ['Likes', '21', '12 sent · 9 received'],
      ['Matches', '3', 'mutual likes'],
    ])
    expect(totals.find('svg').exists()).toBe(false)
    expect(cards.map((c) => c.find('g > title').text())).toEqual([
      '2026-11-21: 1 initiated · 0 joined',
      '2026-11-21: 4 sent · 2 received',
      '2026-11-21: 0 sent · 2 received',
      '2026-11-21: 0',
    ])
    // Stacked cards draw one rect per segment, matches a single bar.
    expect(cards.map((c) => c.findAll('rect').length)).toEqual([2, 2, 2, 1])
  })

  it('Activity tab shows an error when the activity fetch fails', async () => {
    apiRequestMock.mockImplementation((path: string) =>
      path === '/admin/profiles/p1/activity'
        ? Promise.reject(new Error('boom'))
        : Promise.resolve({ success: true, profile: { ...baseDetail, trustFlags: [] } })
    )

    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()
    await wrapper
      .findAll('.nav-tabs .nav-link')
      .filter((t) => t.text() === 'Activity')[0]
      .trigger('click')
    await flushPromises()

    expect(wrapper.find('.modal .alert-danger').text()).toBe('boom')
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
    await wrapper.find('#editUserActive').setValue(false)
    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Save')[0]
      .trigger('click')
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u1', {
      method: 'PATCH',
      body: { isActive: false, language: 'en', originDomain: 'example.org' },
    })
  })

  async function openUserTab() {
    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()
    await wrapper
      .findAll('.nav-tabs .nav-link')
      .filter((t) => t.text() === 'User')[0]
      .trigger('click')
    await flushPromises()
    return wrapper
  }

  it('Block button patches only isBlocked and flips to Unblock', async () => {
    const wrapper = await openUserTab()

    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Block')[0]
      .trigger('click')
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u1', {
      method: 'PATCH',
      body: { isBlocked: true },
    })
    expect(wrapper.findAll('button').filter((b) => b.text() === 'Unblock')).toHaveLength(1)
  })

  it('Unblock button patches isBlocked=false for a blocked user', async () => {
    const defaultImpl = apiRequestMock.getMockImplementation()!
    apiRequestMock.mockImplementation((path: string, opts?: unknown) =>
      path === '/admin/users/u1' && !opts
        ? Promise.resolve({ success: true, user: { ...baseUser, isBlocked: true } })
        : defaultImpl(path, opts)
    )
    const wrapper = await openUserTab()

    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Unblock')[0]
      .trigger('click')
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u1', {
      method: 'PATCH',
      body: { isBlocked: false },
    })
    expect(wrapper.findAll('button').filter((b) => b.text() === 'Block')).toHaveLength(1)
  })

  it('Enter on the Block button does not trigger the modal Save', async () => {
    const wrapper = await openUserTab()
    apiRequestMock.mockClear()

    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Block')[0]
      .trigger('keydown', { key: 'Enter' })
    await flushPromises()

    const patches = apiRequestMock.mock.calls.filter(([, opts]) => opts?.method === 'PATCH')
    expect(patches).toHaveLength(0)
  })

  it('shows an error and keeps the state when blocking fails', async () => {
    const defaultImpl = apiRequestMock.getMockImplementation()!
    apiRequestMock.mockImplementation((path: string, opts?: { method?: string }) =>
      opts?.method === 'PATCH' ? Promise.reject(new Error('boom')) : defaultImpl(path, opts)
    )
    const wrapper = await openUserTab()

    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Block')[0]
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('boom')
    expect(wrapper.findAll('button').filter((b) => b.text() === 'Block')).toHaveLength(1)
  })

  it('Language and Origin selects are populated without hardcoded options', async () => {
    useApiCall.mockImplementation((path: string) => {
      if (path === '/admin/profiles/countries') {
        return Promise.resolve({ success: true, countries: ['US'] })
      }
      if (path === '/admin/users/origins') {
        return Promise.resolve({ success: true, origins: ['example.org', 'otherbrand.example'] })
      }
      return Promise.resolve(listResponse([baseProfile]))
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()
    await wrapper
      .findAll('.nav-tabs .nav-link')
      .filter((t) => t.text() === 'User')[0]
      .trigger('click')
    await flushPromises()

    const languageSelect = wrapper.find('#editUserLanguage')
    const languageValues = languageSelect.findAll('option').map((o) => o.attributes('value'))
    expect(languageValues).toEqual(['en', 'hu'])
    expect((languageSelect.element as HTMLSelectElement).value).toBe('en')

    const originSelect = wrapper.find('#editUserOrigin')
    const originValues = originSelect.findAll('option').map((o) => o.attributes('value'))
    expect(originValues).toEqual(['example.org', 'otherbrand.example'])
    expect((originSelect.element as HTMLSelectElement).value).toBe('example.org')
  })

  it('saving from the User tab sends the edited language and origin domain', async () => {
    useApiCall.mockImplementation((path: string) => {
      if (path === '/admin/profiles/countries') {
        return Promise.resolve({ success: true, countries: ['US'] })
      }
      if (path === '/admin/users/origins') {
        return Promise.resolve({ success: true, origins: ['example.org', 'otherbrand.example'] })
      }
      return Promise.resolve(listResponse([baseProfile]))
    })

    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()
    await wrapper
      .findAll('.nav-tabs .nav-link')
      .filter((t) => t.text() === 'User')[0]
      .trigger('click')
    await flushPromises()

    await wrapper.find('#editUserLanguage').setValue('hu')
    await wrapper.find('#editUserOrigin').setValue('otherbrand.example')
    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Save')[0]
      .trigger('click')
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u1', {
      method: 'PATCH',
      body: {
        isActive: true,
        language: 'hu',
        originDomain: 'otherbrand.example',
      },
    })
  })

  it('ignores a stale user detail response when another profile was opened', async () => {
    const profile2 = { ...baseProfile, id: 'p2', publicName: 'Bob', userId: 'u2' }
    useApiCall.mockImplementation((path: string) => {
      if (path === '/admin/profiles/countries') {
        return Promise.resolve({ success: true, countries: ['US'] })
      }
      if (path === '/admin/users/origins') {
        return Promise.resolve({ success: true, origins: ['example.org'] })
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
      return Promise.resolve({ success: true, profile: { ...baseDetail, trustFlags: [] } })
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
      return Promise.resolve({ success: true, profile: { ...baseDetail, trustFlags: [] } })
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

    await wrapper.find('#editUserActive').setValue(false)
    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Save')[0]
      .trigger('click')
    await flushPromises()

    expect(apiRequestMock).toHaveBeenCalledWith('/admin/users/u9', {
      method: 'PATCH',
      body: { isActive: false, language: 'en', originDomain: 'example.org' },
    })
  })

  it('admin flag controls are hidden on the User tab', async () => {
    const wrapper = mount(ProfilesPage)
    await flushPromises()
    await wrapper.find('tbody tr').trigger('click')
    await flushPromises()

    expect(wrapper.findAll('button').filter((b) => b.text() === 'Add admin flag')).toHaveLength(1)

    await wrapper
      .findAll('.nav-tabs .nav-link')
      .filter((t) => t.text() === 'User')[0]
      .trigger('click')

    expect(wrapper.findAll('button').filter((b) => b.text() === 'Add admin flag')).toHaveLength(0)
    expect(wrapper.findAll('button').filter((b) => b.text() === 'Save')).toHaveLength(1)
  })
})
