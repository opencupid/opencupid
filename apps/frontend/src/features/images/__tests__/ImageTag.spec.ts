import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../composables/useMediaTokenRefresh', () => ({
  refreshMediaToken: vi.fn().mockResolvedValue(undefined),
}))

import ImageTag from '../components/ImageTag.vue'
import { refreshMediaToken } from '../composables/useMediaTokenRefresh'

describe('ImageTag', () => {
  beforeEach(() => {
    vi.mocked(refreshMediaToken).mockClear()
  })

  it('renders img with variant url', () => {
    const wrapper = mount(ImageTag, {
      props: { image: { variants: [{ size: 'card', url: '/path/img-card.jpg' }] } },
    })
    expect(wrapper.find('img').attributes('src')).toContain('/path/img-card.jpg')
    expect(wrapper.html()).toContain('jpg')
  })

  it('emits load event when image loads', async () => {
    const wrapper = mount(ImageTag, {
      props: { image: { variants: [{ size: 'card', url: '/path/img-card.jpg' }] } },
    })
    await wrapper.find('img').trigger('load')
    expect(wrapper.emitted('load')).toHaveLength(1)
  })

  it('refreshes media token and retries on first error', async () => {
    const wrapper = mount(ImageTag, {
      props: { image: { variants: [{ size: 'card', url: '/path/img-card.jpg' }] } },
    })

    await wrapper.find('img').trigger('error')
    await flushPromises()

    expect(refreshMediaToken).toHaveBeenCalledTimes(1)
    const src = wrapper.find('img').attributes('src')!
    expect(src).toMatch(/\/path\/img-card\.jpg\?_t=\d+/)
  })

  it('does not retry more than once without a successful load', async () => {
    const wrapper = mount(ImageTag, {
      props: { image: { variants: [{ size: 'card', url: '/path/img-card.jpg' }] } },
    })

    await wrapper.find('img').trigger('error')
    await flushPromises()
    await wrapper.find('img').trigger('error')
    await flushPromises()

    expect(refreshMediaToken).toHaveBeenCalledTimes(1)
  })

  it('resets retry guard after successful load, allowing future retries', async () => {
    const wrapper = mount(ImageTag, {
      props: { image: { variants: [{ size: 'card', url: '/path/img-card.jpg' }] } },
    })

    // First expiry cycle: error → refresh → retry
    await wrapper.find('img').trigger('error')
    await flushPromises()
    expect(refreshMediaToken).toHaveBeenCalledTimes(1)

    // Successful load resets the guard
    await wrapper.find('img').trigger('load')

    // Second expiry cycle: error → refresh → retry again
    await wrapper.find('img').trigger('error')
    await flushPromises()
    expect(refreshMediaToken).toHaveBeenCalledTimes(2)
  })
})
