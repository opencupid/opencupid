import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import type { BrowseListItem } from '@zod/browse/browseList.dto'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    locale: ref('en'),
  }),
}))
vi.mock('@/assets/icons/interface/pin.svg', () => ({ default: { template: '<svg />' } }))
vi.mock('@/assets/icons/interface/heart.svg', () => ({
  default: { template: '<svg class="icon-heart" />' },
}))
vi.mock('../ProfileMapCard.vue', () => ({
  default: { name: 'ProfileMapCard', props: ['item'], template: '<div class="profile-card" />' },
}))
vi.mock('@/features/posts/components/PostMapPopup.vue', () => ({
  default: { name: 'PostMapPopup', props: ['item'], template: '<div class="post-popup" />' },
}))
vi.mock('@/features/userContent/components/UserContentCard.vue', () => ({
  default: {
    name: 'UserContentCard',
    props: ['item', 'kind'],
    template: '<div class="content-card"><slot /></div>',
  },
}))

import BrowseGridCard from '../BrowseGridCard.vue'

const item = (kind: BrowseListItem['kind']) =>
  ({ kind, distanceKm: 1, [kind]: { id: `${kind}-1` } }) as unknown as BrowseListItem

describe('BrowseGridCard', () => {
  it.each([
    ['profile', 'ProfileMapCard'],
    ['post', 'PostMapPopup'],
  ] as const)('renders the existing map popup card for a %s', (kind, component) => {
    const wrapper = mount(BrowseGridCard, { props: { item: item(kind) } })
    const card = wrapper.findComponent({ name: component })
    expect(card.exists()).toBe(true)
    expect(card.props('item')).toEqual({ id: `${kind}-1` })
  })

  it('renders an event as a content card with its start time', () => {
    const event = {
      kind: 'event',
      distanceKm: 1,
      event: { id: 'e1', startsAt: new Date('2026-11-15T16:00:00Z') },
    } as unknown as BrowseListItem
    const card = mount(BrowseGridCard, { props: { item: event } }).findComponent({
      name: 'UserContentCard',
    })
    expect(card.props('kind')).toBe('event')
    expect(card.text()).toContain('2026')
  })

  it('renders a community as a content card with its founding year', () => {
    const community = {
      kind: 'community',
      distanceKm: 1,
      community: { id: 'c1', yearFounded: 2019 },
    } as unknown as BrowseListItem
    const card = mount(BrowseGridCard, { props: { item: community } }).findComponent({
      name: 'UserContentCard',
    })
    expect(card.props('kind')).toBe('community')
    expect(card.text()).toBe('community.labels.founded_since:{"year":2019}')
  })

  it('marks a potential dating match with the halo and a heart', () => {
    const match = { ...item('profile'), highlighted: true } as BrowseListItem
    const wrapper = mount(BrowseGridCard, { props: { item: match } })
    expect(wrapper.find('.card-frame').classes()).toContain('card-frame--match')
    expect(wrapper.find('.match-badge .icon-heart').exists()).toBe(true)
    expect(wrapper.find('.match-badge').attributes('aria-label')).toBe('profiles.dating_match')
  })

  it('leaves other profiles unmarked', () => {
    const other = { ...item('profile'), highlighted: false } as BrowseListItem
    const wrapper = mount(BrowseGridCard, { props: { item: other } })
    expect(wrapper.find('.card-frame').classes()).not.toContain('card-frame--match')
    expect(wrapper.find('.match-badge').exists()).toBe(false)
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
