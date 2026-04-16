import { vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

const shareFn = vi.fn().mockResolvedValue(undefined)
let mockIsSupported = { value: false }
vi.mock('@vueuse/core', () => ({
  useShare: () => ({ share: shareFn, isSupported: mockIsSupported }),
  refDebounced: (source: { value: unknown }) => source,
}))

let mockIsMobile = false
vi.mock('@/lib/mobile-detect', () => ({ detectMobile: () => mockIsMobile }))

vi.mock('@/features/app/stores/appStore', () => ({
  useAppStore: () => mockAppStore,
}))

import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import ShareDialog from '../ShareDialog.vue'

const mockAppStore = { shareCtaDismissed: false }

const BOffcanvas = {
  template: '<div class="offcanvas" :data-show="modelValue"><slot /></div>',
  props: ['modelValue'],
}
const BButton = { template: '<button @click="$emit(\'click\')"><slot /></button>' }
const ShareDialogContent = { template: '<div class="share-dialog-content" />' }

const mountDialog = (trigger = true) =>
  mount(ShareDialog, {
    props: { trigger },
    global: {
      stubs: { BOffcanvas, BButton, ShareDialogContent },
      provide: { viewerProfile: ref(null) },
    },
  })

describe('ShareDialog', () => {
  beforeEach(() => {
    mockAppStore.shareCtaDismissed = false
    mockIsSupported = { value: false }
    mockIsMobile = false
    shareFn.mockClear()
  })

  it('shows offcanvas when trigger is true', () => {
    const wrapper = mountDialog(true)
    expect(wrapper.find('.offcanvas').attributes('data-show')).toBe('true')
  })

  it('hides offcanvas when trigger is false', () => {
    const wrapper = mountDialog(false)
    expect(wrapper.find('.offcanvas').attributes('data-show')).toBe('false')
  })

  it('hides offcanvas when shareCtaDismissed is true', () => {
    mockAppStore.shareCtaDismissed = true
    const wrapper = mountDialog(true)
    expect(wrapper.find('.offcanvas').attributes('data-show')).toBe('false')
  })

  it('sets shareCtaDismissed when offcanvas emits close', async () => {
    const wrapper = mountDialog(true)
    await wrapper.findComponent(BOffcanvas).vm.$emit('update:modelValue', false)
    expect(mockAppStore.shareCtaDismissed).toBe(true)
  })
})
