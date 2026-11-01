import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/interface/hide.svg', () => ({ default: { template: '<svg />' } }))
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

  it('keeps the photo area for a profile without photos even when photos are visible', () => {
    const own = mountWith(true, makeProfile('me', 0))
    expect(own.find('.carousel-stub').exists()).toBe(false)
    expect(own.find('[data-testid="no-profile-photo"]').exists()).toBe(true)
  })
})
