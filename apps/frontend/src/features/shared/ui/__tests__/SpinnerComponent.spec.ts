import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))

import SpinnerComponent from '../SpinnerComponent.vue'

describe('SpinnerComponent', () => {
  it('passes label to BSpinner', () => {
    const wrapper = mount(SpinnerComponent, {
      global: { stubs: { BSpinner: { template: '<div :label="label" />', props: ['label'] } } },
    })
    expect(wrapper.html()).toContain('label="uicomponents.spinner.spinning"')
  })
})
