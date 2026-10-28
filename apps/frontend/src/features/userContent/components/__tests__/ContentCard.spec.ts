import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('@/features/posts/components/PostCard.vue', () => ({
  default: {
    props: { post: Object, showDetails: Boolean, truncateText: Boolean },
    template:
      '<div class="post-card" :data-show-details="showDetails" :data-truncate="truncateText" />',
  },
}))
vi.mock('@/features/events/components/EventCard.vue', () => ({
  default: { props: ['event', 'showDetails'], template: '<div class="event-card" />' },
}))
vi.mock('@/features/community/components/CommunityCard.vue', () => ({
  default: { props: ['community', 'showDetails'], template: '<div class="community-card" />' },
}))

import ContentCard from '../ContentCard.vue'

describe('ContentCard', () => {
  it('renders posts as truncated grid tiles', () => {
    const wrapper = mount(ContentCard, {
      props: { item: { id: 'p1', kind: 'post' } as any, showDetails: false },
    })
    const card = wrapper.get('.post-card')
    expect(card.attributes('data-truncate')).toBe('true')
    expect(card.attributes('data-show-details')).toBe('false')
  })

  it('renders the card matching the item kind', () => {
    const event = mount(ContentCard, {
      props: { item: { id: 'e1', kind: 'event' } as any, showDetails: false },
    })
    expect(event.find('.event-card').exists()).toBe(true)

    const community = mount(ContentCard, {
      props: { item: { id: 'c1', kind: 'community' } as any, showDetails: false },
    })
    expect(community.find('.community-card').exists()).toBe(true)
  })
})
