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

const longPost = { ...basePost, content: 'word '.repeat(60).trim() }

const mountCard = (props: { showDetails: boolean; truncateText?: boolean }) =>
  mount(PostCard, { props: { post: longPost, ...props }, global: { stubs } })

describe('PostCard truncateText', () => {
  it('shows the full content by default', () => {
    const content = mountCard({ showDetails: false }).get('.post-content')
    expect(content.text()).toBe(longPost.content)
    expect(content.classes()).not.toContain('post-content--truncated')
  })

  it('clips the content to an excerpt when truncateText is set', () => {
    const content = mountCard({ showDetails: false, truncateText: true }).get('.post-content')
    expect(content.text().endsWith('…')).toBe(true)
    expect(content.text().length).toBeLessThan(longPost.content.length)
    expect(content.classes()).toContain('post-content--truncated')
  })

  it('does not tie the toolbar to truncation', () => {
    const withoutToolbar = mountCard({ showDetails: false })
    expect(withoutToolbar.find('.viewer-toolbar').exists()).toBe(false)
    expect(withoutToolbar.get('.post-content').text()).toBe(longPost.content)

    const withToolbar = mountCard({ showDetails: true, truncateText: true })
    expect(withToolbar.find('.viewer-toolbar').exists()).toBe(true)
    expect(withToolbar.get('.post-content').classes()).toContain('post-content--truncated')
  })
})
