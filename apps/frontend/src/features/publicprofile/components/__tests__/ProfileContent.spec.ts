import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/interface/hide.svg', () => ({ default: { template: '<svg />' } }))
vi.mock('@/assets/icons/interface/heart-filled.svg', () => ({
  default: { template: '<svg class="icon-heart" />' },
}))
vi.mock('../ImageCarousel.vue', () => ({
  default: { template: '<div class="carousel-stub" />', props: ['images'] },
}))
vi.mock('@/features/shared/profiledisplay/GenderPronounLabel.vue', () => ({
  default: { template: '<div />', props: ['profile'] },
}))
vi.mock('@/features/shared/profiledisplay/RelationshipTags.vue', () => ({
  default: { template: '<div />', props: ['profile'] },
}))
vi.mock('@/features/shared/profiledisplay/LanguageList.vue', () => ({
  default: { template: '<div />', props: ['languages'] },
}))
vi.mock('@/features/shared/profiledisplay/TagList.vue', () => ({
  default: { template: '<div />', props: ['tags'] },
}))
vi.mock('@/features/shared/profiledisplay/LocationLabel.vue', () => ({
  default: { template: '<div />' },
}))

import ProfileContent from '../ProfileContent.vue'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

const makeProfile = (id: string, images = 1) =>
  ({
    id,
    publicName: 'Someone',
    isDatingActive: false,
    languages: [],
    tags: [],
    location: { country: 'HU', cityName: null, lat: null, lon: null },
    introSocial: '',
    introDating: '',
    profileImages: Array.from({ length: images }, (_, i) => ({
      position: i,
      variants: [{ size: 'profile', url: `/img${i}` }],
    })),
  }) as any

describe('ProfileContent photo gating', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mountWith = (viewerHasFace: boolean, profile: any) => {
    useOwnerProfileStore().profile = { id: 'me', hasFace: viewerHasFace } as any
    return mount(ProfileContent, { props: { profile } })
  }

  it('shows the carousel when the viewer has a face photo', () => {
    const wrapper = mountWith(true, makeProfile('other'))
    expect(wrapper.find('.carousel-stub').exists()).toBe(true)
    expect(wrapper.find('[data-testid="hidden-profile-photo"]').exists()).toBe(false)
  })

  it('shows the placeholder instead of the carousel when the viewer has no face photo', () => {
    const wrapper = mountWith(false, makeProfile('other'))
    expect(wrapper.find('.carousel-stub').exists()).toBe(false)
    expect(wrapper.find('[data-testid="hidden-profile-photo"]').exists()).toBe(true)
  })

  it("shows the viewer's own photos regardless", () => {
    const wrapper = mountWith(false, makeProfile('me'))
    expect(wrapper.find('.carousel-stub').exists()).toBe(true)
  })

  it('shows photo-hidden.svg for a profile without photos when the viewer has no face photo', () => {
    const wrapper = mountWith(false, makeProfile('other', 0))
    expect(wrapper.find('.carousel-stub').exists()).toBe(false)
    expect(wrapper.find('[data-testid="no-profile-photo"]').exists()).toBe(true)
  })

  it('shows the empty silhouette for a profile without photos when photos are visible', () => {
    const wrapper = mountWith(true, makeProfile('other', 0))
    expect(wrapper.find('.carousel-stub').exists()).toBe(false)
    expect(wrapper.find('[data-testid="empty-profile-photo"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="no-profile-photo"]').exists()).toBe(false)
  })
})

describe('ProfileContent dating match heart', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useOwnerProfileStore().profile = { id: 'me', hasFace: true } as any
  })

  const mountWith = (isMatch?: boolean) =>
    mount(ProfileContent, {
      props: { profile: makeProfile('other'), isMatch },
      global: { mocks: { $t: (k: string) => k } },
    })

  it('shows a labelled heart after the name for a potential match', () => {
    const heart = mountWith(true).find('.match-heart')
    expect(heart.find('.icon-heart').exists()).toBe(true)
    expect(heart.attributes('aria-label')).toBe('profiles.dating_match')
    expect(heart.attributes('title')).toBe('profiles.dating_match')
  })

  it('shows no heart otherwise', () => {
    expect(mountWith(false).find('.match-heart').exists()).toBe(false)
    expect(mountWith().find('.match-heart').exists()).toBe(false)
  })
})
