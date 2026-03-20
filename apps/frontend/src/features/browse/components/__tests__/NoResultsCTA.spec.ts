import { vi } from 'vitest'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

const shareFn = vi.fn().mockResolvedValue(undefined)
let mockIsSupported = false
vi.mock('@vueuse/core', () => ({
  useShare: () => ({ share: shareFn, isSupported: mockIsSupported }),
}))

import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'

const ShareDialog = {
  props: ['modelValue'],
  template: '<div class="share-dialog" :data-show="modelValue" />',
}
const BButton = { template: '<button @click="$emit(\'click\')"><slot /></button>' }

import NoResultsCTA from '../NoResultsCTA.vue'

const mountCTA = () => mount(NoResultsCTA, { global: { stubs: { ShareDialog, BButton } } })

describe('NoResultsCTA — Web Share not supported', () => {
  beforeEach(() => {
    mockIsSupported = false
    shareFn.mockClear()
  })

  it('opens share dialog when invite button is clicked', async () => {
    const wrapper = mountCTA()
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('false')
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('invite'))!
      .trigger('click')
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('true')
  })
})

describe('NoResultsCTA — Web Share supported', () => {
  beforeEach(() => {
    mockIsSupported = true
    shareFn.mockClear()
  })

  it('calls share() and does not open modal when invite button is clicked', async () => {
    const wrapper = mountCTA()
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('invite'))!
      .trigger('click')
    expect(shareFn).toHaveBeenCalled()
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('false')
  })

  it('opens share dialog when share() throws NotAllowedError', async () => {
    const err = new DOMException('Not allowed', 'NotAllowedError')
    shareFn.mockRejectedValueOnce(err)
    const wrapper = mountCTA()
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('invite'))!
      .trigger('click')
    await vi.runAllTimersAsync().catch(() => {})
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('true')
  })

  it('does not open share dialog when share() throws AbortError', async () => {
    const err = new DOMException('Aborted', 'AbortError')
    shareFn.mockRejectedValueOnce(err)
    const wrapper = mountCTA()
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('invite'))!
      .trigger('click')
    await vi.runAllTimersAsync().catch(() => {})
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('false')
  })
})
