import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/app/logo.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/login.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/tick.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/mail.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/phone.svg', () => ({ default: { template: '<div />' } }))
vi.mock('../components/LocaleSelector.vue', () => ({ default: { template: '<div />' } }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
const stubFormKit = { template: '<form><slot :state="{ valid: true }" /></form>' }
const CaptchaWidget = { template: '<div />' }

import AuthIdComponent from '../components/AuthIdComponent.vue'

describe('AuthIdComponent', () => {
  it('validates identifier input', () => {
    const wrapper = mount(AuthIdComponent, {
      props: { isLoading: false },
      global: { stubs: {  CaptchaWidget } }
    })
    ;(wrapper.vm as any).authIdInput = 'bad'
    expect((wrapper.vm as any).inputState).toBe(false)
    ;(wrapper.vm as any).authIdInput = 'test@example.com'
    expect((wrapper.vm as any).inputState).toBe(true)
    ;(wrapper.vm as any).authIdInput = '+12345678901'
    expect((wrapper.vm as any).inputState).toBe(true)
  })

  it('emits updated with computed identifier', async () => {
    const wrapper = mount(AuthIdComponent, {
      props: { isLoading: false },
      global: { stubs: {  CaptchaWidget } }
    })
    ;(wrapper.vm as any).authIdInput = 'test@example.com'
    await (wrapper.vm as any).handleSendLoginLink()
    expect(wrapper.emitted('updated')![0][0]).toEqual({
      email: 'test@example.com',
      phonenumber: '',
      captchaSolution: '',
      language: ''
    })
  })

  it('sets error when identifier empty', async () => {
    const wrapper = mount(AuthIdComponent, {
      props: { isLoading: false },
      global: { stubs: {  CaptchaWidget } }
    })
    await (wrapper.vm as any).handleSendLoginLink()
    expect((wrapper.vm as any).error).toBe('auth.auth_id_input_empty')
  })
})
