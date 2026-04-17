import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import NearbyFeatures from '../NearbyFeatures.vue'
import type { MapPoi } from '@/features/map/types/map.types'

function makePoi(id: string, title: string): MapPoi {
  return {
    id,
    title,
    location: { lat: 47.5, lon: 19.0 },
    type: 'post',
    source: { id, type: 'OFFER', content: title, location: {}, postedBy: {} },
  }
}

describe('NearbyFeatures', () => {
  it('renders nothing when posts array is empty', () => {
    const wrapper = mount(NearbyFeatures, {
      props: { posts: [] },
    })
    expect(wrapper.find('.nearby-posts').exists()).toBe(false)
  })

  it('renders a card for each post', () => {
    const posts = [makePoi('p1', 'First post'), makePoi('p2', 'Second post')]
    const wrapper = mount(NearbyFeatures, {
      props: { posts },
    })
    const cards = wrapper.findAll('.nearby-post-card')
    expect(cards).toHaveLength(2)
    expect(cards[0].text()).toContain('First post')
    expect(cards[1].text()).toContain('Second post')
  })

  it('truncates long content to 120 characters', () => {
    const longContent = 'A'.repeat(200)
    const wrapper = mount(NearbyFeatures, {
      props: { posts: [makePoi('p1', longContent)] },
    })
    expect(wrapper.find('.nearby-post-card').text()).toHaveLength(120)
  })

  it('emits post:select with source on card click', async () => {
    const poi = makePoi('p1', 'Click me')
    const wrapper = mount(NearbyFeatures, {
      props: { posts: [poi] },
    })
    await wrapper.find('.nearby-post-card').trigger('click')
    expect(wrapper.emitted('post:select')).toBeTruthy()
    expect(wrapper.emitted('post:select')![0][0]).toEqual(poi.source)
  })
})
