import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/images/components/ProfileThumbnail.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/assets/icons/arrows/arrow-single-left.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/menu-dots-vert.svg', () => ({ default: { template: '<div />' } }))

import MessagingNav from '../components/MessagingNav.vue'

const stubs = {
  BButton: true,
  BDropdown: { template: '<div><slot /><slot name="button-content" /></div>' },
  BDropdownItem: { template: '<div class="dropdown-item"><slot /></div>' },
  BDropdownDivider: { template: '<hr />' },
  BDropdownForm: { template: '<div class="dropdown-form"><slot /></div>' },
  ProfileThumbnail: true,
}

describe('MessagingNav', () => {
  it('emits deselect:convo on back button click', async () => {
    const wrapper = mount(MessagingNav, {
      props: { recipient: { id: '1', publicName: 'B', profileImages: [] } },
      global: { stubs, mocks: { $t: (key: string) => key } },
    })
    await wrapper.find('.back-button a').trigger('click')
    expect(wrapper.emitted('deselect:convo')).toBeTruthy()
  })

  it('renders allow calls checkbox checked when allowCalls is true', () => {
    const wrapper = mount(MessagingNav, {
      props: { recipient: { id: '1', publicName: 'B', profileImages: [] }, allowCalls: true },
      global: { stubs, mocks: { $t: (key: string) => key } },
    })
    const checkbox = wrapper.find('#allow-calls-check')
    expect(checkbox.exists()).toBe(true)
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
  })

  it('renders allow calls checkbox unchecked when allowCalls is false', () => {
    const wrapper = mount(MessagingNav, {
      props: { recipient: { id: '1', publicName: 'B', profileImages: [] }, allowCalls: false },
      global: { stubs, mocks: { $t: (key: string) => key } },
    })
    const checkbox = wrapper.find('#allow-calls-check')
    expect(checkbox.exists()).toBe(true)
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
  })
})
