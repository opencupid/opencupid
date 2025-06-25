import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../components/ProfileImage.vue', () => ({ default: { template: '<div class="img" />' } }))

import ProfileThumbnail from '../components/ProfileThumbnail.vue'

describe('ProfileThumbnail', () => {
  it('renders ProfileImage', () => {
    const wrapper = mount(ProfileThumbnail, { props: { profile: {} as any } })
    expect(wrapper.find('.img').exists()).toBe(true)
  })
})
