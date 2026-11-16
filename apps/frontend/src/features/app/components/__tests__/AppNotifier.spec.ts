import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/lib/api', () => ({
  api: { post: vi.fn(), patch: vi.fn() },
  safeApiCall: async <T>(fn: () => Promise<T>) => fn(),
}))

vi.mock('@/features/videocall/api/calls.api', () => ({
  initiateCall: vi.fn(),
  acceptCall: vi.fn(),
  declineCall: vi.fn(),
  cancelCall: vi.fn(),
  updateCallable: vi.fn(),
}))

vi.mock('@/lib/bus', () => {
  const listeners: Record<string, any> = {}
  const bus = {
    on: vi.fn((event: string, cb: any) => {
      listeners[event] = cb
    }),
    off: vi.fn(),
    emit(event: string, payload: any) {
      listeners[event]?.(payload)
    },
  }
  return { bus } // ✅ named export, like the real module
})

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('../ApiErrorOverlay.vue', () => ({
  default: {
    props: ['show'],
    template: '<div v-if="show" class="api-offline-overlay">overlay</div>',
  },
}))
vi.mock('../NetworkOfflineOverlay.vue', () => ({
  default: {
    props: ['show'],
    template: '<div v-if="show" class="network-offline-overlay">overlay</div>',
  },
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
vi.mock('@/assets/audio/message-received.mp3', () => ({ default: 'message-received.mp3' }))

const playMock = vi.fn().mockResolvedValue(undefined)
vi.stubGlobal(
  'Audio',
  vi.fn(function () {
    return { play: playMock, currentTime: 0 }
  })
)
afterAll(() => vi.unstubAllGlobals())

import AppNotifier from '../AppNotifier.vue'
import { bus } from '@/lib/bus'

describe('AppNotifier', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    playMock.mockResolvedValue(undefined)
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
    expect(push).toHaveBeenCalledWith({
      name: 'Conversation',
      params: { conversationId: '42' },
    })
    expect(close).toHaveBeenCalled()
  })

  it('shows the API error overlay when the API is down but the user is connected', async () => {
    const wrapper = mount(AppNotifier)
    bus.emit('api:offline', { cause: 'api' })

    await nextTick()

    expect(wrapper.find('.api-offline-overlay').exists()).toBe(true)
    expect(wrapper.find('.network-offline-overlay').exists()).toBe(false)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("shows the network overlay when the user's connection is down", async () => {
    const wrapper = mount(AppNotifier)
    bus.emit('api:offline', { cause: 'network' })

    await nextTick()

    expect(wrapper.find('.network-offline-overlay').exists()).toBe(true)
    expect(wrapper.find('.api-offline-overlay').exists()).toBe(false)
  })

  it('swaps overlays when the diagnosed cause changes', async () => {
    const wrapper = mount(AppNotifier)

    bus.emit('api:offline', { cause: 'network' })
    await nextTick()
    bus.emit('api:offline', { cause: 'api' })
    await nextTick()

    expect(wrapper.find('.api-offline-overlay').exists()).toBe(true)
    expect(wrapper.find('.network-offline-overlay').exists()).toBe(false)
  })

  it.each(['api', 'network'] as const)(
    'hides the %s overlay when the API comes back online',
    async (cause) => {
      const wrapper = mount(AppNotifier)

      bus.emit('api:offline', { cause })
      await nextTick()
      expect(wrapper.find(`.${cause}-offline-overlay`).exists()).toBe(true)

      bus.emit('api:online', undefined)
      await nextTick()

      expect(wrapper.find('.api-offline-overlay').exists()).toBe(false)
      expect(wrapper.find('.network-offline-overlay').exists()).toBe(false)
    }
  )

  it('plays notification sound when message received', () => {
    mount(AppNotifier)
    const message = { id: '1', conversationId: '42' } as any
    bus.emit('notification:new_message', message)

    expect(playMock).toHaveBeenCalledOnce()
  })

  it('silently ignores autoplay restrictions', () => {
    playMock.mockRejectedValue(new DOMException('NotAllowedError'))
    mount(AppNotifier)
    const message = { id: '1', conversationId: '42' } as any

    expect(() => bus.emit('notification:new_message', message)).not.toThrow()
  })

  it('cleans up listener on unmount', () => {
    const wrapper = mount(AppNotifier)
    wrapper.unmount()
    expect(bus.off).toHaveBeenCalled()
  })
})
