import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/publicprofile/components/ProfileMarker.vue', () => ({
  default: {
    name: 'ProfileMarker',
    props: ['profile', 'highlighted'],
    template: '<div class="marker" :data-hl="highlighted" />',
  },
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
}

describe('MessagingNav', () => {
  it('emits deselect:convo on back button click', async () => {
    const wrapper = mount(MessagingNav, {
      props: {
        recipient: { id: '1', publicName: 'B', profileImages: [], location: { country: '' } },
      },
      global: { stubs, mocks: { $t: (key: string) => key } },
    })
    await wrapper.find('.back-button a').trigger('click')
    expect(wrapper.emitted('deselect:convo')).toBeTruthy()
  })

  it('renders allow calls checkbox checked when allowCalls is true', () => {
    const wrapper = mount(MessagingNav, {
      props: {
        recipient: { id: '1', publicName: 'B', profileImages: [], location: { country: '' } },
        allowCalls: true,
      },
      global: { stubs, mocks: { $t: (key: string) => key } },
    })
    const checkbox = wrapper.find('#allow-calls-check')
    expect(checkbox.exists()).toBe(true)
    expect((checkbox.element as HTMLInputElement).checked).toBe(true)
  })

  it('renders allow calls checkbox unchecked when allowCalls is false', () => {
    const wrapper = mount(MessagingNav, {
      props: {
        recipient: { id: '1', publicName: 'B', profileImages: [], location: { country: '' } },
        allowCalls: false,
      },
      global: { stubs, mocks: { $t: (key: string) => key } },
    })
    const checkbox = wrapper.find('#allow-calls-check')
    expect(checkbox.exists()).toBe(true)
    expect((checkbox.element as HTMLInputElement).checked).toBe(false)
  })

  it('disables the allow calls checkbox when callableDisabled is true', () => {
    const wrapper = mount(MessagingNav, {
      props: {
        recipient: { id: '1', publicName: 'B', profileImages: [], location: { country: '' } },
        allowCalls: true,
        callableDisabled: true,
      },
      global: { stubs, mocks: { $t: (key: string) => key } },
    })
    const checkbox = wrapper.find('#allow-calls-check')
    expect((checkbox.element as HTMLInputElement).disabled).toBe(true)
  })

  it("passes the highlight on to the recipient's avatar", () => {
    const recipient = { id: '1', publicName: 'B', profileImages: [], location: { country: '' } }
    const mountNav = (highlighted?: boolean) =>
      mount(MessagingNav, {
        props: { recipient, highlighted },
        global: { stubs, mocks: { $t: (key: string) => key } },
      })

    expect(mountNav(true).find('.marker').attributes('data-hl')).toBe('true')
    expect(mountNav(false).find('.marker').attributes('data-hl')).toBe('false')
  })
})
