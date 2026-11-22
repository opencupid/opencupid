import { vi, describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: { value: 'en' } }),
}))

// vitest doesn't run vite-svg-loader, so stub the icon component.
vi.mock('@/assets/icons/interface/target-2.svg', async () => {
  const { defineComponent, h } = await import('vue')
  return { default: defineComponent({ render: () => h('svg') }) }
})

import MapControls from '../MapControls.vue'

describe('MapControls', () => {
  it.each([
    ['.map-control-locate', 'locate'],
    ['.map-control-zoom-in', 'zoom:in'],
    ['.map-control-zoom-out', 'zoom:out'],
  ])('clicking %s emits %s', async (selector, event) => {
    const wrapper = mount(MapControls)
    await wrapper.find(selector).trigger('click')
    expect(wrapper.emitted(event)).toHaveLength(1)
  })

  it('titles the locate button like the search bar home button', () => {
    const wrapper = mount(MapControls)
    expect(wrapper.find('.map-control-locate').attributes('title')).toBe(
      'profiles.browse.filters.locate_button_title'
    )
  })
})
