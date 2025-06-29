import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import InteractionButtons from '../components/InteractionButtons.vue'

vi.mock('@/assets/icons/interface/heart.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/cross.svg', () => ({ default: { template: '<div />' } }))
vi.mock('@/assets/icons/interface/message.svg', () => ({ default: { template: '<div />' } }))

const BButton = {
  template: `<button @click="$emit('click')" :disabled="disabled"><slot /></button>`,
  props: ['disabled']
}

describe('InteractionButtons', () => {
  it('emits events when buttons clicked', async () => {
    const wrapper = mount(InteractionButtons, {
      props: { canLike: true, canPass: true },
      global: { stubs: { BButton } }
    })

    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    await buttons[2].trigger('click')

    expect(wrapper.emitted('pass')).toBeTruthy()
    expect(wrapper.emitted('message')).toBeTruthy()
    expect(wrapper.emitted('like')).toBeTruthy()
  })

  it('disables like and pass buttons based on props', () => {
    const wrapper = mount(InteractionButtons, {
      props: { canLike: false, canPass: false },
      global: { stubs: { BButton } }
    })

    const buttons = wrapper.findAll('button')
    expect(buttons[0].attributes('disabled')).toBeDefined()
    expect(buttons[2].attributes('disabled')).toBeDefined()
  })
})
