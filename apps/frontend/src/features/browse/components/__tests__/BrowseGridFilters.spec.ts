import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { MAX_BROWSE_TAGS, type UserContentKind } from '@shared/maps'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/e-commerce/tag.svg', () => ({ default: { template: '<svg />' } }))
vi.mock('@/assets/icons/interface/pin.svg', () => ({ default: { template: '<svg />' } }))
vi.mock('../BrowseGridLocationField.vue', () => ({
  default: {
    name: 'BrowseGridLocationField',
    props: ['areaName'],
    emits: ['place:select'],
    template: '<div class="location-field-stub" />',
  },
}))
vi.mock('../SelectableTagList.vue', () => ({
  default: {
    name: 'SelectableTagList',
    props: { tags: Array, selectable: Boolean, removable: Boolean },
    emits: ['select', 'remove'],
    template: '<ul class="tag-list"><li v-for="t in tags" :key="t.id">{{ t.name }}</li></ul>',
  },
}))

import BrowseGridFilters from '../BrowseGridFilters.vue'

const tag = (id: string) => ({ id, name: id, slug: id })
const BButton = { template: '<button><slot /></button>' }

function mountFilters(
  props: Partial<{
    selectedTags: ReturnType<typeof tag>[]
    availableTags: ReturnType<typeof tag>[]
    kinds: UserContentKind[]
  }> = {}
) {
  return mount(BrowseGridFilters, {
    props: {
      areaName: 'Szentendre',
      selectedTags: [tag('hiking')],
      availableTags: [tag('hiking'), tag('vegan'), tag('music')],
      kinds: ['profile', 'post'] as UserContentKind[],
      ...props,
    },
    global: { stubs: { BButton } },
  })
}

describe('BrowseGridFilters', () => {
  it('shows the location field with the area name and forwards picked places', async () => {
    const wrapper = mountFilters()
    const field = wrapper.findComponent({ name: 'BrowseGridLocationField' })
    expect(field.props('areaName')).toBe('Szentendre')

    const place = { name: 'Budapest', country: 'HU', lat: 47.5, lon: 19.04 }
    await field.vm.$emit('place:select', place)
    expect(wrapper.emitted('place:select')).toEqual([[place]])
  })

  it('lists the selected tags as removable and forwards removals', async () => {
    const wrapper = mountFilters()
    const list = wrapper.findAllComponents({ name: 'SelectableTagList' })[0]!
    expect(list.props('removable')).toBe(true)
    await list.vm.$emit('remove', tag('hiking'))
    expect(wrapper.emitted('tag:remove')).toEqual([[tag('hiking')]])
  })

  it('offers only tags that are not selected yet, and emits the picked tag', async () => {
    const wrapper = mountFilters()
    await wrapper.find('.add-tag').trigger('click')
    const picker = wrapper.findAllComponents({ name: 'SelectableTagList' })[1]!
    expect(picker.props('tags')).toEqual([tag('vegan'), tag('music')])

    await picker.vm.$emit('select', tag('vegan'))
    expect(wrapper.emitted('tag:add')).toEqual([[tag('vegan')]])
    expect(wrapper.find('.tag-picker').exists()).toBe(false)
  })

  it('hides the add button at the tag limit', () => {
    const selected = Array.from({ length: MAX_BROWSE_TAGS }, (_, i) => tag(`t${i}`))
    const wrapper = mountFilters({ selectedTags: selected, availableTags: [...selected, tag('x')] })
    expect(wrapper.find('.add-tag').exists()).toBe(false)
  })

  it('toggles content types through v-model', async () => {
    const wrapper = mountFilters()
    await wrapper.find('[data-kind="event"]').trigger('click')
    expect(wrapper.emitted('update:kinds')).toEqual([[['profile', 'post', 'event']]])

    // Without a parent binding, defineModel keeps the first change locally.
    await wrapper.find('[data-kind="post"]').trigger('click')
    expect(wrapper.emitted('update:kinds')![1]).toEqual([['profile', 'event']])
  })

  it('keeps the last remaining type switched on', () => {
    const wrapper = mountFilters({ kinds: ['event'] })
    expect(wrapper.find('[data-kind="event"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('[data-kind="post"]').attributes('disabled')).toBeUndefined()
  })
})
