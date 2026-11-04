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
vi.mock('@/assets/icons/interface/globe.svg', () => ({
  default: { template: '<span class="icon-globe" />' },
}))
vi.mock('@/assets/icons/interface/mail.svg', () => ({
  default: { template: '<span class="icon-mail" />' },
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
    expect(wrapper.find('.community-name').text()).toContain('A welcoming community for hikers')
  })

  it('omits the location parens when the community has no location', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: { ...baseCommunity, location: null }, showDetails: true },
      global: { stubs },
    })
    expect(wrapper.find('.community-name').text()).not.toContain('(')
  })

  it('renders the description as the body when showDetails is true', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: baseCommunity, showDetails: true },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('We meet every weekend to explore trails around the city.')
  })

  // HTML collapses newlines, so the paragraph carries the global `.pre-line`
  // utility (white-space: pre-line) to keep authored paragraph breaks visible.
  it('preserves authored paragraph breaks in the description', () => {
    const wrapper = mount(CommunityCard, {
      props: {
        community: { ...baseCommunity, description: 'First para.\n\nSecond para.' },
        showDetails: true,
      },
      global: { stubs },
    })
    const body = wrapper.find('p.pre-line')
    expect(body.exists()).toBe(true)
    expect(body.element.textContent).toContain('First para.\n\nSecond para.')
  })

  it('truncates a long description when truncateText is set', () => {
    const longDescription = 'word '.repeat(60).trim() // ~300 chars, well over the 100 cap
    const wrapper = mount(CommunityCard, {
      props: {
        community: { ...baseCommunity, description: longDescription },
        showDetails: false,
        truncateText: true,
      },
      global: { stubs },
    })
    const body = wrapper.find('p.small')
    expect(body.exists()).toBe(true)
    expect(body.text().endsWith('…')).toBe(true)
    expect(body.text().length).toBeLessThan(longDescription.length)
  })

  it('shows the full description without the toolbar by default', () => {
    const longDescription = 'word '.repeat(60).trim()
    const wrapper = mount(CommunityCard, {
      props: { community: { ...baseCommunity, description: longDescription }, showDetails: false },
      global: { stubs },
    })
    expect(wrapper.find('p.small').text()).toBe(longDescription)
    expect(wrapper.find('.viewer-toolbar').exists()).toBe(false)
  })

  it('renders no body paragraph when the description is null', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: { ...baseCommunity, description: null }, showDetails: true },
      global: { stubs },
    })
    expect(wrapper.find('p.small').exists()).toBe(false)
    // The name still renders.
    expect(wrapper.find('.community-name').text()).toContain('A welcoming community for hikers')
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

  describe('contact details', () => {
    const mountWith = (contact: Record<string, string | null>) =>
      mount(CommunityCard, {
        props: {
          community: { ...baseCommunity, contactUrl: null, contactEmail: null, ...contact },
          showDetails: false,
        },
        global: { stubs },
      })

    it('renders no contact block when both fields are null', () => {
      expect(mountWith({}).find('.community-contact').exists()).toBe(false)
    })

    it('renders the website link labelled with its host', () => {
      const link = mountWith({ contactUrl: 'https://example.org/guild/page' }).find(
        'a[href="https://example.org/guild/page"]'
      )
      expect(link.text()).toBe('example.org')
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toContain('noopener')
    })

    it('renders the contact email as a mailto link', () => {
      const link = mountWith({ contactEmail: 'hello@example.org' }).find(
        'a[href="mailto:hello@example.org"]'
      )
      expect(link.text()).toBe('hello@example.org')
    })

    it('percent-encodes mailto-delimiter characters in the local part', () => {
      // '#' and '&' are valid in an email local-part but are fragment/query
      // delimiters in a mailto: URI, so an unencoded href would target the
      // wrong recipient (or drop part of the address).
      const link = mountWith({ contactEmail: 'foo#bar&baz@example.org' }).find(
        'a[href="mailto:foo%23bar%26baz@example.org"]'
      )
      expect(link.text()).toBe('foo#bar&baz@example.org')
    })

    it('renders only the field that is set', () => {
      const wrapper = mountWith({ contactEmail: 'hello@example.org' })
      expect(wrapper.find('.icon-globe').exists()).toBe(false)
      expect(wrapper.find('.icon-mail').exists()).toBe(true)
    })

    it('follows a contact link without opening the card', async () => {
      const wrapper = mountWith({ contactUrl: 'https://example.org' })
      await wrapper.find('.community-contact a').trigger('click')
      expect(wrapper.emitted('click')).toBeUndefined()
    })
  })
})
