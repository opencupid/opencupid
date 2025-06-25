import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import ProfileImageComponent from '../components/ImageTag.vue'

describe('ProfileImageComponent', () => {
  it('renders picture sources', () => {
    const img = { url: '/img/one', altText: 'test' } as any
    const wrapper = mount(ProfileImageComponent, { props: { image: img } })
    expect(wrapper.find('img').attributes('src')).toContain('/img/one-original.jpg')
    expect(wrapper.html()).toContain('webp')
  })
})
