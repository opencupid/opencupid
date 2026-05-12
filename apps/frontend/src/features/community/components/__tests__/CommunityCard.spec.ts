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
vi.mock('@/features/posts/components/OwnerToolbar.vue', () => ({
  default: { template: '<div class="owner-toolbar" />' },
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
  yearFounded: 1987,
  location: { country: 'HU', cityName: 'Budapest', lat: null, lon: null },
  postedBy: { id: 'p-1', publicName: 'Alice', profileImages: [] },
  isOwn: false,
} as any

const stubs = {
  BRow: { template: '<div><slot /></div>' },
  BCol: { template: '<div><slot /></div>' },
}

describe('CommunityCard', () => {
  it('renders content text', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: baseCommunity, showDetails: true },
      global: { stubs },
    })
    expect(wrapper.text()).toContain('A welcoming community for hikers')
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

  it('renders OwnerToolbar when isOwn is true', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: { ...baseCommunity, isOwn: true, isVisible: true }, showDetails: true },
      global: { stubs },
    })
    expect(wrapper.find('.owner-toolbar').exists()).toBe(true)
  })

  it('renders viewer profile thumbnail when not isOwn', () => {
    const wrapper = mount(CommunityCard, {
      props: { community: baseCommunity, showDetails: true },
      global: { stubs },
    })
    expect(wrapper.find('.thumb').exists()).toBe(true)
  })
})
