import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'


vi.mock('@/lib/bus', () => {
  const listeners: Record<string, any> = {}
  const bus = {
    on: vi.fn((event: string, cb: any) => { listeners[event] = cb }),
    off: vi.fn(),
    emit(event: string, payload: any) { listeners[event]?.(payload) },
  }
  return { bus } // ✅ named export, like the real module
})

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const toast = vi.fn()
vi.mock('vue-toastification', () => ({ useToast: () => toast }))
vi.mock('../MessageReceivedToast.vue', () => ({ default: 'MsgToast' }))

import AppNotifier from '../AppNotifier.vue'
import { bus } from '@/lib/bus'

describe('AppNotifier', () => {
  it('shows toast when message received and handles click', () => {
    mount(AppNotifier)
    const message = { id: '1', conversationId: '42' } as any
    bus.emit('notification:new_message', message)

    expect(toast).toHaveBeenCalled()
    const [opts, cfg] = toast.mock.calls[0]
    expect(opts.component).toBe('MsgToast')
    const close = vi.fn()
    cfg.onClick(close)
    expect(push).toHaveBeenCalledWith({ name: 'Messaging', params: { conversationId: '42' }, force: true })
    expect(close).toHaveBeenCalled()
  })

  it('cleans up listener on unmount', () => {
    const wrapper = mount(AppNotifier)
    wrapper.unmount()
    expect(bus.off).toHaveBeenCalled()
  })
})
