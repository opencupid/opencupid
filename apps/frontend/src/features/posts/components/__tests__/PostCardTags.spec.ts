import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k }),
}))

vi.mock('@/features/shared/ui/PostIt.vue', () => ({
  default: {
    props: ['id', 'variant'],
    template: '<div class="post-it"><slot name="header" /><slot /></div>',
  },
}))
vi.mock('./PostTypeBadge.vue', () => ({
  default: { props: ['type'], template: '<span class="post-type-badge" />' },
}))
vi.mock('@/features/images/components/ProfileThumbnail.vue', () => ({
  default: { template: '<div class="thumb" />' },
}))
vi.mock('@/features/userContent/components/ViewerToolbar.vue', () => ({
  default: { props: ['actions'], template: '<div class="viewer-toolbar"><slot /></div>' },
}))
vi.mock('@/features/shared/profiledisplay/LocationLabel.vue', () => ({
  default: { template: '<div class="location-label" />' },
}))
vi.mock('@/features/messaging/components/ContactFormPanel.vue', () => ({
  default: { template: '<div class="contact-form" />' },
}))
vi.mock('@/features/shared/components/LocalizedTimeAgo.vue', () => ({
  default: { template: '<span><slot :timeAgo="\'now\'" /></span>' },
}))
vi.mock('@/features/publicprofile/components/ImageCarousel.vue', () => ({
  default: { props: ['images'], template: '<div class="carousel" />' },
}))

import PostCard from '../PostCard.vue'

const basePost = {
  id: 'p-1',
  kind: 'post' as const,
  type: 'OFFER' as const,
  content: 'Fresh vegetables available',
  location: { country: 'HU', cityName: 'Budapest', lat: null, lon: null },
  postedBy: { id: 'prof-1', publicName: 'Alice', profileImages: [] },
  createdAt: new Date('2026-05-13T10:00:00Z'),
  isOwn: false,
  images: [],
  tags: [],
} as any

const stubs = { BButton: { template: '<button><slot /></button>' } }

describe('PostCard data-tags', () => {
  it('exposes tag slugs on the wrapper via the data-tags attribute', () => {
    const post = {
      ...basePost,
      tags: [
        { id: 't1', name: 'Hiking', slug: 'hiking' },
        { id: 't2', name: 'Live Music', slug: 'live-music' },
      ],
    }
    const wrapper = mount(PostCard, { props: { post, showDetails: false }, global: { stubs } })
    expect(wrapper.get('.post-wrapper').attributes('data-tags')).toBe('hiking live-music')
  })

  it('renders an empty data-tags attribute for an untagged post', () => {
    const wrapper = mount(PostCard, {
      props: { post: basePost, showDetails: false },
      global: { stubs },
    })
    expect(wrapper.get('.post-wrapper').attributes('data-tags')).toBe('')
  })
})
