import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/interface/message.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/mail.svg', () => ({ default: { template: '<div />' } }))

vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))

const stubFormKit = { template: '<form><slot :state="{ valid: true }" /></form>' }

import OtpLoginComponent from '../components/OtpLoginComponent.vue'

describe('OtpLoginComponent', () => {
  it('validates otp correctly', () => {
    const wrapper = mount(OtpLoginComponent, {
      props: {
        user: {} as any,
        isLoading: false,
        validationError: null,
        validationResult: null

      },
      global: { stubs: { FormKit: stubFormKit } }
    })
      ; (wrapper.vm as any).otpInput = '123456'
    expect((wrapper.vm as any).inputState).toBe(true)
      ; (wrapper.vm as any).otpInput = '12345'
    expect((wrapper.vm as any).inputState).toBe(false)
  })

  it('emits otp:submit with entered value', async () => {
    const wrapper = mount(OtpLoginComponent, {
      props: {
        user: {} as any,
        isLoading: false,
        validationError: null,
        validationResult: null,
      },
      global: { stubs: { FormKit: stubFormKit } }
    })
      ; (wrapper.vm as any).otpInput = '654321'
    await (wrapper.vm as any).handleOTPEntered()
    expect(wrapper.emitted('otp:submit')![0]).toEqual(['654321'])
  })
})
