import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/images/components/BlurhashImage.vue', () => ({
  default: { name: 'BlurhashImage', props: ['image', 'variant'], template: '<div />' },
}))

import UserContentMapPopup from '../UserContentMapPopup.vue'

const image = { variants: [{ size: 'card', url: 'x.jpg' }], blurhash: 'LEHV6nWB2yk8' }

describe('UserContentMapPopup', () => {
  it('shows the first image through BlurhashImage, so its blurhash shows until it loads', () => {
    const wrapper = mount(UserContentMapPopup, {
      props: { item: { id: 'c1', images: [image] as never } },
    })
    const img = wrapper.findComponent({ name: 'BlurhashImage' })
    expect(img.props('image')).toEqual(image)
    expect(img.props('variant')).toBe('card')
  })

  it('renders no image frame without images', () => {
    const wrapper = mount(UserContentMapPopup, { props: { item: { id: 'c1', images: [] } } })
    expect(wrapper.find('.popup-image').exists()).toBe(false)
  })
})
