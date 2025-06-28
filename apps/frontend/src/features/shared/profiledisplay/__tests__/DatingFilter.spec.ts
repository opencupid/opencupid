import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import DatingFilter from '../DatingFilter.vue'

const profile = (active: boolean) => ({ isDatingActive: active } as any)

describe('DatingFilter', () => {
  it('only renders slot when profile is active', async () => {
    const wrapper = mount(DatingFilter, {
      props: { profile: profile(false) },
      slots: { default: '<div class="slot">Slot</div>' }
    })
    expect(wrapper.html()).not.toContain('slot')
    await wrapper.setProps({ profile: profile(true) })
    expect(wrapper.html()).toContain('slot')
  })
})
