import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k:string)=>k }) }))
vi.mock('@/assets/icons/interface/copy.svg', () => ({ default: { template: '<div />' } }))

const BModal = { template: '<div class="modal" :data-show="modelValue"><slot /></div>', props: ['modelValue'] }
const BFormGroup = { template: '<div><slot /></div>' }
const BFormInput = { template: '<input />', props: ['modelValue'] }
const BButton = { template: '<button @click="$emit(\'click\')"></button>' }
const UseClipboard = { template: '<div><slot :copy="() => {}" :copied="false" /></div>' }

import ShareDialog from '../ShareDialog.vue'

describe('ShareDialog', () => {
  it('binds v-model to BModal', async () => {
    const wrapper = mount(ShareDialog, {
      props: { modelValue: false },
      global: { stubs: { BModal, BFormGroup, BFormInput, BButton, UseClipboard }, config: { globalProperties: { $t: (k:string)=>k } } }
    })
    expect(wrapper.find('.modal').attributes('data-show')).toBe('false')
    await wrapper.setProps({ modelValue: true })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.modal').attributes('data-show')).toBe('true')
  })
})
