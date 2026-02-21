import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/images/components/ProfileThumbnail.vue', () => ({
  default: { template: '<div />' },
}))
vi.mock('@/assets/icons/arrows/arrow-single-left.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/menu-dots-vert.svg', () => ({ default: { template: '<div />' } }))

import MessagingNav from '../components/MessagingNav.vue'

describe('MessagingNav', () => {
  it('emits events on icon clicks', async () => {
    const wrapper = mount(MessagingNav, {
      props: { recipient: { id: '1', publicName: 'B', profileImages: [] } },
      global: {
        stubs: { BButton: true, ProfileThumbnail: true },
        mocks: { $t: (key: string) => key },
      },
    })
    await wrapper.find('.back-button a').trigger('click')
    await wrapper.find('.action-button').trigger('click')
    expect(wrapper.emitted('deselect:convo')).toBeTruthy()
    expect(wrapper.emitted('modal:open')).toBeTruthy()
  })

  it('shows call button when canCall is true', () => {
    const wrapper = mount(MessagingNav, {
      props: { recipient: { id: '1', publicName: 'B', profileImages: [] }, canCall: true },
      global: {
        stubs: { BButton: true, ProfileThumbnail: true },
        mocks: { $t: (key: string) => key },
      },
    })
    expect(wrapper.find('.call-button').exists()).toBe(true)
  })

  it('hides call button when canCall is false', () => {
    const wrapper = mount(MessagingNav, {
      props: { recipient: { id: '1', publicName: 'B', profileImages: [] }, canCall: false },
      global: {
        stubs: { BButton: true, ProfileThumbnail: true },
        mocks: { $t: (key: string) => key },
      },
    })
    expect(wrapper.find('.call-button').exists()).toBe(false)
  })

  it('emits call:start on call button click', async () => {
    const wrapper = mount(MessagingNav, {
      props: { recipient: { id: '1', publicName: 'B', profileImages: [] }, canCall: true },
      global: {
        stubs: { BButton: true, ProfileThumbnail: true },
        mocks: { $t: (key: string) => key },
      },
    })
    await wrapper.find('.call-button').trigger('click')
    expect(wrapper.emitted('call:start')).toBeTruthy()
  })
})
