import { describe, it, expect, beforeEach, vi } from 'vitest'
vi.mock('../../composables/usePwaInstall', () => ({
  promptInstall: vi.fn(),
}))
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import PwaInstallButton from '../PwaInstallButton.vue'
import { useAppStore } from '../../stores/appStore'
import { promptInstall } from '../../composables/usePwaInstall'

const mountOptions = {
  global: {
    mocks: { $t: (k: string) => k },
  },
}

describe('PwaInstallButton', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(promptInstall).mockReset()
  })

  it('should not render when canInstallPwa is false', () => {
    const wrapper = mount(PwaInstallButton, mountOptions)
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('should render when canInstallPwa is true', async () => {
    const wrapper = mount(PwaInstallButton, mountOptions)
    const appStore = useAppStore()

    appStore.canInstallPwa = true
    await wrapper.vm.$nextTick()

    expect(wrapper.find('div').exists()).toBe(true)
  })

  it('should call promptInstall when the button is clicked', async () => {
    const wrapper = mount(PwaInstallButton, mountOptions)
    const appStore = useAppStore()

    appStore.canInstallPwa = true
    await wrapper.vm.$nextTick()

    await wrapper.find('button').trigger('click')
    expect(promptInstall).toHaveBeenCalledOnce()
  })
})
