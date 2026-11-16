import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/images/app/api-error.png?inline', () => ({ default: 'api-error.png' }))

import ApiErrorOverlay from '../ApiErrorOverlay.vue'

const stubs = {
  BOverlay: {
    props: ['show', 'variant'],
    template:
      '<div v-if="show" class="overlay" :data-variant="variant"><slot name="overlay" /></div>',
  },
  BSpinner: true,
}

describe('ApiErrorOverlay', () => {
  it('tells the user the problem is at our end when shown', () => {
    const wrapper = mount(ApiErrorOverlay, { props: { show: true }, global: { stubs } })

    expect(wrapper.text()).toContain('uicomponents.connection_error.title')
    expect(wrapper.text()).toContain('uicomponents.connection_error.description')
  })

  it('uses the same light backdrop as the network offline overlay', () => {
    const wrapper = mount(ApiErrorOverlay, { props: { show: true }, global: { stubs } })

    expect(wrapper.find('.overlay').attributes('data-variant')).toBe('light')
  })

  it('renders nothing when hidden', () => {
    const wrapper = mount(ApiErrorOverlay, { props: { show: false }, global: { stubs } })

    expect(wrapper.find('.overlay').exists()).toBe(false)
  })
})
