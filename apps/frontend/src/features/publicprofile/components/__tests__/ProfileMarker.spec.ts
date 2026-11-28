import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/features/images/composables/useBlurhashDataUrl', () => ({
  blurhashToDataUrl: (hash: string) => `data:blur/${hash}`,
}))

vi.mock('@/assets/icons/interface/heart-filled.svg?raw', () => ({
  default: '<svg class="icon-heart"></svg>',
}))

const canSee = { value: true }
vi.mock('@/features/images/composables/useProfilePhotoAccess', () => ({
  useProfilePhotoAccess: () => ({ canSeePhotosOf: () => canSee.value }),
}))

import ProfileMarker from '../ProfileMarker.vue'

const profile = {
  id: 'p1',
  profileImages: [
    {
      blurhash: 'abc',
      variants: [
        { size: 'card', url: '/card.jpg' },
        { size: 'thumb', url: '/thumb.jpg' },
      ],
    },
  ],
}

describe('ProfileMarker', () => {
  beforeEach(() => {
    canSee.value = true
  })

  it('renders the map marker with the thumb photo', () => {
    const wrapper = mount(ProfileMarker, { props: { profile } })
    const img = wrapper.find('.profile-marker img.poi-avatar')
    expect(img.attributes('src')).toBe('/thumb.jpg')
    expect(wrapper.find('.match-indicator').exists()).toBe(false)
  })

  it('shows the match heart and glow when highlighted', () => {
    const wrapper = mount(ProfileMarker, { props: { profile, highlighted: true } })
    expect(wrapper.find('.poi-avatar.highlighted').exists()).toBe(true)
    expect(wrapper.find('.match-indicator .icon-heart').exists()).toBe(true)
  })

  it('renders the hidden marker when the viewer may not see the photo', () => {
    canSee.value = false
    const wrapper = mount(ProfileMarker, { props: { profile } })
    expect(wrapper.find('.poi-avatar-hidden').exists()).toBe(true)
    expect(wrapper.html()).not.toContain('/thumb.jpg')
  })
})
