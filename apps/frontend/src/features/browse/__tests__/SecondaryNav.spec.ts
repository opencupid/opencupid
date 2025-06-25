import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/assets/icons/interface/setting.svg', () => ({ default: { template: '<div />' } }))

const ScopeViewToggler = {
  props: ['modelValue'],
  emits: ['update:modelValue', 'change'],
  template: `<div data-testid="toggler" @click="$emit('change', 'social')"></div>`
}

const BButton = { template: '<button @click="$emit(\'click\')"><slot /></button>' }

import SecondaryNav from '../components/SecondaryNav.vue'

describe('SecondaryNav', () => {
  it('emits scope change via toggler', async () => {
    const wrapper = mount(SecondaryNav, {
      props: { modelValue: 'dating' },
      global: { stubs: { BButton, ScopeViewToggler } }
    })
    await wrapper.find('[data-testid="toggler"]').trigger('click')
    expect(wrapper.emitted('scope:change')).toEqual([[ 'social' ]])
  })

  it('emits edit event on prefs button', async () => {
    const wrapper = mount(SecondaryNav, {
      props: { modelValue: 'dating' },
      global: { stubs: { BButton, ScopeViewToggler } }
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('edit:datingPrefs')).toBeTruthy()
  })
})
