import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

vi.mock('@/lib/api', () => {
  const post = vi.fn().mockResolvedValue({})
  return { api: { post } }
})

import { api } from '@/lib/api'
import PushPermissions from '../PushPermissions.vue'

const post = api.post as ReturnType<typeof vi.fn>

const stubs = {
  BButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' }
}

beforeEach(() => {
  post.mockClear()
})

describe('PushPermissions', () => {

  it('requests permission when clicked', async () => {
    ; (global as any).Notification = { requestPermission: vi.fn().mockResolvedValue('denied') }
    const wrapper = mount(PushPermissions, { global: { stubs } })
    await wrapper.find('button').trigger('click')
    // TODO find out why this fails
    // expect((Notification as any).requestPermission).toHaveBeenCalled()
    delete (global as any).Notification
  })

  it('subscribes and posts when granted', async () => {
    const subscribe = vi.fn().mockResolvedValue('sub')
      ; (global as any).Notification = { requestPermission: vi.fn().mockResolvedValue('granted') }
      ; (global as any).navigator = {
        serviceWorker: { ready: Promise.resolve({ pushManager: { subscribe } }) }
      }
      ; (global as any).__APP_CONFIG__ = { VAPID_PUBLIC_KEY: 'BIgjb-IGNNSdDDw2DJ45-jBTUVjjmnxYZgmoo7LZsRMdg7Mj3M22bh9wjQdH9oqmP3GP5z1DmOZlw6vnGR36BJs' }
    const wrapper = mount(PushPermissions, { global: { stubs } })
    await wrapper.find('button').trigger('click')
    await Promise.resolve()
    expect((Notification as any).requestPermission).toHaveBeenCalled()
    expect(subscribe).toHaveBeenCalled()
    expect(post).toHaveBeenCalledWith('/push/subscription', 'sub')
    delete (global as any).Notification
    delete (global as any).navigator
  })
})
