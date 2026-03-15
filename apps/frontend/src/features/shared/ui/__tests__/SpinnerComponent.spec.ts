import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

import SpinnerComponent from '../SpinnerComponent.vue'

describe('SpinnerComponent', () => {
  it('renders spinner and loading text', () => {
    const wrapper = mount(SpinnerComponent, {
      global: {
        stubs: { BSpinner: { template: '<div />' } },
        mocks: { $t: (k: string) => k },
      },
    })
    expect(wrapper.text()).toContain('uicomponents.loading.loading')
  })
})
