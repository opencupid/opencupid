import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('../composables/useBlurhashDataUrl', () => ({
  blurhashToDataUrl: (hash: string) => `data:blur/${hash}`,
}))
vi.mock('@/assets/icons/interface/hide.svg', () => ({ default: { template: '<svg />' } }))

import ProfileImage from '../components/ProfileImage.vue'
import { useOwnerProfileStore } from '@/features/myprofile/stores/ownerProfileStore'

const ImageTag = {
  name: 'ImageTag',
  props: ['image', 'className', 'variant'],
  emits: ['load'],
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

  it.each([true, false])(
    'shows the empty silhouette for a profile without photos (viewer hasFace=%s)',
    (hasFace) => {
      setViewer({ id: 'me', hasFace })
      const wrapper = mount(ProfileImage, {
        props: { profile: { id: 'other', profileImages: [] } },
        global: { stubs: { ImageTag } },
      })
      expect(wrapper.find('[data-testid="empty-profile-photo"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="hidden-profile-photo"]').exists()).toBe(false)
    }
  )

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
    expect(wrapper.find('[data-testid="empty-profile-photo"]').exists()).toBe(true)
  })

  const withBlurhash = {
    id: 'other',
    profileImages: [{ blurhash: 'L0', variants: [{ size: 'original', url: '/one.jpg' }] }],
  }

  it('shows the blurhash behind a transparent photo until it loads, then fades it in', async () => {
    const wrapper = mount(ProfileImage, {
      props: { profile: withBlurhash },
      global: { stubs: { ImageTag } },
    })
    await flushPromises()
    const root = wrapper.find('.profile-image')
    const img = wrapper.find('.image-tag')
    expect(root.attributes('style')).toContain('data:blur/L0')
    expect(img.classes()).not.toContain('loaded')

    wrapper.findComponent({ name: 'ImageTag' }).vm.$emit('load')
    await flushPromises()

    expect(img.classes()).toContain('loaded')
    expect(img.classes()).not.toContain('instant')
    // kept so the fade-in blends from the blurhash
    expect(root.attributes('style')).toContain('data:blur/L0')
    expect(wrapper.emitted('load')).toHaveLength(1)
  })

  it('shows an already-cached photo at once, without the fade', async () => {
    const CachedImageTag = {
      ...ImageTag,
      mounted(this: any) {
        Object.defineProperty(this.$el, 'complete', { value: true })
        Object.defineProperty(this.$el, 'naturalWidth', { value: 100 })
      },
    }
    const wrapper = mount(ProfileImage, {
      props: { profile: withBlurhash },
      global: { stubs: { ImageTag: CachedImageTag } },
    })
    await flushPromises()
    const img = wrapper.find('.image-tag')
    expect(img.classes()).toContain('loaded')
    expect(img.classes()).toContain('instant')
  })

  it('sets no background when the photo has no blurhash', async () => {
    const wrapper = mount(ProfileImage, {
      props: { profile: makeProfile('/one.jpg') },
      global: { stubs: { ImageTag } },
    })
    await flushPromises()
    expect(wrapper.find('.profile-image').attributes('style')).toBeUndefined()
  })
})
