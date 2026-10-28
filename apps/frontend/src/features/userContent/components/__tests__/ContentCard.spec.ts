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
  default: {
    props: { event: Object, showDetails: Boolean, truncateText: Boolean },
    template: '<div class="event-card" :data-truncate="truncateText" />',
  },
}))
vi.mock('@/features/community/components/CommunityCard.vue', () => ({
  default: {
    props: { community: Object, showDetails: Boolean, truncateText: Boolean },
    template: '<div class="community-card" :data-truncate="truncateText" />',
  },
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

  it('renders every kind as a truncated grid tile', () => {
    const event = mount(ContentCard, {
      props: { item: { id: 'e1', kind: 'event' } as any, showDetails: false },
    })
    expect(event.get('.event-card').attributes('data-truncate')).toBe('true')

    const community = mount(ContentCard, {
      props: { item: { id: 'c1', kind: 'community' } as any, showDetails: false },
    })
    expect(community.get('.community-card').attributes('data-truncate')).toBe('true')
  })
})
