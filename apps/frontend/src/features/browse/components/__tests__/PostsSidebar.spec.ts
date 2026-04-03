import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import PostsSidebar from '../PostsSidebar.vue'

vi.mock('../PostMarkerIcon.vue', () => ({
  default: { template: '<span class="mock-post-icon" />' },
}))

const posts = [
  {
    id: '1',
    title: 'Post A',
    location: { lat: 0, lon: 0 },
    type: 'post',
    image: { variants: [{ url: '/img.jpg', size: 'thumb' }] },
    source: {},
  },
  {
    id: '2',
    title: 'Post B',
    location: { lat: 0, lon: 0 },
    type: 'post',
    image: undefined,
    source: {},
  },
]

describe('PostsSidebar', () => {
  it('renders one thumb per post', () => {
    const wrapper = mount(PostsSidebar, { props: { posts, activeId: null } })
    expect(wrapper.findAll('.thumb-cell')).toHaveLength(2)
  })

  it('emits select when a thumb is clicked', async () => {
    const wrapper = mount(PostsSidebar, { props: { posts, activeId: null } })
    await wrapper.findAll('.thumb-cell')[0].trigger('click')
    expect(wrapper.emitted('select')?.[0][0]).toMatchObject({ id: '1' })
  })

  it('marks the active post with active class', () => {
    const wrapper = mount(PostsSidebar, { props: { posts, activeId: '1' } })
    expect(wrapper.findAll('.thumb-cell')[0].classes()).toContain('active')
    expect(wrapper.findAll('.thumb-cell')[1].classes()).not.toContain('active')
  })

  it('shows empty state when no posts', () => {
    const wrapper = mount(PostsSidebar, { props: { posts: [], activeId: null } })
    expect(wrapper.text()).toContain('No posts in view')
  })
})
