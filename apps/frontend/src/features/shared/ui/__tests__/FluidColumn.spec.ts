import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import FluidColumn from '../FluidColumn.vue'

describe('FluidColumn', () => {
  it('renders slot content', () => {
    const wrapper = mount(FluidColumn, {
      slots: { default: '<p>Hello</p>' },
    })
    expect(wrapper.text()).toContain('Hello')
  })

  it('has responsive column classes', () => {
    const wrapper = mount(FluidColumn)
    const div = wrapper.find('div')
    expect(div.classes()).toContain('col-12')
    expect(div.classes()).toContain('col-sm-10')
    expect(div.classes()).toContain('col-md-10')
    expect(div.classes()).toContain('col-lg-8')
    expect(div.classes()).toContain('col-xl-7')
    expect(div.classes()).toContain('mx-auto')
  })
})
