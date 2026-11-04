import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import type { BrowseListItem } from '@zod/browse/browseList.dto'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
  }),
}))
vi.mock('@/assets/icons/interface/cross.svg', () => ({ default: { template: '<svg />' } }))
vi.mock('@/assets/icons/arrows/chevrons-down.svg', () => ({ default: { template: '<svg />' } }))
vi.mock('@/assets/icons/arrows/chevrons-up.svg', () => ({ default: { template: '<svg />' } }))
vi.mock('../BrowseGridCard.vue', () => ({
  default: {
    name: 'BrowseGridCard',
    props: ['item'],
    emits: ['select', 'locate'],
    template: '<div class="grid-card-stub" />',
  },
}))
vi.mock('../BrowseGridFilters.vue', () => ({
  default: {
    name: 'BrowseGridFilters',
    props: ['selectedTags', 'availableTags', 'kinds'],
    emits: ['tag:add', 'tag:remove', 'update:kinds'],
    template: '<div class="grid-filters-stub" />',
  },
}))
vi.mock('@/features/app/components/ShareSheet.vue', () => ({
  default: {
    name: 'ShareSheet',
    props: ['open', 'payload'],
    template: '<div class="share-sheet-stub" :data-open="open"><slot /></div>',
  },
}))

import BrowseGridPanel from '../BrowseGridPanel.vue'

const profile = (id: string) =>
  ({ kind: 'profile', distanceKm: 1, profile: { id } }) as unknown as BrowseListItem

const BButton = { template: '<button><slot /></button>' }

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(BrowseGridPanel, {
    props: {
      items: [profile('p1'), profile('p2')],
      total: 30,
      hasMore: true,
      isLoading: false,
      isLoadingMore: false,
      selectedTags: [{ id: 't1', name: 'hiking', slug: 'hiking' }],
      availableTags: [],
      sharePayload: { title: 't', text: 'x', url: 'https://example.org' },
      kinds: ['profile'],
      ...props,
    },
    global: { stubs: { BButton } },
  })
}

describe('BrowseGridPanel', () => {
  it('shows the area title with the selected tags', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('.grid-summary').text()).toContain('profiles.browse.grid.title')
    expect(wrapper.find('.grid-summary').text()).toContain('#hiking')
  })

  it('renders a card per item and the result count', () => {
    const wrapper = mountPanel()
    expect(wrapper.findAll('.grid-card-stub')).toHaveLength(2)
    expect(wrapper.text()).toContain('profiles.browse.grid.results_count:{"count":30}')
  })

  it('forwards card select and locate events with the item', async () => {
    const wrapper = mountPanel()
    const card = wrapper.findAllComponents({ name: 'BrowseGridCard' })[1]!
    await card.vm.$emit('select')
    await card.vm.$emit('locate')
    expect(wrapper.emitted('select')).toEqual([[profile('p2')]])
    expect(wrapper.emitted('locate')).toEqual([[profile('p2')]])
  })

  it('shows placeholder cards instead of results while loading', () => {
    const wrapper = mountPanel({ isLoading: true })
    expect(wrapper.findAll('.grid-card-stub')).toHaveLength(0)
    expect(wrapper.findAll('.grid-skeleton')).toHaveLength(6)
  })

  it('appends placeholder cards while loading more', () => {
    const wrapper = mountPanel({ isLoadingMore: true })
    expect(wrapper.findAll('.grid-card-stub')).toHaveLength(2)
    expect(wrapper.findAll('.grid-skeleton')).toHaveLength(4)
  })

  it('says when the end of the list is reached', () => {
    expect(mountPanel().text()).not.toContain('profiles.browse.grid.end_of_list')
    expect(mountPanel({ hasMore: false }).text()).toContain('profiles.browse.grid.end_of_list')
  })

  it('shows the empty state with an invite button that opens the share sheet', async () => {
    const wrapper = mountPanel({ items: [], total: 0, hasMore: false })
    expect(wrapper.find('.grid-empty').text()).toContain('profiles.browse.grid.empty_title')

    await wrapper.find('.grid-empty button').trigger('click')
    expect(wrapper.findComponent({ name: 'ShareSheet' }).props('open')).toBe(true)
  })

  it('emits close from the close button', async () => {
    const wrapper = mountPanel()
    await wrapper.find('.close-button').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('passes filter changes through', async () => {
    const wrapper = mountPanel()
    const filters = wrapper.findComponent({ name: 'BrowseGridFilters' })
    const tag = { id: 't2', name: 'vegan', slug: 'vegan' }
    await filters.vm.$emit('tag:add', tag)
    await filters.vm.$emit('update:kinds', ['profile', 'event'])
    expect(wrapper.emitted('tag:add')).toEqual([[tag]])
    expect(wrapper.emitted('update:kinds')).toEqual([[['profile', 'event']]])
  })
})
