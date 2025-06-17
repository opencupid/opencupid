import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/components/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))

const stubFormKit = { template: '<form><slot :state="{ valid: true }" /></form>' }

import OtpLoginComponent from '../OtpLoginComponent.vue'

describe('OtpLoginComponent', () => {
  it('validates otp correctly', () => {
    const wrapper = mount(OtpLoginComponent, {
      props: { user: {} as any, isLoading: false },
      global: { stubs: { FormKit: stubFormKit } }
    })
    expect((wrapper.vm as any).validateOtp({ value: '123456' })).toBe(true)
    expect((wrapper.vm as any).validateOtp({ value: '12345' })).toBe(false)
  })

  it('emits otp:submit with entered value', async () => {
    const wrapper = mount(OtpLoginComponent, {
      props: { user: {} as any, isLoading: false },
      global: { stubs: { FormKit: stubFormKit } }
    })
    ;(wrapper.vm as any).otpInput = '654321'
    await (wrapper.vm as any).handleOTPEntered()
    expect(wrapper.emitted('otp:submit')![0]).toEqual(['654321'])
  })
})
