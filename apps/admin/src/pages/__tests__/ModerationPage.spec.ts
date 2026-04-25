import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRouterPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

vi.mock('../../composables/useTrustFlags', () => ({
  listTrustFlags: vi.fn(),
  clearTrustFlag: vi.fn(),
  flagProfile: vi.fn(),
}))

import * as api from '../../composables/useTrustFlags'
import ModerationPage from '../ModerationPage.vue'

const adminFlag = {
  id: 'f1',
  profileId: 'p1',
  reason: 'PROFILE_UNVETTED' as const,
  flaggedAt: '2026-04-25T10:00:00Z',
  flaggedBy: 'admin:manual',
  clearedAt: null,
  clearedBy: null,
  evidence: { note: 'manual hold' },
  profile: { id: 'p1', publicName: 'Alice', country: 'US', cityName: 'NYC' },
}

const heuristicFlag = {
  id: 'f2',
  profileId: 'p2',
  reason: 'SPAM_BURST' as const,
  flaggedAt: '2026-04-24T10:00:00Z',
  flaggedBy: 'heuristic:spam_burst',
  clearedAt: null,
  clearedBy: null,
  evidence: { countAtFlagTime: 5 },
  profile: { id: 'p2', publicName: 'Bob', country: 'US', cityName: 'LA' },
}

describe('ModerationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(api.listTrustFlags as any).mockResolvedValue({
      success: true,
      flags: [adminFlag, heuristicFlag],
      total: 2,
      page: 1,
      pageSize: 25,
    })
  })

  it('renders flags returned by the API', async () => {
    const wrapper = mount(ModerationPage)
    await flushPromises()
    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.text()).toContain('Bob')
  })

  it('shows Clear button on every active row regardless of source', async () => {
    const wrapper = mount(ModerationPage)
    await flushPromises()
    const clearButtons = wrapper.findAll('button').filter((b) => b.text() === 'Clear')
    expect(clearButtons).toHaveLength(2) // both admin-set and heuristic-set are clearable
  })

  it('refetches with activeOnly=false when "Include cleared" is toggled', async () => {
    const wrapper = mount(ModerationPage)
    await flushPromises()

    const checkbox = wrapper.find('input#include-cleared')
    await checkbox.setValue(true)
    await flushPromises()

    const lastCall = (api.listTrustFlags as any).mock.calls.at(-1)![0]
    expect(lastCall.activeOnly).toBe(false)
  })

  it('passes the reason filter through on change', async () => {
    const wrapper = mount(ModerationPage)
    await flushPromises()

    await wrapper.find('select').setValue('SPAM_BURST')
    await flushPromises()

    const lastCall = (api.listTrustFlags as any).mock.calls.at(-1)![0]
    expect(lastCall.reason).toBe('SPAM_BURST')
  })

  it('calls clearTrustFlag and refetches after confirm', async () => {
    ;(api.clearTrustFlag as any).mockResolvedValue({ success: true })
    const wrapper = mount(ModerationPage)
    await flushPromises()

    // Open the confirm modal.
    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Clear')[0]
      .trigger('click')
    await flushPromises()

    // Click "Clear flag" inside the confirm modal.
    await wrapper
      .findAll('button')
      .filter((b) => b.text() === 'Clear flag')[0]
      .trigger('click')
    await flushPromises()

    expect(api.clearTrustFlag).toHaveBeenCalledWith('f1')
    // Initial load + post-clear refetch
    expect(api.listTrustFlags).toHaveBeenCalledTimes(2)
  })

  it('routes to /profiles?profileId= when a profile link is clicked', async () => {
    const wrapper = mount(ModerationPage)
    await flushPromises()

    await wrapper.find('a').trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith({
      path: '/profiles',
      query: { profileId: 'p1' },
    })
  })

  it('renders empty state when there are no flags', async () => {
    ;(api.listTrustFlags as any).mockResolvedValue({
      success: true,
      flags: [],
      total: 0,
      page: 1,
      pageSize: 25,
    })
    const wrapper = mount(ModerationPage)
    await flushPromises()
    expect(wrapper.text()).toContain('No flags')
  })
})
