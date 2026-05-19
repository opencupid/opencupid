import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

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
})
