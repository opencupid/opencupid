import { describe, it, expect, beforeEach, vi } from 'vitest'
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
    expect(wrapper.text()).toContain('An update is available.')
  })

  it('should have a reload button', async () => {
    const wrapper = mount(UpdateBanner)
    const appStore = useAppStore()
    
    appStore.updateAvailable = true
    await wrapper.vm.$nextTick()
    
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.text()).toBe('Reload')
  })

  it('should call window.location.reload when button is clicked', async () => {
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true
    })

    const wrapper = mount(UpdateBanner)
    const appStore = useAppStore()
    
    appStore.updateAvailable = true
    await wrapper.vm.$nextTick()
    
    const button = wrapper.find('button')
    await button.trigger('click')
    
    expect(reloadSpy).toHaveBeenCalled()
  })
})
