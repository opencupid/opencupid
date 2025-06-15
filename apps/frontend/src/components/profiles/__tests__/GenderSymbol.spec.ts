import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../display/genderIcons', () => ({
  genderIcons: { male: { template: '<span class="male" />' } }
}))

import GenderSymbol from '../display/GenderSymbol.vue'

describe('GenderSymbol', () => {
  it('renders icon for gender', () => {
    const wrapper = mount(GenderSymbol, { props: { gender: 'male' } })
    expect(wrapper.find('.male').exists()).toBe(true)
  })
})
