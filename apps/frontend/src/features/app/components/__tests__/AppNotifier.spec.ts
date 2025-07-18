import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'


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
toast.error = vi.fn()
toast.success = vi.fn()
toast.dismiss = vi.fn()
vi.mock('vue-toastification', () => ({ useToast: () => toast }))
vi.mock('../MessageReceivedToast.vue', () => ({ default: 'MsgToast' }))

import AppNotifier from '../AppNotifier.vue'
import { bus } from '@/lib/bus'

describe('AppNotifier', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('shows overlay and error toast when API goes offline', async () => {
    const wrapper = mount(AppNotifier)
    bus.emit('api:offline')

    // Wait for Vue reactivity
    await nextTick()

    // Check that overlay is shown
    const overlay = wrapper.find('.api-offline-overlay')
    expect(overlay.exists()).toBe(true)
    expect(overlay.text()).toContain('Connection lost')

    // Check that error toast is called
    expect(toast.error).toHaveBeenCalledWith('Connection lost. Trying to reconnect...', {
      timeout: false,
      id: 'api-offline'
    })
  })

  it('hides overlay and shows success toast when API comes back online', async () => {
    const wrapper = mount(AppNotifier)
    
    // First go offline
    bus.emit('api:offline')
    await nextTick()
    expect(wrapper.find('.api-offline-overlay').exists()).toBe(true)
    
    // Then come back online
    bus.emit('api:online')
    await nextTick()
    
    // Check that overlay is hidden
    expect(wrapper.find('.api-offline-overlay').exists()).toBe(false)
    
    // Check that toasts are called correctly
    expect(toast.dismiss).toHaveBeenCalledWith('api-offline')
    expect(toast.success).toHaveBeenCalledWith('Connection restored!', {
      timeout: 3000
    })
  })

  it('cleans up listener on unmount', () => {
    const wrapper = mount(AppNotifier)
    wrapper.unmount()
    expect(bus.off).toHaveBeenCalled()
  })
})
