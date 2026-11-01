import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/features/images/components/ImageEditor.vue', () => ({
  default: {
    name: 'ImageEditor',
    template: '<div class="image-editor-stub" />',
    props: ['store', 'minImages'],
  },
}))

import ProfilePhotoEditor from '../ProfilePhotoEditor.vue'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'
import { useProfileImageStore } from '@/features/images/stores/profileImageStore'

const setup = (hasFace: boolean, images: number) => {
  useOwnerProfileStore().profile = { id: 'me', hasFace } as any
  useProfileImageStore().images = Array.from({ length: images }, (_, i) => ({ id: `i${i}` }) as any)
  return mount(ProfilePhotoEditor)
}

describe('ProfilePhotoEditor', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('lets the last photo be removed', () => {
    const wrapper = setup(true, 1)
    expect(wrapper.findComponent({ name: 'ImageEditor' }).props('minImages')).toBe(0)
  })

  it('shows no warning when the profile has a face photo', () => {
    expect(setup(true, 1).find('[data-testid="no-face-warning"]').exists()).toBe(false)
  })

  it('warns about a missing photo', () => {
    const wrapper = setup(false, 0)
    expect(wrapper.text()).toContain('onboarding.photos_missing_warning')
  })

  it('warns about a photo without a detected face', () => {
    const wrapper = setup(false, 2)
    expect(wrapper.text()).toContain('onboarding.photos_no_face_warning')
  })
})
