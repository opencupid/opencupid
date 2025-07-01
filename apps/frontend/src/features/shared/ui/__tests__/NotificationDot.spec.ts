import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@fortawesome/vue-fontawesome', () => ({
  FontAwesomeIcon: { template: '<div class="fa" />' }
}))

import NotificationDot from '../NotificationDot.vue'

describe('NotificationDot', () => {
  it('shows dot when show is true', () => {
    const wrapper = mount(NotificationDot, {
      props: { show: true },
      slots: { default: '<span>icon</span>' }
    })
    expect(wrapper.find('.fa').exists()).toBe(true)
  })

  it('hides dot when show is false', () => {
    const wrapper = mount(NotificationDot, {
      props: { show: false },
      slots: { default: '<span>icon</span>' }
    })
    expect(wrapper.find('.fa').exists()).toBe(false)
  })
})
