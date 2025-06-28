import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key })
}))

import ErrorComponent from '../ErrorComponent.vue'

describe('ErrorComponent', () => {
  it('shows error message when error prop is set', () => {
    const wrapper = mount(ErrorComponent, { props: { error: 'Bad error' } })
    expect(wrapper.text()).toContain('uicomponents.error.title')
    expect(wrapper.text()).toContain('Bad error')
  })

  it('renders nothing when no error provided', () => {
    const wrapper = mount(ErrorComponent, { props: { error: null } })
    expect(wrapper.html()).toBe('<!--v-if-->')
  })
})
