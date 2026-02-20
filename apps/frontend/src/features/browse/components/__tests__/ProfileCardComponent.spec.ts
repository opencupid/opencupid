import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/images/components/ProfileImage.vue', () => ({
  default: {
    name: 'ProfileImage',
    template: '<div class="profile-image-stub" />',
    props: ['profile', 'variant', 'className'],
    emits: ['load'],
  },
}))
vi.mock('@/features/images/components/BlurhashCanvas.vue', () => ({
  default: {
    template: '<canvas class="blurhash-stub" />',
    props: ['blurhash'],
  },
}))
vi.mock('@/features/shared/profiledisplay/TagList.vue', () => ({
  default: { template: '<div />', props: ['tags'] },
}))
vi.mock('@/features/shared/profiledisplay/LocationLabel.vue', () => ({
  default: { template: '<div />' },
}))

import ProfileCardComponent from '../ProfileCardComponent.vue'

const makeProfile = (blurhash: string | null = null) => ({
  id: '1',
  publicName: 'Test User',
  tags: [],
  location: null,
  profileImages: [
    {
      position: 0,
      variants: [{ size: 'card', url: '/img0' }],
      blurhash,
    },
  ],
})

const mountCard = (blurhash: string | null = null) =>
  mount(ProfileCardComponent, {
    props: { profile: makeProfile(blurhash) as any },
  })

describe('ProfileCardComponent', () => {
  it('shows blurhash placeholder before image loads', () => {
    const wrapper = mountCard('LEHV6nWB2yk8pyo0adR*.7kCMdnj')
    expect(wrapper.find('.blurhash-stub').exists()).toBe(true)
  })

  it('hides blurhash placeholder after image loads', async () => {
    const wrapper = mountCard('LEHV6nWB2yk8pyo0adR*.7kCMdnj')
    expect(wrapper.find('.blurhash-stub').exists()).toBe(true)

    const profileImage = wrapper.findComponent({ name: 'ProfileImage' })
    await profileImage.vm.$emit('load')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.blurhash-stub').exists()).toBe(false)
  })

  it('does not render blurhash when hash is null', () => {
    const wrapper = mountCard(null)
    expect(wrapper.find('.blurhash-stub').exists()).toBe(false)
  })

  it('emits click with profile id on card click', async () => {
    const wrapper = mountCard()
    await wrapper.find('.profile-card').trigger('click')
    expect(wrapper.emitted('click')![0]).toEqual(['1'])
  })
})
