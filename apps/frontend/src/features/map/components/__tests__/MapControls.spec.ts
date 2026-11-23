import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

import MapControls from '../MapControls.vue'

describe('MapControls', () => {
  it.each([
    ['.map-control-zoom-in', 'zoom:in'],
    ['.map-control-zoom-out', 'zoom:out'],
  ])('clicking %s emits %s', async (selector, event) => {
    const wrapper = mount(MapControls)
    await wrapper.find(selector).trigger('click')
    expect(wrapper.emitted(event)).toHaveLength(1)
  })

  it('has no locate button', () => {
    expect(mount(MapControls).find('.map-control-locate').exists()).toBe(false)
  })
})
