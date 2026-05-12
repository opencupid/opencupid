import { vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

vi.mock('@vueuse/core', () => ({
  // Passthrough debounce so the stable-true gate fires immediately in tests.
  refDebounced: (source: { value: unknown }) => source,
}))

vi.mock('@/features/app/stores/appStore', () => ({
  useAppStore: () => mockAppStore,
}))

import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import InviteCtaShareDialog from '../InviteCtaShareDialog.vue'

const mockAppStore = { shareCtaDismissed: false }

// Stub ShareSheet so we can observe the open prop the wrapper passes down
// and emit update:open back to test the dismiss flow.
const ShareSheet = {
  template: '<div class="share-sheet" :data-open="open"><slot /></div>',
  props: ['open', 'payload'],
  emits: ['update:open'],
}

const mountWrapper = (trigger = true) =>
  mount(InviteCtaShareDialog, {
    props: {
      trigger,
      payload: { title: 'T', text: 'X', url: 'https://example.org' },
    },
    global: {
      stubs: { ShareSheet },
    },
  })

describe('InviteCtaShareDialog', () => {
  beforeEach(() => {
    mockAppStore.shareCtaDismissed = false
  })

  it('opens the share sheet when trigger is true and not dismissed', () => {
    const wrapper = mountWrapper(true)
    expect(wrapper.find('.share-sheet').attributes('data-open')).toBe('true')
  })

  it('keeps the share sheet closed when trigger is false', () => {
    const wrapper = mountWrapper(false)
    expect(wrapper.find('.share-sheet').attributes('data-open')).toBe('false')
  })

  it('keeps the share sheet closed when the CTA has been dismissed this session', () => {
    mockAppStore.shareCtaDismissed = true
    const wrapper = mountWrapper(true)
    expect(wrapper.find('.share-sheet').attributes('data-open')).toBe('false')
  })

  it('sets shareCtaDismissed when the share sheet closes', async () => {
    const wrapper = mountWrapper(true)
    await wrapper.findComponent(ShareSheet).vm.$emit('update:open', false)
    expect(mockAppStore.shareCtaDismissed).toBe(true)
  })
})
