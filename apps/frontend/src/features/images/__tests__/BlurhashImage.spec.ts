import { flushPromises, mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('../composables/useBlurhashDataUrl', () => ({
  blurhashToDataUrl: (hash: string) => `data:blur/${hash}`,
}))

import BlurhashImage from '../components/BlurhashImage.vue'

const ImageTag = {
  name: 'ImageTag',
  props: ['image', 'className', 'variant'],
  emits: ['load'],
  template: '<div class="image-tag" />',
}

const image = (blurhash: string | null = 'L0') => ({
  blurhash,
  variants: [{ size: 'card', url: '/one.webp' }],
})

const mountImage = (props: Record<string, unknown>, stub: object = ImageTag) =>
  mount(BlurhashImage, { props: props as any, global: { stubs: { ImageTag: stub } } })

describe('BlurhashImage', () => {
  it('shows the blurhash behind a transparent image until it loads, then fades it in', async () => {
    const wrapper = mountImage({ image: image(), variant: 'card', imgClass: 'fitted-image' })
    await flushPromises()
    const img = wrapper.find('.image-tag')
    expect(wrapper.attributes('style')).toContain('data:blur/L0')
    expect(img.classes()).not.toContain('loaded')

    wrapper.findComponent({ name: 'ImageTag' }).vm.$emit('load')
    await flushPromises()

    expect(img.classes()).toContain('loaded')
    expect(img.classes()).not.toContain('instant')
    // kept so the fade-in blends from the blurhash
    expect(wrapper.attributes('style')).toContain('data:blur/L0')
    expect(wrapper.emitted('load')).toHaveLength(1)
  })

  it('passes variant and imgClass to the image', () => {
    const wrapper = mountImage({ image: image(), variant: 'full', imgClass: 'fitted-image' })
    const tag = wrapper.findComponent({ name: 'ImageTag' })
    expect(tag.props('variant')).toBe('full')
    expect(tag.props('className')).toBe('fitted-image')
  })

  it('shows an already-cached image at once, without the fade', async () => {
    const Cached = {
      ...ImageTag,
      mounted(this: any) {
        Object.defineProperty(this.$el, 'complete', { value: true })
        Object.defineProperty(this.$el, 'naturalWidth', { value: 100 })
      },
    }
    const wrapper = mountImage({ image: image() }, Cached)
    await flushPromises()
    const img = wrapper.find('.image-tag')
    expect(img.classes()).toContain('loaded')
    expect(img.classes()).toContain('instant')
  })

  it('sets no background when the image has no blurhash', () => {
    const wrapper = mountImage({ image: image(null) })
    expect(wrapper.attributes('style')).toBeUndefined()
  })
})
