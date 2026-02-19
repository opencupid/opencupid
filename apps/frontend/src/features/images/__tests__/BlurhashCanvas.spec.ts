import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('blurhash', () => ({
  decode: vi.fn((_hash: string, w: number, h: number) => new Uint8ClampedArray(w * h * 4)),
}))

import BlurhashCanvas from '../components/BlurhashCanvas.vue'

describe('BlurhashCanvas', () => {
  it('renders a canvas element', () => {
    const wrapper = mount(BlurhashCanvas, {
      props: { blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj' },
    })
    expect(wrapper.find('canvas').exists()).toBe(true)
  })

  it('sets canvas dimensions from props', () => {
    const wrapper = mount(BlurhashCanvas, {
      props: { blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj', width: 16, height: 16 },
    })
    const canvas = wrapper.find('canvas')
    expect(canvas.attributes('width')).toBe('16')
    expect(canvas.attributes('height')).toBe('16')
  })

  it('uses default dimensions of 32x32', () => {
    const wrapper = mount(BlurhashCanvas, {
      props: { blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj' },
    })
    const canvas = wrapper.find('canvas')
    expect(canvas.attributes('width')).toBe('32')
    expect(canvas.attributes('height')).toBe('32')
  })

  it('calls decode with correct parameters', async () => {
    const { decode } = await import('blurhash')
    mount(BlurhashCanvas, {
      props: { blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj', width: 32, height: 32 },
    })
    expect(decode).toHaveBeenCalledWith('LEHV6nWB2yk8pyo0adR*.7kCMdnj', 32, 32)
  })
})
