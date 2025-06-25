import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../display/GenderSymbol.vue', () => ({ default: { template: '<div />' } }))
vi.mock('./ImageCarousel.vue', () => ({ default: { template: '<div />' } }))
vi.mock('./ActionButtons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../display/LanguageList.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../display/TagList.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../display/LocationLabel.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../display/DatingIcon.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../display/GenderPronounLabel.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../display/RelationshipTags.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../public/EditField.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../forms/PublicNameInput.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../forms/LocationSelector.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/profiles/forms/LanguageSelector.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/components/profiles/forms/TagSelectComponent.vue', () => ({ default: { template: '<div />' } }))
vi.mock('../forms/IntrotextEditor.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/images/components/ImageEditor.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/photo.svg', () => ({ default: { template: '<div />' } }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k:string)=>k }) }))

import PublicProfileComponent from '../public/PublicProfileComponent.vue'

describe('PublicProfileComponent', () => {
  it('renders profile name', () => {
    const wrapper = mount(PublicProfileComponent, {
      props: { profile: { publicName: 'Alice', languages: [], isDatingActive: true } as any, isLoading: false },
      global: { stubs: { BModal: true, BCarousel: true, BCarouselSlide: true, BButton: true, ProfileThumbnail: { template: '<div />' } } }
    })
    expect(wrapper.text()).toContain('Alice')
  })
})
