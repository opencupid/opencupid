import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ToggleSwitch from '../ToggleSwitch.vue'

describe('ToggleSwitch', () => {
  it('emits update when toggled', async () => {
    const wrapper = mount(ToggleSwitch, { props: { label: 'Test', modelValue: false } })
    await wrapper.find('input').setValue(true)
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([true])
  })
})
