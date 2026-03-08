import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))

const stubFormKit = { template: '<form><slot :state="{ valid: true }" /></form>' }

import TokenInput from '../components/TokenInput.vue'

describe('TokenInput', () => {
  it('validates token correctly', () => {
    const wrapper = mount(TokenInput, {
      props: {
        isLoading: false,
        validationError: null,
        validationResult: null,
      },
      global: { stubs: { FormKit: stubFormKit } },
    })
    ;(wrapper.vm as any).tokenInput = '123456'
    expect((wrapper.vm as any).inputState).toBe(true)
    ;(wrapper.vm as any).tokenInput = '12345'
    expect((wrapper.vm as any).inputState).toBe(false)
  })

  it('emits token:submit with entered value', async () => {
    const wrapper = mount(TokenInput, {
      props: {
        isLoading: false,
        validationError: null,
        validationResult: null,
      },
      global: { stubs: { FormKit: stubFormKit } },
    })
    ;(wrapper.vm as any).tokenInput = '654321'
    await (wrapper.vm as any).handleTokenEntered()
    expect(wrapper.emitted('token:submit')![0]).toEqual(['654321'])
  })
})
