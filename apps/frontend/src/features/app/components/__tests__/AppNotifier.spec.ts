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

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('../ApiErrorOverlay.vue', () => ({
  default: {
    props: ['show'],
    template: '<div v-if="show" class="api-offline-overlay">overlay</div>'
  }
}))
vi.mock('../LikeReceivedToast.vue', () => ({ default: 'LikeToast' }))
vi.mock('../MatchReceivedToast.vue', () => ({ default: 'MatchToast' }))

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

const toast = vi.fn() as any
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

  it('shows overlay when API goes offline', async () => {
    const wrapper = mount(AppNotifier)
    bus.emit('api:offline')

    await nextTick()

    const overlay = wrapper.find('.api-offline-overlay')
    expect(overlay.exists()).toBe(true)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('hides overlay when API comes back online', async () => {
    const wrapper = mount(AppNotifier)

    bus.emit('api:offline')
    await nextTick()
    expect(wrapper.find('.api-offline-overlay').exists()).toBe(true)

    bus.emit('api:online')
    await nextTick()

    expect(wrapper.find('.api-offline-overlay').exists()).toBe(false)
    expect(toast.dismiss).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('cleans up listener on unmount', () => {
    const wrapper = mount(AppNotifier)
    wrapper.unmount()
    expect(bus.off).toHaveBeenCalled()
  })
})
