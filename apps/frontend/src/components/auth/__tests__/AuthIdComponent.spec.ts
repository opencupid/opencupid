import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/components/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/app/logo.svg', () => ({ default: { template: '<div />' } }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
const stubFormKit = { template: '<form><slot :state="{ valid: true }" /></form>' }
const CaptchaWidget = { template: '<div />' }

import AuthIdComponent from '../AuthIdComponent.vue'

describe('AuthIdComponent', () => {
  it('validates identifier input', () => {
    const wrapper = mount(AuthIdComponent, {
      props: { isLoading: false },
      global: { stubs: { FormKit: stubFormKit, CaptchaWidget } }
    })
    expect((wrapper.vm as any).validateAuthIdInput({ value: 'bad' })).toBe(false)
    expect((wrapper.vm as any).validateAuthIdInput({ value: 'test@example.com' })).toBe(true)
    expect((wrapper.vm as any).validateAuthIdInput({ value: '+12345678901' })).toBe(true)
  })

  it('emits otp:send with computed identifier', async () => {
    const wrapper = mount(AuthIdComponent, {
      props: { isLoading: false },
      global: { stubs: { FormKit: stubFormKit, CaptchaWidget } }
    })
    ;(wrapper.vm as any).authIdInput = 'test@example.com'
    await (wrapper.vm as any).handleSendLoginLink()
    expect(wrapper.emitted('otp:send')![0][0]).toEqual({
      email: 'test@example.com',
      phonenumber: '',
      captchaSolution: ''
    })
  })

  it('sets error when identifier empty', async () => {
    const wrapper = mount(AuthIdComponent, {
      props: { isLoading: false },
      global: { stubs: { FormKit: stubFormKit, CaptchaWidget } }
    })
    await (wrapper.vm as any).handleSendLoginLink()
    expect((wrapper.vm as any).error).toBe('auth.auth_id_input_empty')
  })
})
