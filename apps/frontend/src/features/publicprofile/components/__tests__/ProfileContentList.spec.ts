import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const fetchProfileContent = vi.fn()
vi.mock('@/features/userContent/stores/userContentStore', () => ({
  useUserContentStore: () => ({ fetchProfileContent }),
}))

vi.mock('@/features/posts/components/PostCard.vue', () => ({
  default: {
    props: { post: Object, showDetails: Boolean },
    template: '<div class="post-view" :data-id="post.id" :data-show-details="showDetails" />',
  },
}))
vi.mock('@/features/events/components/EventCard.vue', () => ({
  default: {
    props: { event: Object, showDetails: Boolean },
    template: '<div class="event-view" :data-id="event.id" :data-show-details="showDetails" />',
  },
}))
vi.mock('@/features/community/components/CommunityCard.vue', () => ({
  default: {
    props: { community: Object, showDetails: Boolean },
    template:
      '<div class="community-view" :data-id="community.id" :data-show-details="showDetails" />',
  },
}))

import ProfileContentList from '../ProfileContentList.vue'

const items = [
  { id: 'c1', kind: 'post' },
  { id: 'c2', kind: 'event' },
  { id: 'c3', kind: 'community' },
]

beforeEach(() => {
  fetchProfileContent.mockReset()
})

describe('ProfileContentList', () => {
  it('fetches the profile content and stacks the kind-specific views in order', async () => {
    fetchProfileContent.mockResolvedValue({ success: true, data: { items } })
    const wrapper = mount(ProfileContentList, { props: { profileId: 'p1' } })
    await flushPromises()

    expect(fetchProfileContent).toHaveBeenCalledWith('p1')
    const rendered = wrapper
      .findAll('[data-id]')
      .map((el) => [el.classes()[0], el.attributes('data-id')])
    expect(rendered).toEqual([
      ['post-view', 'c1'],
      ['event-view', 'c2'],
      ['community-view', 'c3'],
    ])
    // Cards render without toolbars; PostCard shows full text by default.
    expect(wrapper.findAll('[data-show-details="true"]')).toHaveLength(0)
  })

  it('renders nothing when the profile has no content', async () => {
    fetchProfileContent.mockResolvedValue({ success: true, data: { items: [] } })
    const wrapper = mount(ProfileContentList, { props: { profileId: 'p1' } })
    await flushPromises()

    expect(wrapper.find('.profile-content-list').exists()).toBe(false)
  })

  it('renders nothing when the fetch fails', async () => {
    fetchProfileContent.mockResolvedValue({ success: false, message: 'boom' })
    const wrapper = mount(ProfileContentList, { props: { profileId: 'p1' } })
    await flushPromises()

    expect(wrapper.find('.profile-content-list').exists()).toBe(false)
  })

  it('refetches when the profile changes and ignores a stale response', async () => {
    let resolveFirst!: (v: unknown) => void
    fetchProfileContent
      .mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce({ success: true, data: { items: [{ id: 'c9', kind: 'post' }] } })

    const wrapper = mount(ProfileContentList, { props: { profileId: 'p1' } })
    await wrapper.setProps({ profileId: 'p2' })
    await flushPromises()
    resolveFirst({ success: true, data: { items } })
    await flushPromises()

    expect(fetchProfileContent).toHaveBeenLastCalledWith('p2')
    expect(wrapper.findAll('[data-id]').map((el) => el.attributes('data-id'))).toEqual(['c9'])
  })
})
