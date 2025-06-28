import { vi } from "vitest"
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (k: string) => k }) }))
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

const ShareDialog = { template: '<div />' }
const BButton = { template: '<button @click="$emit(\'click\')"><slot /></button>' }
const BModal = { props: ['show'], template: '<div class="modal" :data-show="show"><slot /></div>' }

import NoResultsCTA from '../NoResultsCTA.vue'

describe('NoResultsCTA', () => {
  it('opens modal when button clicked', async () => {
    const wrapper = mount(NoResultsCTA, { global: { stubs: { ShareDialog, BButton, BModal } } })
    expect(wrapper.find('.modal').attributes('data-show')).toBe('false')
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.modal').attributes('data-show')).toBe('true')
  })
})
