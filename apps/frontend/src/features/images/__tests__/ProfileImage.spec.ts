import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/assets/icons/interface/hide.svg', () => ({ default: { template: '<svg />' } }))

import ProfileImage from '../components/ProfileImage.vue'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

const ImageTag = {
  props: ['image', 'className', 'variant'],
  template: '<div class="image-tag">{{ image.variants[0].url }}</div>',
}

const setViewer = (viewer: { id: string; hasFace: boolean }) => {
  useOwnerProfileStore().profile = viewer as any
}

const makeProfile = (url: string, id = 'other') => ({
  id,
  profileImages: [{ variants: [{ size: 'original', url }] }],
})

describe('ProfileImage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setViewer({ id: 'me', hasFace: true })
  })

  it('renders first image from profile', () => {
    const wrapper = mount(ProfileImage, {
      props: { profile: makeProfile('/one.jpg') },
      global: { stubs: { ImageTag } },
    })
    expect(wrapper.find('.image-tag').text()).toContain('/one.jpg')
  })

  it('updates when profile prop changes', async () => {
    const wrapper = mount(ProfileImage, {
      props: { profile: makeProfile('/one.jpg') },
      global: { stubs: { ImageTag } },
    })
    await wrapper.setProps({ profile: makeProfile('/two.jpg') })
    expect(wrapper.find('.image-tag').text()).toContain('/two.jpg')
  })

  it('shows the hidden-photo placeholder when the viewer has no face photo', () => {
    setViewer({ id: 'me', hasFace: false })
    const wrapper = mount(ProfileImage, {
      props: { profile: makeProfile('/one.jpg') },
      global: { stubs: { ImageTag } },
    })
    expect(wrapper.find('.image-tag').exists()).toBe(false)
    expect(wrapper.find('[data-testid="hidden-profile-photo"]').exists()).toBe(true)
  })

  it("still shows the viewer's own photo when they have no face photo", () => {
    setViewer({ id: 'me', hasFace: false })
    const wrapper = mount(ProfileImage, {
      props: { profile: makeProfile('/mine.jpg', 'me') },
      global: { stubs: { ImageTag } },
    })
    expect(wrapper.find('.image-tag').text()).toContain('/mine.jpg')
  })

  it('shows photo-hidden.svg for a profile without photos when the viewer has no face photo', () => {
    setViewer({ id: 'me', hasFace: false })
    const wrapper = mount(ProfileImage, {
      props: { profile: { id: 'other', profileImages: [] } },
      global: { stubs: { ImageTag } },
    })
    expect(wrapper.find('[data-testid="no-profile-photo"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="hidden-profile-photo"]').exists()).toBe(false)
  })

  it('renders nothing for a profile without photos when the viewer has a face photo', () => {
    const wrapper = mount(ProfileImage, {
      props: { profile: { id: 'other', profileImages: [] } },
      global: { stubs: { ImageTag } },
    })
    expect(wrapper.html()).toBe('<!--v-if-->')
  })

  it.each([true, false])(
    'forwards caller classes to the rendered image (hasFace=%s)',
    (hasFace) => {
      setViewer({ id: 'me', hasFace })
      const wrapper = mount(ProfileImage, {
        props: { profile: makeProfile('/one.jpg') },
        attrs: { class: 'card-image' },
        global: { stubs: { ImageTag } },
      })
      expect(wrapper.classes()).toContain('card-image')
    }
  )

  it('drops the old photo when the gallery becomes empty', async () => {
    setViewer({ id: 'me', hasFace: false })
    const wrapper = mount(ProfileImage, {
      props: {
        profile: {
          id: 'other',
          profileImages: [
            {
              blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
              variants: [{ size: 'original', url: '/one.jpg' }],
            },
          ],
        },
      },
      global: { stubs: { ImageTag } },
    })
    expect(wrapper.find('[data-testid="hidden-profile-photo"]').exists()).toBe(true)

    await wrapper.setProps({ profile: { id: 'other', profileImages: [] } })

    expect(wrapper.find('[data-testid="hidden-profile-photo"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="no-profile-photo"]').exists()).toBe(true)
  })
})
