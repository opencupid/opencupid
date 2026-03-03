import { mount } from '@vue/test-utils'
import { createPinia, getActivePinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

vi.mock('../PushPermissions.vue', () => ({
  default: {
    props: ['modelValue', 'disabled'],
    emits: ['update:modelValue'],
    template:
      '<button data-testid="push-permissions" @click="$emit(\'update:modelValue\', true)">Push</button>',
  },
}))

import OptInCheckboxes from '../OptInCheckboxes.vue'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

function mountComponent(overrides: Record<string, unknown> = {}) {
  const ownerProfileStore = useOwnerProfileStore()
  if (ownerProfileStore.profile && overrides.profile) {
    Object.assign(ownerProfileStore.profile, overrides.profile as Record<string, unknown>)
  }

  return mount(OptInCheckboxes, {
    global: {
      plugins: [getActivePinia()!],
    },
    props: (overrides.props as Record<string, unknown>) ?? {},
  })
}

beforeEach(() => {
  setActivePinia(createPinia())

  const ownerProfileStore = useOwnerProfileStore()
  ownerProfileStore.profile = {
    isCallable: true,
  } as any
  ownerProfileStore.fetchOptInSettings = vi.fn().mockResolvedValue({
    success: true,
    data: {
      isCallable: true,
      newsletterOptIn: false,
      isPushNotificationEnabled: false,
    },
  }) as any
  ownerProfileStore.updateOptInSettings = vi.fn().mockResolvedValue({
    success: true,
    data: {
      isCallable: true,
      newsletterOptIn: true,
      isPushNotificationEnabled: false,
    },
  }) as any
})

describe('OptInCheckboxes', () => {
  describe('push checkbox', () => {
    it('does not call ownerProfileStore.updateOptInSettings when push emits update', async () => {
      const wrapper = mountComponent()
      const store = useOwnerProfileStore()
      store.updateOptInSettings = vi.fn().mockResolvedValue({ success: true })

      await wrapper.get('[data-testid="push-permissions"]').trigger('click')

      expect(store.updateOptInSettings).not.toHaveBeenCalled()
    })
  })

  describe('callable checkbox', () => {
    it('calls persistOwnerProfile when toggled', async () => {
      const wrapper = mountComponent()
      const store = useOwnerProfileStore()
      store.updateOptInSettings = vi.fn().mockResolvedValue({ success: true })

      const checkbox = wrapper.find('#callable-opt-in')
      ;(checkbox.element as HTMLInputElement).checked = false
      await checkbox.trigger('change')

      expect(store.updateOptInSettings).toHaveBeenCalledWith({ isCallable: false })
    })

    it('reverts checkbox on failure', async () => {
      const wrapper = mountComponent()
      const store = useOwnerProfileStore()
      store.updateOptInSettings = vi.fn().mockResolvedValue({ success: false, message: 'err' })

      const checkbox = wrapper.find('#callable-opt-in')
      const input = checkbox.element as HTMLInputElement
      input.checked = false
      await checkbox.trigger('change')
      await Promise.resolve()

      expect(input.checked).toBe(true)
    })
  })

  describe('newsletter checkbox', () => {
    it('calls ownerProfileStore.updateOptInSettings when toggled', async () => {
      const wrapper = mountComponent()
      const store = useOwnerProfileStore()
      store.updateOptInSettings = vi.fn().mockResolvedValue({
        success: true,
        data: {
          isCallable: true,
          newsletterOptIn: true,
          isPushNotificationEnabled: false,
        },
      })

      const checkbox = wrapper.find('#newsletter-opt-in')
      ;(checkbox.element as HTMLInputElement).checked = true
      await checkbox.trigger('change')

      expect(store.updateOptInSettings).toHaveBeenCalledWith({ newsletterOptIn: true })
    })

    it('reverts checkbox on failure', async () => {
      const wrapper = mountComponent()
      const store = useOwnerProfileStore()
      store.updateOptInSettings = vi.fn().mockResolvedValue({ success: false, message: 'err' })

      const checkbox = wrapper.find('#newsletter-opt-in')
      const input = checkbox.element as HTMLInputElement
      input.checked = true
      await checkbox.trigger('change')
      await Promise.resolve()

      expect(input.checked).toBe(false)
    })
  })

  describe('disabled prop', () => {
    it('forwards disabled prop to checkboxes', () => {
      const wrapper = mountComponent({ props: { disabled: true } })
      const callable = wrapper.find('#callable-opt-in').element as HTMLInputElement
      const newsletter = wrapper.find('#newsletter-opt-in').element as HTMLInputElement
      expect(callable.disabled).toBe(true)
      expect(newsletter.disabled).toBe(true)
    })
  })
})
