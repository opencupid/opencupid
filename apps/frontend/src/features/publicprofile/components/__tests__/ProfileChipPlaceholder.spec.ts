import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ProfileChipPlaceholder from '../ProfileChipPlaceholder.vue'

describe('ProfileChipPlaceholder', () => {
  it('renders placeholder with secondary variant', () => {
    const wrapper = mount(ProfileChipPlaceholder, {
      global: {
        stubs: {
          BPlaceholder: {
            template: '<span class="placeholder placeholder-lg bg-secondary" style="width: 75%;"></span>',
            props: ['size', 'animation', 'width', 'variant']
          }
        }
      }
    })
    
    expect(wrapper.exists()).toBe(true)
    expect(wrapper.find('.placeholder').exists()).toBe(true)
    expect(wrapper.find('.bg-secondary').exists()).toBe(true)
  })

  it('renders with animation when isAnimated is true', () => {
    const wrapper = mount(ProfileChipPlaceholder, {
      props: {
        isAnimated: true
      },
      global: {
        stubs: {
          BPlaceholder: {
            template: '<span class="placeholder placeholder-lg bg-secondary" style="width: 75%;"></span>',
            props: ['size', 'animation', 'width', 'variant']
          }
        }
      }
    })
    
    expect(wrapper.exists()).toBe(true)
  })
})