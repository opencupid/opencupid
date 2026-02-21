import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/lib/api', () => ({
  api: { post: vi.fn(), patch: vi.fn() },
  safeApiCall: async <T>(fn: () => Promise<T>) => fn(),
}))

vi.mock('@/lib/bus', () => ({
  bus: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}))

vi.mock('../api/calls.api', () => ({
  initiateCall: vi.fn(),
  acceptCall: vi.fn().mockResolvedValue({}),
  declineCall: vi.fn().mockResolvedValue({}),
  cancelCall: vi.fn(),
  updateCallable: vi.fn(),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      if (key === 'calls.incoming_call_from' && params?.name)
        return `Incoming call from ${params.name}`
      return key
    },
  }),
}))

import IncomingCallToast from '../components/IncomingCallToast.vue'

describe('IncomingCallToast', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders caller name', () => {
    const wrapper = mount(IncomingCallToast, {
      props: { callerName: 'Alice', toastId: 1 },
    })
    expect(wrapper.text()).toContain('Incoming call from Alice')
  })

  it('renders accept and decline buttons', () => {
    const wrapper = mount(IncomingCallToast, {
      props: { callerName: 'Alice', toastId: 1 },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBe(2)
    expect(buttons[0]!.text()).toBe('calls.accept')
    expect(buttons[1]!.text()).toBe('calls.decline')
  })
})
