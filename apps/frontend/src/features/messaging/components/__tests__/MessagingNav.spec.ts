import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/assets/icons/arrows/arrow-single-left.svg', () => ({
  default: { template: '<svg />' },
}))
vi.mock('@/assets/icons/interface/menu-dots-vert.svg', () => ({
  default: { template: '<svg />' },
}))

import MessagingNav from '../MessagingNav.vue'
import type { ProfileSummary } from '@zod/profile/profile.dto'

function mountNav(recipient: ProfileSummary | null) {
  return mount(MessagingNav, {
    props: { recipient },
    global: {
      mocks: { $t: (k: string) => k },
      stubs: {
        ProfileThumbnail: true,
        BDropdown: { template: '<div data-testid="menu"><slot /></div>' },
        BDropdownItem: true,
        BDropdownDivider: true,
        BDropdownForm: true,
      },
    },
  })
}

describe('MessagingNav', () => {
  it('shows the recipient and the actions menu', () => {
    const wrapper = mountNav({ id: 'p1', publicName: 'Alice' } as ProfileSummary)

    expect(wrapper.text()).toContain('Alice')
    expect(wrapper.find('[data-testid="menu"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="deleted-recipient"]').exists()).toBe(false)
  })

  it('shows the tombstone with back and close but no actions when the partner is deleted', async () => {
    const wrapper = mountNav(null)

    expect(wrapper.find('[data-testid="deleted-recipient"]').text()).toBe(
      'messaging.deleted_account'
    )
    expect(wrapper.find('[data-testid="menu"]').exists()).toBe(false)

    await wrapper.find('.back-button a').trigger('click')
    await wrapper.find('.btn-close').trigger('click')
    expect(wrapper.emitted('deselect:convo')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
