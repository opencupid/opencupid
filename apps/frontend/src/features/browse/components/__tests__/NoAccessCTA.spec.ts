import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

const BButton = { template: '<button @click="$emit(\'click\')"><slot /></button>' }

import NoAccessCTA from '../NoAccessCTA.vue'

describe('NoAccessCTA', () => {
  it('emits edit event when button clicked', async () => {
    const wrapper = mount(NoAccessCTA, {
      props: { modelValue: 'dating' },
      global: { stubs: { BButton }, config: {} },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('edit:profile')).toBeTruthy()
  })

  it('shows dating scope message', () => {
    const wrapper = mount(NoAccessCTA, {
      props: { modelValue: 'dating' },
      global: { stubs: { BButton }, config: {} },
    })
    expect(wrapper.text()).toContain('profiles.browse.no_access_dating_title')
  })
})
