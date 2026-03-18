import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

const mockSubscribe = vi.fn().mockResolvedValue({ success: true })
const mockUnsubscribe = vi.fn().mockResolvedValue({ success: true })
const mockCheckSubscription = vi.fn()

vi.mock('../../stores/pushNotificationStore', () => ({
  usePushNotificationStore: () => ({
    isSupported: true,
    isSubscribed: false,
    isLoading: false,
    subscribe: mockSubscribe,
    unsubscribe: mockUnsubscribe,
    checkSubscription: mockCheckSubscription,
  }),
}))

import PushPermissions from '../PushPermissions.vue'

beforeEach(() => {
  setActivePinia(createPinia())
  mockSubscribe.mockClear()
  mockUnsubscribe.mockClear()
  mockCheckSubscription.mockClear()
})

describe('PushPermissions', () => {
  it('calls checkSubscription on mount', () => {
    mount(PushPermissions)
    expect(mockCheckSubscription).toHaveBeenCalled()
  })

  it('calls subscribe when checkbox is checked', async () => {
    const wrapper = mount(PushPermissions)
    const checkbox = wrapper.find('input[type="checkbox"]')
    ;(checkbox.element as HTMLInputElement).checked = true
    await checkbox.trigger('change')
    await Promise.resolve()
    expect(mockSubscribe).toHaveBeenCalled()
  })

  it('calls unsubscribe when checkbox is unchecked', async () => {
    const wrapper = mount(PushPermissions)
    const checkbox = wrapper.find('input[type="checkbox"]')
    ;(checkbox.element as HTMLInputElement).checked = false
    await checkbox.trigger('change')
    await Promise.resolve()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('reverts checkbox on subscribe failure', async () => {
    mockSubscribe.mockResolvedValue({ success: false, message: 'denied' })
    const wrapper = mount(PushPermissions)
    const checkbox = wrapper.find('input[type="checkbox"]')
    const input = checkbox.element as HTMLInputElement
    input.checked = true
    await checkbox.trigger('change')
    await Promise.resolve()
    expect(input.checked).toBe(false)
  })
})
