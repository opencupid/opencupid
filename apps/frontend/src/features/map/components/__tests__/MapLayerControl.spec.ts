import { vi, describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => k,
    locale: { value: 'en' },
  }),
}))

import MapLayerControl from '../MapLayerControl.vue'
import { useMapStore } from '../../stores/mapStore'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('MapLayerControl', () => {
  function buttons(wrapper: ReturnType<typeof mount>) {
    const all = wrapper.findAll('button')
    if (all.length !== 2) throw new Error(`expected 2 buttons, got ${all.length}`)
    return { people: all[0]!, posts: all[1]! }
  }

  it('renders both layer toggles with translation keys', () => {
    const wrapper = mount(MapLayerControl)
    const text = wrapper.text()
    expect(text).toContain('map.layer_control.people')
    expect(text).toContain('map.layer_control.posts')
  })

  it('reflects initial store visibility (both pressed)', () => {
    const wrapper = mount(MapLayerControl)
    const { people, posts } = buttons(wrapper)
    expect(people.attributes('aria-pressed')).toBe('true')
    expect(posts.attributes('aria-pressed')).toBe('true')
  })

  it('toggles showPeople off when clicked while showPosts is on', async () => {
    const wrapper = mount(MapLayerControl)
    const store = useMapStore()
    const { people } = buttons(wrapper)
    await people.trigger('click')
    expect(store.showPeople).toBe(false)
    expect(store.showPosts).toBe(true)
  })

  it('toggles showPosts off when clicked while showPeople is on', async () => {
    const wrapper = mount(MapLayerControl)
    const store = useMapStore()
    const { posts } = buttons(wrapper)
    await posts.trigger('click')
    expect(store.showPosts).toBe(false)
    expect(store.showPeople).toBe(true)
  })

  it('clicking the only-pressed button is a no-op (both stay as they were)', async () => {
    const wrapper = mount(MapLayerControl)
    const store = useMapStore()
    store.setShowPosts(false)
    await wrapper.vm.$nextTick()
    const { people } = buttons(wrapper)
    await people.trigger('click')
    expect(store.showPeople).toBe(true)
    expect(store.showPosts).toBe(false)
  })

  it('updates aria-pressed when the store mutates externally', async () => {
    const wrapper = mount(MapLayerControl)
    const store = useMapStore()
    store.setShowPeople(false)
    await wrapper.vm.$nextTick()
    const { people } = buttons(wrapper)
    expect(people.attributes('aria-pressed')).toBe('false')
  })
})
