import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/images/components/ProfileThumbnail.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/arrows/arrow-single-left.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/menu-dots-vert.svg', () => ({ default: { template: '<div />' } }))

import MessagingNav from '../components/MessagingNav.vue'

describe('MessagingNav', () => {
  it('emits events on icon clicks', async () => {
    const wrapper = mount(MessagingNav, {
      props: { recipient: { id: '1', publicName: 'B', profileImages: [] } },
      global: { stubs: { BButton: true, ProfileThumbnail: true } }
    })
    await wrapper.find('.back-button a').trigger('click')
    await wrapper.find('.action-button a').trigger('click')
    expect(wrapper.emitted('deselect:convo')).toBeTruthy()
    expect(wrapper.emitted('modal:open')).toBeTruthy()
  })
})
