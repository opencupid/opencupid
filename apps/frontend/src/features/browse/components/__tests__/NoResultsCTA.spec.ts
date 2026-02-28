import { vi } from 'vitest'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

const ShareDialog = {
  props: ['modelValue'],
  template: '<div class="share-dialog" :data-show="modelValue" />',
}
const BButton = { template: '<button @click="$emit(\'click\')"><slot /></button>' }
const BCloseButton = { template: '<button class="btn-close" @click="$emit(\'click\')" />' }

import NoResultsCTA from '../NoResultsCTA.vue'

describe('NoResultsCTA', () => {
  const mountCTA = () =>
    mount(NoResultsCTA, { global: { stubs: { ShareDialog, BButton, BCloseButton } } })

  it('opens share dialog when invite button is clicked', async () => {
    const wrapper = mountCTA()
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('false')
    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('invite'))!
      .trigger('click')
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('true')
  })

  it('emits close when close button is clicked', async () => {
    const wrapper = mountCTA()
    await wrapper.find('.btn-close').trigger('click')
    expect(wrapper.emitted('close')!.length).toBeGreaterThanOrEqual(1)
  })
})
