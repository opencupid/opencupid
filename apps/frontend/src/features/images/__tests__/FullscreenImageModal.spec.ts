import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/assets/icons/interface/cross.svg', () => ({ default: { template: '<div />' } }))

import FullscreenImageModal from '../components/FullscreenImageModal.vue'

const BModal = {
  name: 'BModal',
  props: ['modelValue', 'modalClass', 'fullscreen', 'lazy'],
  emits: ['update:modelValue'],
  template: '<div class="modal-stub"><slot name="header-close" /><slot /></div>',
}

const mountModal = (modelValue = true) =>
  mount(FullscreenImageModal, {
    props: { modelValue },
    attrs: { teleportDisabled: true },
    slots: { default: '<img class="slotted" />' },
    global: { stubs: { BModal } },
  })

describe('FullscreenImageModal', () => {
  it('renders the slot content in a fullscreen modal', () => {
    const wrapper = mountModal()
    const modal = wrapper.findComponent({ name: 'BModal' })
    expect(modal.props('modelValue')).toBe(true)
    expect(modal.props('fullscreen')).toBe(true)
    expect(modal.props('modalClass')).toBe('fullscreen-image-modal')
    expect(wrapper.find('.slotted').exists()).toBe(true)
  })

  it('forwards extra attributes to the modal', () => {
    const modal = mountModal().findComponent({ name: 'BModal' })
    expect(modal.attributes('teleportdisabled')).toBe('true')
  })

  it('emits update:modelValue when the modal closes', async () => {
    const wrapper = mountModal()
    await wrapper.findComponent({ name: 'BModal' }).vm.$emit('update:modelValue', false)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
  })
})
