import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import ImageTag from '../components/ImageTag.vue'

describe('ImageTag', () => {
  it('renders img with variant url', () => {
    const wrapper = mount(ImageTag, {
      props: { image: { variants: [{ size: 'card', url: '/path/img-card.jpg' }] } },
    })
    expect(wrapper.find('img').attributes('src')).toContain('/path/img-card.jpg')
    expect(wrapper.html()).toContain('jpg')
  })
})
