import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${JSON.stringify(p)}` : k),
    locale: { value: 'en' },
  }),
}))

vi.mock('@/assets/icons/interface/community.svg', () => ({
  default: { template: '<span class="icon-community" />' },
}))

vi.mock('@/features/images/components/ProfileThumbnail.vue', () => ({
  default: { template: '<div class="thumb" />' },
}))
vi.mock('@/features/userContent/components/ViewerToolbar.vue', () => ({
  default: {
    props: ['actions', 'copyText', 'sharePayload'],
    template:
      '<div class="viewer-toolbar" :data-actions="JSON.stringify(actions)" :data-copy-text="copyText"><slot /></div>',
  },
}))
vi.mock('@/features/shared/profiledisplay/LocationLabel.vue', () => ({
  default: { template: '<div class="location-label" />' },
}))

import CommunityCard from '../CommunityCard.vue'

const baseCommunity = {
  id: 'c-1',
  kind: 'community' as const,
  content: 'A welcoming community for hikers',
  description: 'We meet every weekend to explore trails around the city.',
  yearFounded: 1987,
  location: { country: 'HU', cityName: 'Budapest', lat: null, lon: null },
  postedBy: { id: 'p-1', publicName: 'Alice', profileImages: [] },
  isOwn: false,
  images: [],
  tags: [],
} as any

const stubs = {
  BRow: { template: '<div><slot /></div>' },
  BCol: { template: '<div><slot /></div>' },
}

describe('CommunityCard', () => {
  it('renders the name as the card heading', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: baseCommunity, showDetails: true },
      global: { stubs },
    })
    expect(wrapper.find('.community-name').text()).toBe('A welcoming community for hikers')
  })

  it('renders the description as the body when showDetails is true', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: baseCommunity, showDetails: true },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('We meet every weekend to explore trails around the city.')
  })

  it('truncates a long description in grid mode (showDetails false)', () => {
    const longDescription = 'word '.repeat(60).trim() // ~300 chars, well over the 100 cap
    const wrapper = mount(CommunityCard, {
      props: { community: { ...baseCommunity, description: longDescription }, showDetails: false },
      global: { stubs },
    })
    const body = wrapper.find('p.small')
    expect(body.exists()).toBe(true)
    expect(body.text().endsWith('…')).toBe(true)
    expect(body.text().length).toBeLessThan(longDescription.length)
  })

  it('renders no body paragraph when the description is null', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: { ...baseCommunity, description: null }, showDetails: true },
      global: { stubs },
    })
    expect(wrapper.find('p.small').exists()).toBe(false)
    // The name still renders.
    expect(wrapper.find('.community-name').text()).toBe('A welcoming community for hikers')
  })

  it('renders "Since {year}" when yearFounded is set', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: baseCommunity, showDetails: true },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('community.labels.founded_since')
    expect(wrapper.text()).toContain('1987')
  })

  it('omits the founded line when yearFounded is null', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: { ...baseCommunity, yearFounded: null }, showDetails: true },
      global: { stubs },
    })
    expect(wrapper.text()).not.toContain('community.labels.founded_since')
  })

  it('emits click with the community', async () => {
    const wrapper = mount(CommunityCard, {
      props: { community: baseCommunity, showDetails: false },
      global: { stubs },
    })
    await wrapper.find('.community-card').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
    expect(wrapper.emitted('click')?.[0]?.[0]).toMatchObject({ id: 'c-1' })
  })

  it('wires ViewerToolbar with copy + share actions and the community content as copy text', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: baseCommunity, showDetails: true },
      global: { stubs },
    })
    const toolbar = wrapper.find('.viewer-toolbar')
    expect(toolbar.exists()).toBe(true)
    expect(toolbar.attributes('data-actions')).toBe('["copy","share"]')
    expect(toolbar.attributes('data-copy-text')).toBe(baseCommunity.content)
  })

  it('renders viewer profile thumbnail when not isOwn', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: baseCommunity, showDetails: true },
      global: { stubs },
    })
    expect(wrapper.find('.thumb').exists()).toBe(true)
  })

  it('exposes tag slugs on the wrapper via the data-tags attribute', () => {
    const community = {
      ...baseCommunity,
      tags: [
        { id: 't1', name: 'Hiking', slug: 'hiking' },
        { id: 't2', name: 'Live Music', slug: 'live-music' },
      ],
    }
    const wrapper = mount(CommunityCard, {
      props: { community, showDetails: false },
      global: { stubs },
    })
    expect(wrapper.get('.community-wrapper').attributes('data-tags')).toBe('hiking live-music')
  })

  it('renders an empty data-tags attribute for an untagged community', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: baseCommunity, showDetails: false },
      global: { stubs },
    })
    expect(wrapper.get('.community-wrapper').attributes('data-tags')).toBe('')
  })
})
