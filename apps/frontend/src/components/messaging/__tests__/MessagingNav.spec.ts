import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/components/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../profiles/image/ProfileThumbnail.vue', () => ({ default: { template: '<div />' } }))

import MessagingNav from '../MessagingNav.vue'

describe('MessagingNav', () => {
  it('emits events on icon clicks', async () => {
    const wrapper = mount(MessagingNav, {
      props: { recipient: { publicName: 'B' } },
      global: { stubs: { BButton: true, ProfileThumbnail: true } }
    })
    await wrapper.find('.back-button a').trigger('click')
    await wrapper.find('.action-button a').trigger('click')
    expect(wrapper.emitted('deselect:convo')).toBeTruthy()
    expect(wrapper.emitted('modal:open')).toBeTruthy()
  })
})
