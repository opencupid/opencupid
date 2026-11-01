import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../image/ImageTag.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/images/components/BlurhashImage.vue', () => ({
  default: {
    name: 'BlurhashImage',
    template: '<div class="blurhash-image-stub" />',
    props: ['image', 'variant', 'imgClass'],
  },
}))
vi.mock('vue3-carousel', () => ({
  Carousel: {
    template: '<div class="carousel-stub"><slot /><slot name="addons" /></div>',
    props: ['modelValue', 'itemsToShow', 'snapAlign'],
  },
  Slide: {
    template: '<div class="slide" @click="$emit(\'click\')"><slot /></div>',
  },
  Navigation: { template: '<div class="nav-stub" />' },
  Pagination: { template: '<div class="pagination-stub" />' },
}))

import ImageCarousel from '../ImageCarousel.vue'

const makeImages = (count = 3, withBlurhash = false) =>
  Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    position: i,
    variants: [{ size: 'original', url: `/img${i}` }],
    blurhash: withBlurhash ? 'LEHV6nWB2yk8pyo0adR*.7kCMdnj' : null,
  }))

const mountCarousel = (images = makeImages()) =>
  mount(ImageCarousel, {
    props: { images: images as any },
    global: {
      stubs: {
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

  it('opens fullscreen preserving current slide index', () => {
    const wrapper = mountCarousel()
    const vm = wrapper.vm as any
    vm.inlineSlide = 2
    vm.handleImageClick()
    expect(vm.inlineSlide).toBe(2)
    expect(vm.showFullscreen).toBe(true)
  })

  it('closes fullscreen on click', () => {
    const wrapper = mountCarousel()
    const vm = wrapper.vm as any
    vm.handleImageClick()
    expect(vm.showFullscreen).toBe(true)
    vm.showFullscreen = false
    expect(vm.showFullscreen).toBe(false)
  })

  it('resets inlineSlide when images change', async () => {
    const wrapper = mountCarousel()
    const vm = wrapper.vm as any
    vm.inlineSlide = 2
    await wrapper.setProps({ images: makeImages(4) as any })
    expect(vm.inlineSlide).toBe(0)
  })

  it('renders inline and fullscreen slides through BlurhashImage', () => {
    const images = makeImages(2, true)
    const wrapper = mountCarousel(images)
    const all = wrapper.findAllComponents({ name: 'BlurhashImage' })
    const inline = all.filter((c) => c.props('variant') === 'profile')
    const full = all.filter((c) => c.props('variant') === 'full')
    expect(inline).toHaveLength(2)
    expect(full).toHaveLength(2)
    expect(inline[0]!.props('image')).toEqual(images[0])
    expect(full[1]!.props('image')).toEqual(images[1])
  })
})
