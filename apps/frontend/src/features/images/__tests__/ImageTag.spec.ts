import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import ImageTag from '../components/ImageTag.vue'

describe('ImageTag', () => {
  it('renders img with url', () => {
    const wrapper = mount(ImageTag, { props: { image: { url: '/path/img' } } })
    expect(wrapper.find('img').attributes('src')).toContain('/path/img-original.jpg')
  })
})
