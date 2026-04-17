import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import type { MapPoi } from '@/features/map/types/map.types'

vi.mock('@/assets/icons/arrows/chevrons-up.svg', () => ({
  default: { template: '<svg class="icon-expand" />' },
}))
vi.mock('@/assets/icons/arrows/chevrons-down.svg', () => ({
  default: { template: '<svg class="icon-collapse" />' },
}))
vi.mock('@/features/shared/ui/PostIt.vue', () => ({
  default: {
    name: 'PostIt',
    props: ['id'],
    template: '<div class="post-it-stub"><slot /></div>',
  },
}))
vi.mock('@/features/app/components/BottomSheet.vue', () => ({
  default: { template: '<div />' },
}))

import NearbyFeatures from '../NearbyFeatures.vue'

const stubs = {
  BOffcanvas: {
    name: 'BOffcanvas',
    props: ['show'],
    template: `<div class="offcanvas-stub" v-if="show"><slot name="header" /><slot /></div>`,
  },
  BButton: { template: '<button><slot /></button>' },
}

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
  it('does not render offcanvas when posts array is empty', () => {
    const wrapper = mount(NearbyFeatures, {
      props: { posts: [] },
      global: { stubs },
    })
    expect(wrapper.find('.offcanvas-stub').exists()).toBe(false)
  })

  it('renders a card for each post', () => {
    const posts = [makePoi('p1', 'First post'), makePoi('p2', 'Second post')]
    const wrapper = mount(NearbyFeatures, {
      props: { posts },
      global: { stubs },
    })
    const cards = wrapper.findAll('.post-it-stub')
    expect(cards).toHaveLength(2)
    expect(cards[0]!.text()).toContain('First post')
    expect(cards[1]!.text()).toContain('Second post')
  })

  it('truncates long content to 120 characters', () => {
    const longContent = 'A'.repeat(200)
    const wrapper = mount(NearbyFeatures, {
      props: { posts: [makePoi('p1', longContent)] },
      global: { stubs },
    })
    expect(wrapper.find('.post-it-stub').text()).toHaveLength(120)
  })

  it('emits post:select with source on card click', async () => {
    const poi = makePoi('p1', 'Click me')
    const wrapper = mount(NearbyFeatures, {
      props: { posts: [poi] },
      global: { stubs },
    })
    await wrapper.find('.nearby-items > div').trigger('click')
    expect(wrapper.emitted('post:select')).toBeTruthy()
    expect(wrapper.emitted('post:select')![0]![0]).toEqual(poi.source)
  })
})
