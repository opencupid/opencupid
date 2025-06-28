import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../image/ImageTag.vue', () => ({ default: { template: '<div />' } }))
vi.mock('@/features/shared/icons/DoodleIcons.vue', () => ({ default: { template: '<div />' } }))

import ImageCarousel from '../ImageCarousel.vue'

describe('ImageCarousel', () => {
  it('opens modal on image click', async () => {
    const wrapper = mount(ImageCarousel, {
      props: { profile: { profileImages: [{ url: '/img' }] } as any },
      global: {
        stubs: {
          BCarousel: true,
          BCarouselSlide: { template: '<div class="slide" @click="$emit(\'click\')"><slot /></div>' },
          BModal: true
        }
      }
    })
    ;(wrapper.vm as any).handleImageClick()
    expect((wrapper.vm as any).showModal).toBe(true)
  })
})
