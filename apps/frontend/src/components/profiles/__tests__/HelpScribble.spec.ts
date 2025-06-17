import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/components/icons/DoodleIcons.vue', () => ({ default: { template: '<div class="icon" />' } }))

import HelpScribble from '../HelpScribble.vue'

describe('HelpScribble', () => {
  it('shows text and icon', () => {
    const wrapper = mount(HelpScribble, { props: { text: 'Help me' } })
    expect(wrapper.text()).toContain('Help me')
    expect(wrapper.find('.icon').exists()).toBe(true)
  })
})
