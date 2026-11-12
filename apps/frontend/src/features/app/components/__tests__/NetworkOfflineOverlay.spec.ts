import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/interface/signal.svg', () => ({ default: { template: '<svg />' } }))

import NetworkOfflineOverlay from '../NetworkOfflineOverlay.vue'

const stubs = {
  BOverlay: {
    props: ['show'],
    template: '<div v-if="show" class="overlay"><slot name="overlay" /></div>',
  },
  BSpinner: true,
}

describe('NetworkOfflineOverlay', () => {
  it('tells the user their connection is down when shown', () => {
    const wrapper = mount(NetworkOfflineOverlay, { props: { show: true }, global: { stubs } })

    expect(wrapper.text()).toContain('uicomponents.network_offline.title')
    expect(wrapper.text()).toContain('uicomponents.network_offline.description')
  })

  it('renders nothing when hidden', () => {
    const wrapper = mount(NetworkOfflineOverlay, { props: { show: false }, global: { stubs } })

    expect(wrapper.find('.overlay').exists()).toBe(false)
  })
})
