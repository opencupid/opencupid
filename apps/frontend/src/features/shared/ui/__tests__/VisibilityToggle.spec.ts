import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))
vi.mock('@/assets/icons/interface/hide.svg', () => ({
  default: { template: '<span class="icon-hide" />' },
}))
vi.mock('@/assets/icons/interface/unhide.svg', () => ({
  default: { template: '<span class="icon-show" />' },
}))

import VisibilityToggle from '../VisibilityToggle.vue'

describe('VisibilityToggle', () => {
  it('renders the label', () => {
    const wrapper = mount(VisibilityToggle, {
      props: { modelValue: true, label: 'Visible to others' },
    })
    expect(wrapper.text()).toContain('Visible to others')
  })

  it('shows the unhide icon when visible', () => {
    const wrapper = mount(VisibilityToggle, {
      props: { modelValue: true, label: 'x' },
    })
    expect(wrapper.find('.icon-show').exists()).toBe(true)
    expect(wrapper.find('.icon-hide').exists()).toBe(false)
  })

  it('shows the hide icon when hidden', () => {
    const wrapper = mount(VisibilityToggle, {
      props: { modelValue: false, label: 'x' },
    })
    expect(wrapper.find('.icon-hide').exists()).toBe(true)
    expect(wrapper.find('.icon-show').exists()).toBe(false)
  })

  it('emits update:modelValue when toggled', async () => {
    const wrapper = mount(VisibilityToggle, {
      props: { modelValue: true, label: 'x' },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
  })
})
