import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MapPlaceholder from '../MapPlaceholder.vue'

describe('MapPlaceholder', () => {
  it('renders with placeholder-svg element', () => {
    const wrapper = mount(MapPlaceholder)
    expect(wrapper.find('.placeholder-svg').exists()).toBe(true)
  })

  it('applies animated class by default', () => {
    const wrapper = mount(MapPlaceholder)
    expect(wrapper.find('.placeholder-svg').classes()).toContain('animated')
  })

  it('does not apply animated class when isAnimated is false', () => {
    const wrapper = mount(MapPlaceholder, { props: { isAnimated: false } })
    expect(wrapper.find('.placeholder-svg').classes()).not.toContain('animated')
  })
})
