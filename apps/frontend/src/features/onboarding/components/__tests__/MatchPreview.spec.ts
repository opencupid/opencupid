import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
  safeApiCall: vi.fn((fn) => fn()),
}))

vi.mock('@/assets/icons/emojis/smiling-emoji.svg', () => ({ default: { template: '<svg />' } }))

import MatchPreview from '../MatchPreview.vue'

const profileItem = (id: string, highlighted: boolean) => ({
  kind: 'profile',
  distanceKm: 1,
  highlighted,
  profile: { id, publicName: id, profileImages: [] },
})

const stubs = {
  ProfileMarker: { props: ['profile'], template: '<i class="marker" :data-id="profile.id" />' },
  AnonymousToggle: { template: '<div class="anon-toggle" />' },
  BButton: { template: '<button><slot /></button>' },
}

function mountWithItems(items: unknown[]) {
  // Skip schema validation: the test only cares which profiles come through.
  vi.mocked(api.get).mockResolvedValue({
    data: { success: true, total: items.length, hasMore: false, items },
  })
  return mount(MatchPreview, { global: { stubs, mocks: { $t: (k: string) => k } } })
}

vi.mock('@zod/browse/browseList.dto', async (orig) => ({
  ...(await orig<object>()),
  BrowseListResponseSchema: { parse: (d: unknown) => d },
}))

describe('MatchPreview', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(api.get).mockReset()
  })

  it('shows up to three potential matches, never non-matches', async () => {
    const wrapper = mountWithItems([
      profileItem('a', true),
      profileItem('b', false),
      profileItem('c', true),
      profileItem('d', true),
      profileItem('e', true),
    ])
    await flushPromises()
    const ids = wrapper.findAll('.marker').map((m) => m.attributes('data-id'))
    expect(ids).toHaveLength(3)
    expect(ids).not.toContain('b')
    expect(api.get).toHaveBeenCalledWith(
      '/find/list',
      expect.objectContaining({ params: expect.objectContaining({ kinds: 'profile' }) })
    )
  })

  it('fills missing matches with placeholders', async () => {
    const wrapper = mountWithItems([profileItem('a', true), profileItem('b', false)])
    await flushPromises()
    const ids = wrapper.findAll('.marker').map((m) => m.attributes('data-id'))
    expect(ids).toEqual(['a', 'placeholder-0', 'placeholder-1'])
  })

  it('shows placeholders when the request fails', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.mocked(api.get).mockRejectedValue(new Error('boom'))
    const wrapper = mount(MatchPreview, { global: { stubs, mocks: { $t: (k: string) => k } } })
    await flushPromises()
    expect(wrapper.findAll('.marker')).toHaveLength(3)
    expect(wrapper.find('.anon-toggle').exists()).toBe(true)
  })
})
