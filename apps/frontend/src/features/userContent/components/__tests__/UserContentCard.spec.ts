import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/map/utils/contentKinds', () => ({
  CONTENT_KIND_DISPLAY: {
    event: { icon: { template: '<svg class="kind-icon" />' }, color: 'event' },
    community: { icon: { template: '<svg class="kind-icon" />' }, color: 'community' },
  },
}))
vi.mock('../UserContentMapPopup.vue', () => ({
  default: { props: ['item'], template: '<div><slot name="content" /></div>' },
}))

import UserContentCard from '../UserContentCard.vue'

const item = (images: unknown[] = []) =>
  ({ id: 'x', content: 'Name\n\nDescription', images }) as never

function mountCard(images: unknown[] = [], kind: 'event' | 'community' = 'event') {
  return mount(UserContentCard, {
    props: { item: item(images), kind },
    slots: { default: 'Meta' },
  })
}

describe('UserContentCard', () => {
  it('shows only the first line of the content as the name, and the meta slot', () => {
    const wrapper = mountCard()
    expect(wrapper.find('.card-name').text()).toBe('Name')
    expect(wrapper.text()).not.toContain('Description')
    expect(wrapper.find('.card-caption').text()).toContain('Meta')
  })

  it('puts the caption in the translucent overlay over a picture, without the icon', () => {
    const wrapper = mountCard([{ id: 'img' }])
    expect(wrapper.find('.card-caption').classes()).toContain('card-overlay')
    expect(wrapper.find('.kind-icon').exists()).toBe(false)
  })

  it('shows the kind icon on its tinted background without a picture', () => {
    const wrapper = mountCard([], 'community')
    expect(wrapper.find('.bg-community-light .text-community .kind-icon').exists()).toBe(true)
    expect(wrapper.find('.card-overlay').exists()).toBe(false)
  })
})
