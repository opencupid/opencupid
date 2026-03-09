import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount } from '@vue/test-utils'

vi.mock('../OsmPoiMap.vue', () => ({
  default: defineComponent({
    name: 'OsmPoiMap',
    emits: ['map:ready', 'item:select'],
    template: `
      <div>
        <button class="emit-map-ready" @click="$emit('map:ready', {})" />
        <button class="emit-item-select" @click="$emit('item:select', 'p-1')" />
      </div>
    `,
  }),
}))

import MapView from '../MapView.vue'

const DummyPopup = defineComponent({
  props: ['item'],
  render() {
    return h('div', `popup-${this.item?.id}`)
  },
})

type TestItem = { id: string; location: { lat: number; lon: number }; name: string }
const items: TestItem[] = [{ id: 'p-1', location: { lat: 47.5, lon: 19 }, name: 'Alice' }]

function mountMapView(props: Record<string, unknown> = {}) {
  return mount(MapView as any, {
    props: {
      items,
      popupComponent: DummyPopup,
      getLocation: (item: TestItem) => item.location,
      getTitle: (item: TestItem) => item.name,
      ...props,
    },
  })
}

describe('MapView', () => {
  it('shows placeholder and keeps map faded before map:ready', () => {
    const wrapper = mountMapView()
    expect(wrapper.find('.map-placeholder').exists()).toBe(true)
    expect(wrapper.find('.map-view').classes()).toContain('opacity-0')
  })

  it('re-emits item:select from OsmPoiMap', async () => {
    const wrapper = mountMapView()
    await wrapper.find('.emit-item-select').trigger('click')

    expect(wrapper.emitted('item:select')).toEqual([['p-1']])
  })
})
