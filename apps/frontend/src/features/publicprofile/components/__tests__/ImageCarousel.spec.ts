import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../image/ImageTag.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))

import ImageCarousel from '../ImageCarousel.vue'

const makeProfile = (count = 3) => ({
  profileImages: Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    position: i,
    variants: [{ size: 'original', url: `/img${i}` }],
  })),
})

const mountCarousel = (profile = makeProfile()) =>
  mount(ImageCarousel, {
    props: { profile: profile as any },
    global: {
      stubs: {
        BCarousel: true,
        BCarouselSlide: {
          template: '<div class="slide" @click="$emit(\'click\')"><slot /></div>',
        },
        BModal: true,
      },
    },
  })

describe('ImageCarousel', () => {
  it('opens fullscreen on image click', () => {
    const wrapper = mountCarousel()
    ;(wrapper.vm as any).handleImageClick()
    expect((wrapper.vm as any).showFullscreen).toBe(true)
  })

  it('syncs fullSlide from inlineSlide on open', () => {
    const wrapper = mountCarousel()
    const vm = wrapper.vm as any
    vm.inlineSlide = 2
    vm.handleImageClick()
    expect(vm.fullSlide).toBe(2)
    expect(vm.showFullscreen).toBe(true)
  })

  it('syncs inlineSlide from fullSlide on close', () => {
    const wrapper = mountCarousel()
    const vm = wrapper.vm as any
    vm.handleImageClick()
    vm.fullSlide = 1
    vm.handleCloseClick()
    expect(vm.inlineSlide).toBe(1)
    expect(vm.showFullscreen).toBe(false)
  })

  it('resets inlineSlide when profileImages change', async () => {
    const wrapper = mountCarousel()
    const vm = wrapper.vm as any
    vm.inlineSlide = 2
    await wrapper.setProps({ profile: makeProfile(4) as any })
    expect(vm.inlineSlide).toBe(0)
  })
})
