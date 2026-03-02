import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import UpdateBanner from '../UpdateBanner.vue'
import { useAppStore } from '../../stores/appStore'

describe('UpdateBanner', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('should not be visible when no update is available', () => {
    const wrapper = mount(UpdateBanner)
    const appStore = useAppStore()

    appStore.updateAvailable = false

    expect(wrapper.find('.alert').exists()).toBe(false)
  })

  it('should be visible when update is available', async () => {
    const wrapper = mount(UpdateBanner)
    const appStore = useAppStore()

    appStore.updateAvailable = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.alert').exists()).toBe(true)
    expect(wrapper.text()).toContain('uicomponents.update_banner.message')
  })

  it('should have a reload button', async () => {
    const wrapper = mount(UpdateBanner)
    const appStore = useAppStore()

    appStore.updateAvailable = true
    await wrapper.vm.$nextTick()

    const button = wrapper.find('.btn-primary')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('uicomponents.update_banner.reload')
  })

  it('should call window.location.reload when reload button is clicked', async () => {
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    })

    const wrapper = mount(UpdateBanner)
    const appStore = useAppStore()

    appStore.updateAvailable = true
    await wrapper.vm.$nextTick()

    const button = wrapper.find('.btn-primary')
    await button.trigger('click')

    expect(reloadSpy).toHaveBeenCalled()
  })

  it('should hide the banner when dismiss button is clicked', async () => {
    const wrapper = mount(UpdateBanner)
    const appStore = useAppStore()

    appStore.updateAvailable = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.alert').exists()).toBe(true)

    const closeButton = wrapper.find('.btn-close')
    expect(closeButton.exists()).toBe(true)

    await closeButton.trigger('click')

    expect(wrapper.find('.alert').exists()).toBe(false)
  })

  it('should re-show the banner after dismissal when a new version is detected', async () => {
    const wrapper = mount(UpdateBanner)
    const appStore = useAppStore()

    // First update: show and dismiss
    appStore.updateAvailable = true
    appStore.latestVersion = '0.19.0'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.alert').exists()).toBe(true)

    await wrapper.find('.btn-close').trigger('click')
    expect(wrapper.find('.alert').exists()).toBe(false)

    // A newer version is detected
    appStore.latestVersion = '0.20.0'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.alert').exists()).toBe(true)
  })
})
