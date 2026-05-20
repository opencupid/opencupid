import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import type { UserContentMetadata } from '@zod/userContent/userContent.dto'

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
vi.mock('@/features/events/components/EventTeaser.vue', () => ({
  default: {
    name: 'EventTeaser',
    props: ['item'],
    template: '<div class="event-teaser-stub">{{ item.content }}</div>',
  },
}))
vi.mock('@/features/community/components/CommunityTeaser.vue', () => ({
  default: {
    name: 'CommunityTeaser',
    props: ['item'],
    template: '<div class="community-teaser-stub">{{ item.content }}</div>',
  },
}))
vi.mock('@/features/app/components/BottomSheet.vue', () => ({
  default: { template: '<div />' },
}))

import NearbyFeatures from '../NearbyFeatures.vue'
import PostIt from '@/features/shared/ui/PostIt.vue'
import EventTeaser from '@/features/events/components/EventTeaser.vue'
import CommunityTeaser from '@/features/community/components/CommunityTeaser.vue'

const stubs = {
  BOffcanvas: {
    name: 'BOffcanvas',
    props: ['show'],
    template: `<div class="offcanvas-stub" v-if="show"><slot name="header" /><slot /></div>`,
  },
  BButton: { template: '<button><slot /></button>' },
}

const profileSummary = {
  id: 'p1',
  publicName: 'Alice',
  profileImages: [],
} as any

function makeItem(
  id: string,
  kind: 'post' | 'event' | 'community',
  content: string
): UserContentMetadata {
  return {
    id,
    kind,
    content,
    postedBy: profileSummary,
    location: { country: 'US' },
    createdAt: new Date('2026-05-13T10:00:00Z'),
    isOwn: false,
    images: [],
  }
}

describe('NearbyFeatures', () => {
  it('renders the right teaser component for each kind', () => {
    const items = [
      makeItem('p1', 'post', 'post body'),
      makeItem('e1', 'event', 'event title'),
      makeItem('c1', 'community', 'community title'),
    ]
    const wrapper = mount(NearbyFeatures, { props: { items }, global: { stubs } })
    expect(wrapper.findComponent(PostIt).exists()).toBe(true)
    expect(wrapper.findComponent(EventTeaser).exists()).toBe(true)
    expect(wrapper.findComponent(CommunityTeaser).exists()).toBe(true)
  })

  it('emits item:select with the full metadata row when a teaser is clicked', async () => {
    const items = [makeItem('p1', 'post', 'hello')]
    const wrapper = mount(NearbyFeatures, { props: { items }, global: { stubs } })
    await wrapper.find('.user-select-none').trigger('click')
    const emitted = wrapper.emitted('item:select')
    expect(emitted).toBeTruthy()
    expect(emitted![0]![0]).toMatchObject({ id: 'p1', kind: 'post' })
  })

  it('does not render offcanvas when items is empty', () => {
    const wrapper = mount(NearbyFeatures, { props: { items: [] }, global: { stubs } })
    expect(wrapper.find('.offcanvas-stub').exists()).toBe(false)
  })
})
