import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

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

// Access the module-level loadedUrls set so we can seed / clear it between tests
const getLoadedUrls = (): Set<string> => {
  // The set is exported as a module-level binding; we reach it via the component module
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (ProfileCardComponent as any).__test_loadedUrls
}

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
  beforeEach(() => {
    // Clear the module-level cache between tests
    getLoadedUrls()?.clear()
  })

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

  it('skips blurhash when the image URL is already cached', () => {
    // Seed the cache with the card URL
    getLoadedUrls().add('/img0')

    const wrapper = mountCard('LEHV6nWB2yk8pyo0adR*.7kCMdnj')
    // Blurhash should NOT appear because the URL was already loaded
    expect(wrapper.find('.blurhash-stub').exists()).toBe(false)
  })

  it('populates the cache after image loads', async () => {
    const wrapper = mountCard('LEHV6nWB2yk8pyo0adR*.7kCMdnj')

    const profileImage = wrapper.findComponent({ name: 'ProfileImage' })
    await profileImage.vm.$emit('load')
    await wrapper.vm.$nextTick()

    expect(getLoadedUrls().has('/img0')).toBe(true)
  })
})
