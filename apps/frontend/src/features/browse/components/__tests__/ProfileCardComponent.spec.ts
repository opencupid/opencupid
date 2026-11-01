import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/features/images/components/ProfileImage.vue', () => ({
  default: {
    name: 'ProfileImage',
    template: '<div class="profile-image-stub" />',
    props: ['profile', 'variant', 'className'],
    emits: ['load'],
  },
}))
vi.mock('@/features/shared/profiledisplay/TagList.vue', () => ({
  default: { template: '<div />', props: ['tags'] },
}))
vi.mock('@/features/shared/profiledisplay/LocationLabel.vue', () => ({
  default: {
    name: 'LocationLabel',
    template: '<div class="location-label-stub" />',
    props: ['viewerLocation', 'location', 'showCountryLabel', 'showCity', 'showOnlyForeignCountry'],
  },
}))

import ProfileCardComponent from '../ProfileCardComponent.vue'

const makeProfile = (blurhash: string | null = null, location: any = null) => ({
  id: '1',
  publicName: 'Test User',
  tags: [],
  location,
  profileImages: [
    {
      position: 0,
      variants: [{ size: 'card', url: '/img0' }],
      blurhash,
    },
  ],
})

const makeViewerProfile = () => ({
  id: 'viewer-1',
  location: { country: 'HU', cityName: 'Budapest', lat: 47.5, lon: 19.04 },
  tags: [],
  profileImages: [],
})

const mountCard = (
  blurhash: string | null = null,
  opts?: {
    showLocation?: boolean
    viewerProfile?: any
    viewerProfileRef?: any
    profileLocation?: any
  }
) =>
  mount(ProfileCardComponent, {
    props: {
      profile: makeProfile(blurhash, opts?.profileLocation) as any,
      showLocation: opts?.showLocation,
    },
    global: opts?.viewerProfileRef
      ? { provide: { viewerProfile: opts.viewerProfileRef } }
      : opts?.viewerProfile
        ? { provide: { viewerProfile: ref(opts.viewerProfile) } }
        : undefined,
  })

describe('ProfileCardComponent', () => {
  it('renders the profile photo via ProfileImage (card variant)', () => {
    const wrapper = mountCard('LEHV6nWB2yk8pyo0adR*.7kCMdnj')
    const img = wrapper.findComponent({ name: 'ProfileImage' })
    expect(img.exists()).toBe(true)
    expect(img.props('variant')).toBe('card')
  })

  it('emits click with profile id on card click', async () => {
    const wrapper = mountCard()
    await wrapper.find('.profile-card').trigger('click')
    expect(wrapper.emitted('click')![0]).toEqual(['1'])
  })

  it('renders without error when viewerProfile is ref(null)', () => {
    const wrapper = mountCard(null, { viewerProfileRef: ref(null) })
    expect(wrapper.find('.profile-card').exists()).toBe(true)
  })

  describe('with viewerProfile provided', () => {
    it('renders without warnings when viewerProfile is injected', () => {
      const wrapper = mountCard(null, { viewerProfile: makeViewerProfile() })
      expect(wrapper.find('.profile-card').exists()).toBe(true)
    })

    it('shows LocationLabel when showLocation is true', () => {
      const profileLocation = { country: 'DE', cityName: 'Berlin', lat: 52.52, lon: 13.4 }
      const wrapper = mountCard(null, {
        showLocation: true,
        viewerProfile: makeViewerProfile(),
        profileLocation,
      })
      const locationLabel = wrapper.findComponent({ name: 'LocationLabel' })
      expect(locationLabel.exists()).toBe(true)
      expect(locationLabel.props('viewerLocation')).toEqual(makeViewerProfile().location)
    })

    it('hides LocationLabel when showLocation is false', () => {
      const wrapper = mountCard(null, {
        showLocation: false,
        viewerProfile: makeViewerProfile(),
      })
      expect(wrapper.find('.location').exists()).toBe(false)
    })
  })
})
