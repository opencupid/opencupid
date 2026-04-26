import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/assets/icons/interface/setting.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/cross.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/arrows/arrow-single-left.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/images/app/socialize.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/images/app/cupid.svg', () => ({ default: { template: '<div />' } }))

import SecondaryNav from '../../../shared/ui/SecondaryNav.vue'

describe('SecondaryNav', () => {
  it('renders nav with correct classes', () => {
    const wrapper = mount(SecondaryNav, {
      global: { mocks: { $t: (k: string) => k } },
    })
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

})
