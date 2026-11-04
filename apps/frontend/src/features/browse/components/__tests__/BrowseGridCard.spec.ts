import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import type { BrowseListItem } from '@zod/browse/browseList.dto'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/interface/pin.svg', () => ({ default: { template: '<svg />' } }))
vi.mock('../ProfileMapCard.vue', () => ({
  default: { name: 'ProfileMapCard', props: ['item'], template: '<div class="profile-card" />' },
}))
vi.mock('@/features/posts/components/PostMapPopup.vue', () => ({
  default: { name: 'PostMapPopup', props: ['item'], template: '<div class="post-popup" />' },
}))
vi.mock('@/features/events/components/EventMapPopup.vue', () => ({
  default: {
    name: 'EventMapPopup',
    props: { item: Object, titleOnly: Boolean },
    template: '<div class="event-popup" />',
  },
}))
vi.mock('@/features/community/components/CommunityMapPopup.vue', () => ({
  default: {
    name: 'CommunityMapPopup',
    props: ['item'],
    template: '<div class="community-popup" />',
  },
}))

import BrowseGridCard from '../BrowseGridCard.vue'

const item = (kind: BrowseListItem['kind']) =>
  ({ kind, distanceKm: 1, [kind]: { id: `${kind}-1` } }) as unknown as BrowseListItem

describe('BrowseGridCard', () => {
  it.each([
    ['profile', 'ProfileMapCard'],
    ['post', 'PostMapPopup'],
    ['event', 'EventMapPopup'],
    ['community', 'CommunityMapPopup'],
  ] as const)('renders the existing map popup card for a %s', (kind, component) => {
    const wrapper = mount(BrowseGridCard, { props: { item: item(kind) } })
    const card = wrapper.findComponent({ name: component })
    expect(card.exists()).toBe(true)
    expect(card.props('item')).toEqual({ id: `${kind}-1` })
  })

  it('shows events by name only', () => {
    const wrapper = mount(BrowseGridCard, { props: { item: item('event') } })
    expect(wrapper.findComponent({ name: 'EventMapPopup' }).props('titleOnly')).toBe(true)
  })

  it('does not show the distance under the card', () => {
    const wrapper = mount(BrowseGridCard, { props: { item: item('profile') } })
    expect(wrapper.text()).not.toContain('km')
  })

  it('emits select when the card is clicked or activated with Enter', async () => {
    const wrapper = mount(BrowseGridCard, { props: { item: item('post') } })
    await wrapper.trigger('click')
    await wrapper.trigger('keydown.enter')
    expect(wrapper.emitted('select')).toHaveLength(2)
  })

  it('emits hover when the pointer enters and leaves', async () => {
    const wrapper = mount(BrowseGridCard, { props: { item: item('post') } })
    await wrapper.trigger('mouseenter')
    await wrapper.trigger('mouseleave')
    expect(wrapper.emitted('hover')).toEqual([[true], [false]])
  })

  it('emits locate, not select, from the show-on-map button', async () => {
    const wrapper = mount(BrowseGridCard, { props: { item: item('event') } })
    await wrapper.find('.locate-button').trigger('click')
    expect(wrapper.emitted('locate')).toHaveLength(1)
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
