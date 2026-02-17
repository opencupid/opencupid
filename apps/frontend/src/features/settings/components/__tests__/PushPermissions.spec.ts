import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

vi.mock('@/lib/api', () => {
  const post = vi.fn().mockResolvedValue({})
  const patch = vi.fn().mockResolvedValue({})
  return { api: { post, patch } }
})

import { api } from '@/lib/api'
import PushPermissions from '../PushPermissions.vue'

const post = api.post as ReturnType<typeof vi.fn>
const patch = api.patch as ReturnType<typeof vi.fn>

beforeEach(() => {
  post.mockClear()
  patch.mockClear()
  ;(global as any).PushManager = {}
  ;(global as any).__APP_CONFIG__ = {
    VAPID_PUBLIC_KEY:
      'BIgjb-IGNNSdDDw2DJ45-jBTUVjjmnxYZgmoo7LZsRMdg7Mj3M22bh9wjQdH9oqmP3GP5z1DmOZlw6vnGR36BJs',
  }
})

describe('PushPermissions', () => {
  it('requests permission when checkbox is checked', async () => {
    ;(global as any).Notification = { requestPermission: vi.fn().mockResolvedValue('denied') }
    ;(global as any).navigator = {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: { subscribe: vi.fn(), getSubscription: vi.fn().mockResolvedValue(null) },
        }),
      },
    }
    const wrapper = mount(PushPermissions, { props: { modelValue: false } })
    const checkbox = wrapper.find('input[type="checkbox"]')
    ;(checkbox.element as HTMLInputElement).checked = true
    await checkbox.trigger('change')
    expect((Notification as any).requestPermission).toHaveBeenCalled()
    delete (global as any).Notification
  })

  it('subscribes and posts when permission granted', async () => {
    const subscribe = vi.fn().mockResolvedValue('sub')
    ;(global as any).Notification = { requestPermission: vi.fn().mockResolvedValue('granted') }
    ;(global as any).navigator = {
      serviceWorker: {
        ready: Promise.resolve({
          pushManager: { subscribe, getSubscription: vi.fn().mockResolvedValue(null) },
        }),
      },
    }
    const wrapper = mount(PushPermissions, { props: { modelValue: false } })
    const checkbox = wrapper.find('input[type="checkbox"]')
    ;(checkbox.element as HTMLInputElement).checked = true
    await checkbox.trigger('change')
    // flush async chain
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
    expect((Notification as any).requestPermission).toHaveBeenCalled()
    expect(subscribe).toHaveBeenCalled()
    expect(post).toHaveBeenCalledWith('/push/subscription', 'sub')
    expect(patch).toHaveBeenCalledWith('/users/me', { isPushNotificationEnabled: true })
    delete (global as any).Notification
  })
})
