import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../image/ImageTag.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/images/components/BlurhashCanvas.vue', () => ({
  default: { template: '<canvas class="blurhash-stub" />', props: ['blurhash'] },
}))
vi.mock('@/features/images/composables/useBlurhashDataUrl', () => ({
  blurhashToDataUrl: (hash: string) => `data:image/png;base64,mock-${hash}`,
}))

import ImageCarousel from '../ImageCarousel.vue'

const makeProfile = (count = 3, withBlurhash = false) => ({
  profileImages: Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    position: i,
    variants: [{ size: 'original', url: `/img${i}` }],
    blurhash: withBlurhash ? 'LEHV6nWB2yk8pyo0adR*.7kCMdnj' : null,
  })),
})

const mountCarousel = (profile = makeProfile()) =>
  mount(ImageCarousel, {
    props: { profile: profile as any },
    global: {
      stubs: {
        BCarousel: { template: '<div class="carousel-stub"><slot /></div>' },
        BCarouselSlide: {
          template:
            '<div class="slide" @click="$emit(\'click\')"><slot name="img" /><slot /></div>',
        },
        BModal: { template: '<div class="modal-stub"><slot /></div>' },
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

  it('sets background-image on fullscreen slide when blurhash is present', () => {
    const wrapper = mountCarousel(makeProfile(2, true))
    const modalSlides = wrapper.findAll('.modal-stub .slide')
    expect(modalSlides.length).toBeGreaterThan(0)
    const slideDiv = modalSlides[0]!.find('div[style]')
    expect(slideDiv.exists()).toBe(true)
    expect(slideDiv.attributes('style')).toContain('background-image')
    expect(slideDiv.attributes('style')).toContain('data:image/png')
  })

  it('does not set background-image when blurhash is null', () => {
    const wrapper = mountCarousel(makeProfile(2, false))
    const modalSlides = wrapper.findAll('.modal-stub .slide')
    expect(modalSlides.length).toBeGreaterThan(0)
    const innerDivs = modalSlides[0]!.findAll('div')
    const hasBackgroundImage = innerDivs.some((d) =>
      d.attributes('style')?.includes('background-image')
    )
    expect(hasBackgroundImage).toBe(false)
  })

  it('shows inline blurhash placeholder before image loads', () => {
    const wrapper = mountCarousel(makeProfile(2, true))
    expect(wrapper.findAll('.blurhash-stub').length).toBeGreaterThan(0)
  })

  it('hides inline blurhash placeholder after image loads', () => {
    const wrapper = mountCarousel(makeProfile(2, true))
    const vm = wrapper.vm as any
    expect(vm.loadedImages[0]).toBeUndefined()
    vm.handleImageLoad(0)
    expect(vm.loadedImages[0]).toBe(true)
  })

  it('does not show inline blurhash when hash is null', () => {
    const wrapper = mountCarousel(makeProfile(2, false))
    expect(wrapper.findAll('.blurhash-stub').length).toBe(0)
  })
})
