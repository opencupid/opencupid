import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
import LoadingComponent from '../LoadingComponent.vue'

describe('LoadingComponent', () => {
  it('renders a spinner', () => {
    const wrapper = mount(LoadingComponent)
    expect(wrapper.find('.spinner-border').exists()).toBe(true)
  })
})
