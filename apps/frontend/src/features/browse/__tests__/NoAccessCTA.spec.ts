import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

const BButton = { template: '<button @click="$emit(\'click\')"><slot /></button>' }

import NoAccessCTA from '../components/NoAccessCTA.vue'

describe('NoAccessCTA', () => {
  it('emits edit event when button clicked', async () => {
    const wrapper = mount(NoAccessCTA, {
      props: { modelValue: 'dating' },
      global: { stubs: { BButton } }
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('edit:profile')).toBeTruthy()
  })

  it('shows dating scope message', () => {
    const wrapper = mount(NoAccessCTA, {
      props: { modelValue: 'dating' },
      global: { stubs: { BButton } }
    })
    expect(wrapper.text()).toContain('dating profile is currently private')
  })
})
