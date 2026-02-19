import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { defineComponent } from 'vue'

// mocks must come before the component import
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, string>) => {
      if (p) return Object.entries(p).reduce((s, [k, v]) => s.replace(`{${k}}`, v), k)
      return k
    },
  }),
}))

vi.mock('@/store/i18nStore', () => ({
  useI18nStore: () => ({ setLanguage: vi.fn() }),
}))

vi.mock('@/assets/icons/app/cupid.svg', () => ({
  default: defineComponent({ template: '<svg />' }),
}))
vi.mock('@/assets/icons/app/socialize.svg', () => ({
  default: defineComponent({ template: '<svg />' }),
}))
vi.mock('@/assets/icons/interface/globe.svg', () => ({
  default: defineComponent({ template: '<svg />' }),
}))
vi.mock('@/assets/icons/app/logo.svg', () => ({
  default: defineComponent({ template: '<svg />' }),
}))

const bStubs = {
  BContainer: defineComponent({ template: '<div><slot /></div>' }),
  BRow: defineComponent({ template: '<div><slot /></div>' }),
  BCol: defineComponent({ template: '<div><slot /></div>' }),
  BButton: defineComponent({
    props: ['disabled'],
    emits: ['click'],
    template: "<button :disabled='disabled' @click=\"$emit('click')\"><slot /></button>",
  }),
  FontAwesomeIcon: defineComponent({ template: '<span />' }),
  LanguageSelectorDropdown: defineComponent({ template: '<div />' }),
}

vi.stubGlobal('__APP_CONFIG__', {
  SITE_NAME: 'TestSite',
})

import LandingPage from '../views/LandingPage.vue'

describe('LandingPage', () => {
  it('mounts without errors', () => {
    const wrapper = mount(LandingPage, { global: { stubs: bStubs } })
    expect(wrapper.html()).not.toBe('')
  })

  it('renders the Enter button', () => {
    const wrapper = mount(LandingPage, { global: { stubs: bStubs } })
    const btn = wrapper.find('footer button')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('renders the socialize feature text', () => {
    const wrapper = mount(LandingPage, { global: { stubs: bStubs } })
    expect(wrapper.text()).toContain('landingpage.socialize_1')
  })

  it('renders the date feature text', () => {
    const wrapper = mount(LandingPage, { global: { stubs: bStubs } })
    expect(wrapper.text()).toContain('landingpage.date_1')
  })

})
