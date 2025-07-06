import { vi } from "vitest"
vi.mock("vue-i18n", () => ({ useI18n: () => ({ t: (k: string) => k }) }))
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

const ShareDialog = { props: ['modelValue'], template: '<div class="share-dialog" :data-show="modelValue" />' }
const BButton = { template: '<button @click="$emit(\'click\')"><slot /></button>' }

import NoResultsCTA from '../NoResultsCTA.vue'

describe('NoResultsCTA', () => {
  it('opens modal when button clicked', async () => {
    const wrapper = mount(NoResultsCTA, { global: { stubs: { ShareDialog, BButton } } })
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('false')
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('.share-dialog').attributes('data-show')).toBe('true')
  })
})
