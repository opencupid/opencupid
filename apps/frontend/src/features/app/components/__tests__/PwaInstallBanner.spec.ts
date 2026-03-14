import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('../../composables/usePwaInstall', () => ({
  promptInstall: vi.fn(),
}))
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PwaInstallBanner from '../PwaInstallBanner.vue'
import { useAppStore } from '../../stores/appStore'
import { promptInstall } from '../../composables/usePwaInstall'

describe('PwaInstallBanner', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(promptInstall).mockReset()
  })

  it('should not be visible when canInstallPwa is false', () => {
    const wrapper = mount(PwaInstallBanner)
    expect(wrapper.find('.alert').exists()).toBe(false)
  })

  it('should be visible when canInstallPwa is true', async () => {
    const wrapper = mount(PwaInstallBanner)
    const appStore = useAppStore()

    appStore.canInstallPwa = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.alert').exists()).toBe(true)
    expect(wrapper.text()).toContain('uicomponents.install_banner.message')
  })

  it('should have an install button', async () => {
    const wrapper = mount(PwaInstallBanner)
    const appStore = useAppStore()

    appStore.canInstallPwa = true
    await wrapper.vm.$nextTick()

    const button = wrapper.find('.btn-primary')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('uicomponents.install_banner.install')
  })

  it('should call promptInstall when install button is clicked', async () => {
    const wrapper = mount(PwaInstallBanner)
    const appStore = useAppStore()

    appStore.canInstallPwa = true
    await wrapper.vm.$nextTick()

    await wrapper.find('.btn-primary').trigger('click')
    expect(promptInstall).toHaveBeenCalledOnce()
  })

  it('should hide the banner when dismiss button is clicked', async () => {
    const wrapper = mount(PwaInstallBanner)
    const appStore = useAppStore()

    appStore.canInstallPwa = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.alert').exists()).toBe(true)

    await wrapper.find('.btn-close').trigger('click')
    expect(wrapper.find('.alert').exists()).toBe(false)
  })
})
