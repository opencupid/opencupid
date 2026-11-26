import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { token: 'tok' }, query: {} }),
}))
vi.mock('@/store/i18nStore', () => ({
  useI18nStore: () => ({ getAvailableLocales: () => ['en'], setLanguage: vi.fn() }),
}))

const store = vi.hoisted(() => ({
  getStatus: vi.fn(),
  unsubscribe: vi.fn(),
  unsubscribeAll: vi.fn(),
}))
vi.mock('../../stores/unsubscribeStore', () => ({ useUnsubscribeStore: () => store }))

import UnsubscribeView from '../UnsubscribeView.vue'

function mountView() {
  return mount(UnsubscribeView, {
    global: {
      stubs: {
        AuthLayout: { template: '<div><slot /></div>' },
        BSpinner: true,
        BButton: {
          props: ['disabled'],
          emits: ['click'],
          template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
        },
      },
    },
  })
}

const ok = (scope: string, alreadyUnsubscribed = false) => ({
  success: true,
  data: { success: true, alreadyUnsubscribed, scope },
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('UnsubscribeView', () => {
  it('uses the general copy for a notifications link', async () => {
    store.getStatus.mockResolvedValue(ok('notifications'))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('unsubscribe.confirm_title')
  })

  it('says only reminder emails stop for a reminders link', async () => {
    store.getStatus.mockResolvedValue(ok('reminders'))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('unsubscribe.nearby_confirm_title')
    expect(wrapper.text()).toContain('unsubscribe.nearby_confirm_body')
  })

  it('shows the scoped already-unsubscribed text', async () => {
    store.getStatus.mockResolvedValue(ok('reminders', true))
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('unsubscribe.nearby_already_body')
  })

  it('confirms with the scoped done text', async () => {
    store.getStatus.mockResolvedValue(ok('reminders'))
    store.unsubscribe.mockResolvedValue(ok('reminders'))
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(store.unsubscribe).toHaveBeenCalledWith('tok')
    expect(wrapper.text()).toContain('unsubscribe.done_title')
    expect(wrapper.text()).toContain('unsubscribe.nearby_done_body')
  })

  it('shows the error state when unsubscribing fails', async () => {
    store.getStatus.mockResolvedValue(ok('notifications'))
    store.unsubscribe.mockResolvedValue({ success: false })
    const wrapper = mountView()
    await flushPromises()

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('unsubscribe.error_title')
  })

  describe('unsubscribe from all emails', () => {
    const allButton = (wrapper: ReturnType<typeof mountView>) =>
      wrapper.find('[data-testid="unsubscribe-all"]')

    it.each([
      ['confirm', ok('reminders')],
      ['already', ok('reminders', true)],
    ])('is offered in the %s state', async (_state, status) => {
      store.getStatus.mockResolvedValue(status)
      const wrapper = mountView()
      await flushPromises()

      expect(allButton(wrapper).text()).toBe('unsubscribe.all_button')
    })

    it('is still offered after unsubscribing from the link scope', async () => {
      store.getStatus.mockResolvedValue(ok('reminders'))
      store.unsubscribe.mockResolvedValue(ok('reminders'))
      const wrapper = mountView()
      await flushPromises()

      await wrapper.find('button').trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('unsubscribe.nearby_done_body')
      expect(allButton(wrapper).exists()).toBe(true)
    })

    it('turns off every email and says so', async () => {
      store.getStatus.mockResolvedValue(ok('reminders'))
      store.unsubscribeAll.mockResolvedValue({
        success: true,
        data: { success: true, alreadyUnsubscribed: false },
      })
      const wrapper = mountView()
      await flushPromises()

      await allButton(wrapper).trigger('click')
      await flushPromises()

      expect(store.unsubscribeAll).toHaveBeenCalledWith('tok')
      expect(store.unsubscribe).not.toHaveBeenCalled()
      expect(wrapper.text()).toContain('unsubscribe.all_done_body')
      expect(allButton(wrapper).exists()).toBe(false)
    })

    it('says so when nothing was subscribed', async () => {
      store.getStatus.mockResolvedValue(ok('notifications', true))
      store.unsubscribeAll.mockResolvedValue({
        success: true,
        data: { success: true, alreadyUnsubscribed: true },
      })
      const wrapper = mountView()
      await flushPromises()

      await allButton(wrapper).trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('unsubscribe.all_already_body')
    })

    it('shows the error state when it fails', async () => {
      store.getStatus.mockResolvedValue(ok('notifications'))
      store.unsubscribeAll.mockResolvedValue({ success: false })
      const wrapper = mountView()
      await flushPromises()

      await allButton(wrapper).trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('unsubscribe.error_title')
    })

    it('is not offered when the link is invalid', async () => {
      store.getStatus.mockResolvedValue({ success: false })
      const wrapper = mountView()
      await flushPromises()

      expect(allButton(wrapper).exists()).toBe(false)
    })
  })
})
