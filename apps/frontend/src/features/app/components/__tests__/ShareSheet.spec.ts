import { vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

const shareFn = vi.fn().mockResolvedValue(undefined)
let mockIsSupported = { value: false }
vi.mock('@vueuse/core', () => ({
  useShare: () => ({ share: shareFn, isSupported: mockIsSupported }),
}))

let mockIsMobile = false
vi.mock('@/lib/mobile-detect', () => ({ detectMobile: () => mockIsMobile }))

import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import ShareSheet from '../ShareSheet.vue'

const BOffcanvas = {
  template: '<div class="offcanvas" :data-show="modelValue"><slot /></div>',
  props: ['modelValue'],
}
const BButton = { template: '<button @click="$emit(\'click\')"><slot /></button>' }
const ShareDialogContent = { template: '<div class="share-dialog-content" />' }

const mountSheet = (open = true) =>
  mount(ShareSheet, {
    props: {
      open,
      payload: { title: 'T', text: 'X', url: 'https://example.org' },
    },
    global: {
      stubs: { BOffcanvas, BButton, ShareDialogContent },
    },
  })

describe('ShareSheet', () => {
  beforeEach(() => {
    mockIsSupported = { value: false }
    mockIsMobile = false
    shareFn.mockClear()
  })

  it('renders the offcanvas in open state when open=true', () => {
    const wrapper = mountSheet(true)
    expect(wrapper.find('.offcanvas').attributes('data-show')).toBe('true')
  })

  it('renders the offcanvas in closed state when open=false', () => {
    const wrapper = mountSheet(false)
    expect(wrapper.find('.offcanvas').attributes('data-show')).toBe('false')
  })

  it('emits update:open(false) when offcanvas closes', async () => {
    const wrapper = mountSheet(true)
    await wrapper.findComponent(BOffcanvas).vm.$emit('update:modelValue', false)
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })
})
