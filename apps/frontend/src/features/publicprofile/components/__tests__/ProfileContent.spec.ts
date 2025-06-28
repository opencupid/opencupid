
import { describe, it, expect, vi } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import ProfileContent from '../ProfileContent.vue'
import type { GenderType, HasKidsType, PronounsType, RelationshipStatusType } from '@zod/generated'

import { createTestingPinia } from '@pinia/testing'
import { config } from '@vue/test-utils'

import { appCreateI18n } from '@/lib/i18n'
import type { InteractionContext } from '@zod/datinginteraction/interactionContext.dto'
const i18n = appCreateI18n()

config.global.plugins = [i18n, createTestingPinia()]



// Mock child components
vi.mock('./ImageCarousel.vue', () => ({ default: { template: '<div class="mock-image-carousel" />' } }))
vi.mock('./ActionButtons.vue', () => ({ default: { template: '<div class="mock-action-buttons" />' } }))
vi.mock('@/features/myprofile/components/EditField.vue', () => ({ default: { template: '<div class="mock-edit-field"><slot /><slot name="display" /></div>' } }))
vi.mock('@/features/shared/profileform/PublicNameInput.vue', () => ({ default: { template: '<div class="mock-public-name-input" />' } }))
vi.mock('@/features/shared/profileform/LocationSelector.vue', () => ({ default: { template: '<div class="mock-location-selector" />' } }))
vi.mock('@/features/shared/profileform/LanguageSelector.vue', () => ({ default: { template: '<div class="mock-language-selector" />' } }))
vi.mock('@/features/shared/profileform/TagSelectComponent.vue', () => ({ default: { template: '<div class="mock-tag-select" />' } }))
vi.mock('@/features/shared/profileform/IntrotextEditor.vue', () => ({ default: { template: '<div class="mock-introtext-editor" />' } }))
vi.mock('@/features/images/components/ImageEditor.vue', () => ({ default: { template: '<div class="mock-image-editor" />' } }))
vi.mock('@/features/datinginteraction/components/DatingInteractions.vue', () => ({ default: { template: '<div class="mock-dating-interactions" />' } }))
vi.mock('@/assets/icons/interface/photo.svg', () => ({ default: { template: '<svg class="mock-icon-photo" />' } }))
vi.mock('@/features/publicprofile/components/TagList.vue', () => ({ default: { template: '<div class="mock-tag-list" />' } }))
vi.mock('@/features/publicprofile/components/LanguageList.vue', () => ({ default: { template: '<div class="mock-language-list" />' } }))
vi.mock('@/features/publicprofile/components/RelationshipTags.vue', () => ({ default: { template: '<div class="mock-relationship-tags" />' } }))
vi.mock('@/features/publicprofile/components/GenderPronounLabel.vue', () => ({ default: { template: '<div class="mock-gender-pronoun-label" />' } }))
vi.mock('@/features/publicprofile/components/LocationLabel.vue', () => ({ default: { template: '<div class="mock-location-label" />' } }))

const baseProfile = {
  id: 'user-1',
  publicName: 'Test User',
  location: {
    country: 'Testland',
    cityName: 'Test City',
    cityId: null
  },
  profileImages: [
    {
      position: 0,
      altText: 'Profile image',
      url: 'https://example.com/image.jpg',
      mimeType: 'image/jpeg'
    }
  ],
  tags: [
    { id: 'tag1', slug: 'tag1', name: 'Tag 1' },
    { id: 'tag2', slug: 'tag2', name: 'Tag 2' }
  ],
  languages: ['en', 'fr'],
  introSocial: 'Hello world!',
  introDating: 'Looking for someone special.',
  isDatingActive: true as const,
  gender: 'female' as GenderType,
  pronouns: 'she/her' as PronounsType,
  relationship: 'single' as RelationshipStatusType,
  hasKids: 'no' as HasKidsType,
  birthday: new Date('1990-01-01'),
  conversation: null,
  conversationContext: {
    conversationId: null,
    haveConversation: false,
    canMessage: true,
    initiated: false,
  },
  interactionContext: {
    isMatch:false,
    canLike: true,
    canPass: true,
    likedByMe: false,
    passedByMe: false
  },
  visibility: {
    isBlocked: false,
    isHidden: false
  }
}

describe('ProfileContent.vue', () => {
  it('renders profile public name', () => {
    const wrapper = shallowMount(ProfileContent, {
      props: { profile: baseProfile, isLoading: false }
    })
    expect(wrapper.text()).toContain('Test User')
  })

  it('renders introSocial and introDating', () => {
    const wrapper = shallowMount(ProfileContent, {
      props: { profile: baseProfile, isLoading: false }
    })
    expect(wrapper.text()).toContain('Hello world!')
    expect(wrapper.text()).toContain('Looking for someone special.')
  })

  // TODO FIXME
  // it('renders tag list and language list', () => {
  //   const wrapper = shallowMount(ProfileContent, {
  //     props: { profile: baseProfile, isLoading: false }
  //   })
  //   expect(wrapper.find('.mock-tag-list').exists()).toBe(true)
  //   expect(wrapper.find('.mock-language-list').exists()).toBe(true)
  // })

  // it('renders editable placeholders if tags or introSocial are empty', () => {
  //   const profile = { ...baseProfile, tags: [], introSocial: '' }
  //   const wrapper = mount(ProfileContent, {
  //     props: { profile, isLoading: false }
  //   })
  //   expect(wrapper.html()).toContain('profiles.forms.tags_placeholder')
  //   expect(wrapper.html()).toContain('profiles.forms.intro_placeholder')
  // })

  // it('applies wrapperClass if provided', () => {
  //   const wrapper = shallowMount(ProfileContent, {
  //     props: { profile: baseProfile, isLoading: false, wrapperClass: 'custom-class' }
  //   })
  //   expect(wrapper.classes()).toContain('custom-class')
  // })

  // it('shows dating section if isDatingActive', () => {
  //   const wrapper = shallowMount(ProfileContent, {
  //     props: { profile: baseProfile, isLoading: false }
  //   })
  //   expect(wrapper.text()).toContain('Looking for someone special.')
  // })

  // it('does not show dating section if not isDatingActive', () => {
  //   const wrapper = shallowMount(ProfileContent, {
  //     props: { profile: { ...baseProfile, isDatingActive: false }, isLoading: false }
  //   })
  //   expect(wrapper.text()).not.toContain('Looking for someone special.')
  // })

  // it('renders relationship tags', () => {
  //   const wrapper = shallowMount(ProfileContent, {
  //     props: { profile: baseProfile, isLoading: false }
  //   })
  //   expect(wrapper.find('.mock-relationship-tags').exists()).toBe(true)
  // })

  // it('renders gender pronoun label', () => {
  //   const wrapper = shallowMount(ProfileContent, {
  //     props: { profile: baseProfile, isLoading: false }
  //   })
  //   expect(wrapper.find('.mock-gender-pronoun-label').exists()).toBe(true)
  // })

  // it('renders location label', () => {
  //   const wrapper = shallowMount(ProfileContent, {
  //     props: { profile: baseProfile, isLoading: false }
  //   })
  //   expect(wrapper.find('.mock-location-label').exists()).toBe(true)
  // })

  // it('renders image carousel', () => {
  //   const wrapper = shallowMount(ProfileContent, {
  //     props: { profile: baseProfile, isLoading: false }
  //   })
  //   expect(wrapper.find('.mock-image-carousel').exists()).toBe(true)
  // })

  // it('renders edit fields', () => {
  //   const wrapper = shallowMount(ProfileContent, {
  //     props: { profile: baseProfile, isLoading: false }
  //   })
  //   expect(wrapper.findAll('.mock-edit-field').length).toBeGreaterThan(0)
  // })
})
