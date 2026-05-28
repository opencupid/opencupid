import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn(), patch: vi.fn() },
  safeApiCall: vi.fn((fn) => fn()),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (k: string) => k.split('.').pop() ?? k }),
}))

import AttachImageButton from '../components/AttachImageButton.vue'

const stubs = {
  ImageUpload: {
    props: ['store'],
    template: '<div data-test="image-upload" />',
  },
  ImageTag: {
    template: '<img data-test="thumb" :src="image?.variants?.[0]?.url" />',
    props: ['image', 'variant', 'className'],
  },
  FontAwesomeIcon: { template: '<span class="fa-icon"/>' },
}

const mountWith = (props: Record<string, unknown> = {}) =>
  mount(AttachImageButton, { props, global: { stubs } })

const mockImages = [
  {
    id: 'ckabcdefghijklmnopqrstu01',
    mimeType: 'image/jpeg',
    altText: '',
    position: 0,
    blurhash: 'L0',
    variants: [{ size: 'thumb', url: '/x' }],
  },
  {
    id: 'ckabcdefghijklmnopqrstu02',
    mimeType: 'image/jpeg',
    altText: '',
    position: 1,
    blurhash: 'L0',
    variants: [{ size: 'thumb', url: '/y' }],
  },
]

describe('AttachImageButton', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders the ImageUpload control', () => {
    const wrapper = mountWith()
    expect(wrapper.find('[data-test="image-upload"]').exists()).toBe(true)
  })

  it('exposes getImageIds reflecting the underlying store images', () => {
    const wrapper = mountWith({ contentId: 'content-1' })
    const vm = wrapper.vm as any
    expect(vm.getImageIds()).toEqual([])
  })

  it('exposes markSaved which clears the store', () => {
    const wrapper = mountWith()
    const vm = wrapper.vm as any
    expect(typeof vm.markSaved).toBe('function')
    vm.markSaved()
    expect(vm.getImageIds()).toEqual([])
  })

  it('loads images on mount when contentId is provided', () => {
    ;(api.get as any).mockResolvedValue({ data: { success: true, images: [] } })
    mountWith({ contentId: 'content-1' })
    expect(api.get).toHaveBeenCalledWith('/content/content-1/image')
  })

  it('does not load on mount in draft mode (no contentId)', () => {
    mountWith()
    expect(api.get).not.toHaveBeenCalled()
  })

  it('renders a thumbnail for each store image', async () => {
    ;(api.get as any).mockResolvedValue({ data: { success: true, images: mockImages } })
    const wrapper = mountWith({ contentId: 'content-1' })
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('[data-test="thumb"]')).toHaveLength(2)
  })

  it('clicking the X overlay deletes the image via DELETE /image/:id', async () => {
    ;(api.delete as any).mockResolvedValue({ data: { success: true } })
    let loadCall = 0
    ;(api.get as any).mockImplementation(() => {
      loadCall += 1
      return Promise.resolve({
        data: {
          success: true,
          images: loadCall === 1 ? mockImages : [mockImages[1]],
        },
      })
    })
    const wrapper = mountWith({ contentId: 'content-1' })
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    const xButtons = wrapper.findAll('[data-test="thumb-remove"]')
    expect(xButtons.length).toBe(2)
    await xButtons[0]!.trigger('click')
    expect(api.delete).toHaveBeenCalledWith('/image/ckabcdefghijklmnopqrstu01')
  })

  it('disables the upload control when remainingSlots is 0', async () => {
    // Use maxImages: 2 with 2 loaded images to hit the cap.
    ;(api.get as any).mockResolvedValue({ data: { success: true, images: mockImages } })
    const wrapper = mountWith({ contentId: 'content-1', maxImages: 2 })
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    const uploadWrap = wrapper.find('.attach-image-button__upload')
    expect(uploadWrap.classes()).toContain('attach-image-button__upload--disabled')
    expect(uploadWrap.attributes('aria-disabled')).toBe('true')
  })

  it('upload control is enabled when below maxImages', async () => {
    ;(api.get as any).mockResolvedValue({ data: { success: true, images: mockImages } })
    const wrapper = mountWith({ contentId: 'content-1', maxImages: 6 })
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()

    const uploadWrap = wrapper.find('.attach-image-button__upload')
    expect(uploadWrap.classes()).not.toContain('attach-image-button__upload--disabled')
    expect(uploadWrap.attributes('aria-disabled')).toBe('false')
  })
})
