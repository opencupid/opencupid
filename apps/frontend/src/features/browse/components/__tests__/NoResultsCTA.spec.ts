import { vi } from 'vitest'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

const shareFn = vi.fn().mockResolvedValue(undefined)
let mockIsSupported = false
vi.mock('@vueuse/core', () => ({
  useShare: () => ({ share: shareFn, isSupported: mockIsSupported }),
}))

let mockIsMobile = false
vi.mock('@/lib/mobile-detect', () => ({ detectMobile: () => mockIsMobile }))

import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'

const ShareDialog = {
  props: ['modelValue'],
  template: '<div class="share-dialog" :data-show="modelValue" />',
}
const BButton = { template: '<button @click="$emit(\'click\')"><slot /></button>' }

import NoResultsCTA from '../NoResultsCTA.vue'

const mountCTA = () => mount(NoResultsCTA, { global: { stubs: { ShareDialog, BButton } } })

const clickInvite = (wrapper: ReturnType<typeof mountCTA>) =>
  wrapper
    .findAll('button')
    .find((b) => b.text().includes('invite'))!
    .trigger('click')

describe('NoResultsCTA — Web Share not supported', () => {
  beforeEach(() => {
    mockIsSupported = false
    shareFn.mockClear()
  })

  it('opens share dialog when invite button is clicked', async () => {
    const wrapper = mountCTA()
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('false')
    await clickInvite(wrapper)
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('true')
  })
})

describe('NoResultsCTA — Web Share supported on desktop', () => {
  beforeEach(() => {
    mockIsSupported = true
    mockIsMobile = false
    shareFn.mockClear()
  })

  it('opens share dialog directly (skips Web Share on desktop)', async () => {
    const wrapper = mountCTA()
    await clickInvite(wrapper)
    expect(shareFn).not.toHaveBeenCalled()
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('true')
  })
})

describe('NoResultsCTA — Web Share supported on mobile', () => {
  beforeEach(() => {
    mockIsSupported = true
    mockIsMobile = true
    shareFn.mockClear()
  })

  it('calls share() and does not open modal on successful share', async () => {
    const wrapper = mountCTA()
    await clickInvite(wrapper)
    expect(shareFn).toHaveBeenCalled()
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('false')
  })

  it('opens share dialog when share() throws NotAllowedError', async () => {
    shareFn.mockRejectedValueOnce(new DOMException('Not allowed', 'NotAllowedError'))
    const wrapper = mountCTA()
    await clickInvite(wrapper)
    await vi.runAllTimersAsync().catch(() => {})
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('true')
  })

  it('does not open share dialog when share() throws AbortError', async () => {
    shareFn.mockRejectedValueOnce(new DOMException('Aborted', 'AbortError'))
    const wrapper = mountCTA()
    await clickInvite(wrapper)
    await vi.runAllTimersAsync().catch(() => {})
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('false')
  })
})
