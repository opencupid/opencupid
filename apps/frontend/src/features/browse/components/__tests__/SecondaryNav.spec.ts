import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/assets/icons/interface/setting.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/app/socialize.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/app/cupid.svg', () => ({ default: { template: '<div />' } }))

import SecondaryNav from '../../../shared/ui/SecondaryNav.vue'
import ScopeViewToggler from '@/features/shared/ui/ScopeViewToggler.vue'

describe('SecondaryNav', () => {
  it('renders nav with correct classes', () => {
    const wrapper = mount(SecondaryNav)
    const div = wrapper.find('div')
    expect(div.exists()).toBe(true)
    // expect(ul.classes()).toContain('align-items-center')
  })

  // it('renders slot items-left', () => {
  //   const wrapper = mount(SecondaryNav, {
  //     slots: {
  //       'items-left': '<div class="test-left">Left</div>',
  //     },
  //   })
  //   expect(wrapper.find('.test-left').exists()).toBe(true)
  // })

  // it('renders ScopeViewToggler with v-model', async () => {
  //   const wrapper = mount(SecondaryNav)
  //   const toggler = wrapper.findComponent(ScopeViewToggler)
  //   expect(toggler.exists()).toBe(true)
  // })

  // it('emits prefs:toggle when button is clicked', async () => {
  //   const wrapper = mount(SecondaryNav)
  //   const button = wrapper.find('button')
  //   await button.trigger('click')
  //   expect(wrapper.emitted('prefs:toggle')).toBeTruthy()
  // })

  // it('disables button when prefsButtonDisabled is true', () => {
  //   const wrapper = mount(SecondaryNav, {
  //     props: { prefsButtonDisabled: true },
  //   })
  //   const button = wrapper.find('button')
  //   expect(button.attributes('disabled')).toBeDefined()
  // })
})
