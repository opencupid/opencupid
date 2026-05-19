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

vi.mock('@/assets/icons/interface/photo.svg', () => ({ default: { name: 'IconPhoto' } }))

import ContentImageButton from '../components/ContentImageButton.vue'

const stubs = {
  BFormGroup: { template: '<div><slot /></div>' },
  BButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' },
  BModal: {
    props: ['modelValue'],
    template: '<div v-if="modelValue"><slot /></div>',
  },
  ImageEditor: { template: '<div data-test="image-editor"/>' },
  ImageTag: {
    template: '<img data-test="thumb" :src="image?.variants?.[0]?.url" />',
    props: ['image', 'variant', 'className'],
  },
  IconPhoto: { template: '<span class="icon-photo"/>' },
}

describe('ContentImageButton', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('renders an Images button with label', () => {
    const wrapper = mount(ContentImageButton, {
      global: { stubs },
    })
    expect(wrapper.text()).toContain('label')
  })

  it('opens the modal with the editor when clicked', async () => {
    const wrapper = mount(ContentImageButton, {
      global: { stubs },
    })
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('[data-test="image-editor"]').exists()).toBe(true)
  })

  it('exposes getImageIds reflecting the underlying store images', async () => {
    const wrapper = mount(ContentImageButton, {
      props: { contentId: 'content-1' },
      global: { stubs },
    })
    const vm = wrapper.vm as any
    expect(vm.getImageIds()).toEqual([])
  })

  it('exposes markSaved which clears the store', async () => {
    const wrapper = mount(ContentImageButton, {
      global: { stubs },
    })
    const vm = wrapper.vm as any
    expect(typeof vm.markSaved).toBe('function')
    vm.markSaved() // should not throw on empty draft store
    expect(vm.getImageIds()).toEqual([])
  })

  it('loads images on mount when contentId is provided', async () => {
    ;(api.get as any).mockResolvedValue({ data: { success: true, images: [] } })
    mount(ContentImageButton, {
      props: { contentId: 'content-1' },
      global: { stubs },
    })
    expect(api.get).toHaveBeenCalledWith('/content/content-1/image')
  })

  it('does not load on mount in draft mode (no contentId)', async () => {
    mount(ContentImageButton, {
      global: { stubs },
    })
    expect(api.get).not.toHaveBeenCalled()
  })

  it('renders a thumbnail for each store image; clicking one opens the modal', async () => {
    ;(api.get as any).mockResolvedValue({
      data: {
        success: true,
        images: [
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
        ],
      },
    })
    const wrapper = mount(ContentImageButton, {
      props: { contentId: 'content-1' },
      global: { stubs },
    })
    await new Promise((r) => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    const thumbs = wrapper.findAll('[data-test="thumb"]')
    expect(thumbs).toHaveLength(2)

    // Clicking a thumbnail opens the modal (renders the editor)
    expect(wrapper.find('[data-test="image-editor"]').exists()).toBe(false)
    const thumbButtons = wrapper
      .findAll('button')
      .filter((b) => b.find('[data-test="thumb"]').exists())
    expect(thumbButtons.length).toBeGreaterThan(0)
    await thumbButtons[0]!.trigger('click')
    expect(wrapper.find('[data-test="image-editor"]').exists()).toBe(true)
  })
})
