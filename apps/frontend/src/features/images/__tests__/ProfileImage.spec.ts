import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ProfileImage from '../components/ProfileImage.vue'

const ImageTag = {
  props: ['image', 'className'],
  template: '<div class="image-tag">{{ image.variants[0].url }}</div>'
}

describe('ProfileImage', () => {
  it('renders first image from profile', () => {
    const profile = { profileImages: [{ variants: [{ size: 'original', url: '/one.jpg' }] }] }
    const wrapper = mount(ProfileImage, {
      props: { profile },
      global: { stubs: { ImageTag } }
    })
    expect(wrapper.find('.image-tag').text()).toContain('/one.jpg')
  })

  it('updates when profile prop changes', async () => {
    const profile = { profileImages: [{ variants: [{ size: 'original', url: '/one.jpg' }] }] }
    const wrapper = mount(ProfileImage, {
      props: { profile },
      global: { stubs: { ImageTag } }
    })
    await wrapper.setProps({ profile: { profileImages: [{ variants: [{ size: 'original', url: '/two.jpg' }] }] } })
    expect(wrapper.find('.image-tag').text()).toContain('/two.jpg')
  })
})
