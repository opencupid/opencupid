import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'

const mode = ref<'light' | 'dark'>('light')

vi.mock('../../composables/useAppColorMode', () => ({
  useAppColorMode: () => mode,
}))
vi.mock('@/assets/icons/interface/sun.svg', () => ({
  default: { template: '<span data-testid="icon-sun" />' },
}))
vi.mock('@/assets/icons/weather/night.svg', () => ({
  default: { template: '<span data-testid="icon-night" />' },
}))

import ColorModeToggle from '../ColorModeToggle.vue'

const mountOptions = {
  global: {
    mocks: { $t: (k: string) => k },
    stubs: { BButton: { template: '<button><slot /></button>' } },
  },
}

describe('ColorModeToggle', () => {
  beforeEach(() => {
    mode.value = 'light'
  })

  it('offers dark mode while in light mode', () => {
    const wrapper = mount(ColorModeToggle, mountOptions)

    expect(wrapper.find('[data-testid="icon-night"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="icon-sun"]').exists()).toBe(false)
    expect(wrapper.find('button').attributes('aria-label')).toBe('settings.color_mode_dark')
  })

  it('offers light mode while in dark mode', () => {
    mode.value = 'dark'
    const wrapper = mount(ColorModeToggle, mountOptions)

    expect(wrapper.find('[data-testid="icon-sun"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="icon-night"]').exists()).toBe(false)
    expect(wrapper.find('button').attributes('aria-label')).toBe('settings.color_mode_light')
  })

  it('switches between modes on click', async () => {
    const wrapper = mount(ColorModeToggle, mountOptions)

    await wrapper.find('button').trigger('click')
    expect(mode.value).toBe('dark')

    await wrapper.find('button').trigger('click')
    expect(mode.value).toBe('light')
  })
})
