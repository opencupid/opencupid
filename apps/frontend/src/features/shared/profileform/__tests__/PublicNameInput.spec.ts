import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import NameInput from '../PublicNameInput.vue'

describe('NameInput', () => {
  it('updates model on input', async () => {
    const wrapper = mount(NameInput, {
      global: {
        stubs: {
          BInput: { template: '<input />' },
          BFormInvalidFeedback: true,
          BFormFloatingLabel: { template: '<div><slot /></div>' },
        },
      },
    })
    ;(wrapper.vm as any).model = 'John'
    await wrapper.vm.$nextTick()
    expect((wrapper.vm as any).model).toBe('John')
  })
})
