import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import NameInput from '../PublicNameInput.vue'

const mountComponent = () =>
  mount(NameInput, {
    global: {
      stubs: {
        BInput: { template: '<input />' },
        BFormInvalidFeedback: { template: '<div><slot /></div>' },
        BFormFloatingLabel: { template: '<div><slot /></div>' },
      },
    },
  })

describe('NameInput', () => {
  it('updates model on input', async () => {
    const wrapper = mountComponent()

    await wrapper.setProps({ modelValue: 'John' })

    expect((wrapper.props('modelValue') as string)).toBe('John')
  })

  it('shows first-name-only hint when whitespace is entered', async () => {
    const wrapper = mountComponent()

    await wrapper.setProps({ modelValue: 'John Doe' })

    expect(wrapper.text()).toContain('profiles.forms.name_first_name_only')
  })
})
