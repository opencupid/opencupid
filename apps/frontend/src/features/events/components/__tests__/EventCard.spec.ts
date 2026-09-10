import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    locale: { value: 'en' },
  }),
}))

vi.mock('@/features/userContent/stores/userContentStore', () => ({
  useUserContentStore: () => ({
    attendeesByEventId: {},
    rsvpStatusByEventId: {},
    fetchMyRsvp: vi.fn(),
    fetchAttendees: vi.fn(),
    rsvpEvent: vi.fn(),
    cancelRsvp: vi.fn(),
  }),
}))

vi.mock('@/assets/icons/interface/calendar.svg', () => ({ default: { template: '<span />' } }))
vi.mock('@/assets/icons/interface/checklist.svg', () => ({ default: { template: '<span />' } }))
vi.mock('@/features/images/components/ProfileThumbnail.vue', () => ({
  default: { template: '<div class="thumb" />' },
}))
vi.mock('@/features/userContent/components/ViewerToolbar.vue', () => ({
  default: { props: ['actions'], template: '<div class="viewer-toolbar"><slot /></div>' },
}))
vi.mock('@/features/shared/profiledisplay/LocationLabel.vue', () => ({
  default: { template: '<div class="location-label" />' },
}))
vi.mock('./EventCalendarExportDropdown.vue', () => ({
  default: { template: '<div class="cal-export" />' },
}))
vi.mock('@/features/publicprofile/components/ImageCarousel.vue', () => ({
  default: { props: ['images'], template: '<div class="carousel" />' },
}))

import EventCard from '../EventCard.vue'

const baseEvent = {
  id: 'e-1',
  kind: 'event' as const,
  content: 'Community hike this weekend',
  startsAt: new Date('2026-10-15T18:00:00Z'),
  venue: null,
  location: { country: 'HU', cityName: 'Budapest', lat: null, lon: null },
  postedBy: { id: 'p-1', publicName: 'Alice', profileImages: [] },
  isOwn: false,
  images: [],
  tags: [],
} as any

const stubs = {
  BRow: { template: '<div><slot /></div>' },
  BCol: { template: '<div><slot /></div>' },
  BButton: { template: '<button><slot /></button>' },
}

describe('EventCard', () => {
  it('exposes tag slugs on the wrapper via the data-tags attribute', () => {
    const event = {
      ...baseEvent,
      tags: [
        { id: 't1', name: 'Hiking', slug: 'hiking' },
        { id: 't2', name: 'Live Music', slug: 'live-music' },
      ],
    }
    const wrapper = mount(EventCard, { props: { event, showDetails: false }, global: { stubs } })
    expect(wrapper.get('.event-wrapper').attributes('data-tags')).toBe('hiking live-music')
  })

  it('renders an empty data-tags attribute for an untagged event', () => {
    const wrapper = mount(EventCard, {
      props: { event: baseEvent, showDetails: false },
      global: { stubs },
    })
    expect(wrapper.get('.event-wrapper').attributes('data-tags')).toBe('')
  })
})
