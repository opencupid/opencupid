import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { ref, defineComponent } from 'vue'

const store = {
  currentLanguage: ref('en'),
  getAvailableLocalesWithLabels: () => [
    { value: 'en', label: 'English' },
    { value: 'de', label: 'Deutsch' }
  ]
}
vi.mock('@/store/i18nStore', () => ({ useI18nStore: () => store }))
vi.mock('@/store/i18nStore.ts', () => ({ useI18nStore: () => store }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k:string) => k }) }))

import LanguageSelectorDropdown from '../LanguageSelectorDropdown.vue'

const SelectStub = defineComponent({
  props: ['modelValue'],
  emits: ['update:modelValue'],
  template:'<select :value="modelValue" @change="onChange($event)"><slot /></select>',
  setup(_, { emit }) {
    const onChange = (e: Event) => {
      const val = (e.target as HTMLSelectElement).value
      emit('update:modelValue', val)
      changed.value = val
    }
    const changed = ref('')
    return { onChange, changed }
  }
})
const stubs = {
  BFormSelect: SelectStub,
  BFormSelectOption: defineComponent({ props:['value'], template:'<option :value="value"><slot /></option>' })
}

describe('LanguageSelectorDropdown', () => {
  it('renders provided locales', () => {
    const wrapper = mount(LanguageSelectorDropdown, { global: { stubs } })
    const options = wrapper.findAll('option')
    expect(options).toHaveLength(2)
    expect(options[0]!.text()).toBe('English')
  })

  it('updates currentLanguage on change', async () => {
    const wrapper = mount(LanguageSelectorDropdown, { global: { stubs } })
    const select = wrapper.find('select')
    select.element.value = 'de'
    await select.trigger('change')
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(SelectStub).vm.changed).toBe('de')
  })
})
