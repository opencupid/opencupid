import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/assets/icons/interface/plus.svg', () => ({ default: { template: '<i />' } }))
vi.mock('@/assets/icons/interface/post-it.svg', () => ({ default: { template: '<i />' } }))
vi.mock('@/assets/icons/interface/community.svg', () => ({ default: { template: '<i />' } }))

import UserContentCreateSpeedDial from '../UserContentCreateSpeedDial.vue'

const BButton = {
  name: 'BButton',
  props: ['variant'],
  emits: ['click'],
  template: '<button :data-variant="variant" @click="$emit(\'click\')"><slot /></button>',
}

function mountDial() {
  return mount(UserContentCreateSpeedDial, {
    global: {
      stubs: { BButton, SpeedDial: { template: '<div><slot name="trigger" /><slot /></div>' } },
      mocks: { $t: (k: string) => k },
    },
  })
}

describe('UserContentCreateSpeedDial', () => {
  it('gives each action the solid tint of its user-content type', () => {
    const buttons = mountDial().findAll('button')
    expect(buttons.map((b) => b.attributes('data-variant'))).toEqual([
      'primary',
      'post-light',
      'event-light',
      'community-light',
    ])
  })

  it('emits the matching create event per action', async () => {
    const wrapper = mountDial()
    const [, post, event, community] = wrapper.findAll('button')
    await post!.trigger('click')
    await event!.trigger('click')
    await community!.trigger('click')
    expect(Object.keys(wrapper.emitted())).toEqual(
      expect.arrayContaining(['create:post', 'create:event', 'create:community'])
    )
  })
})
