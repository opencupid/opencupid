import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('@/lib/bootstrap', () => ({ useBootstrap: () => ({ bootstrap: vi.fn() }) }))
// Start on the recap step: the only step is 'confirm'.
vi.mock('../../composables/useWizardSteps', () => ({
  useWizardSteps: () => ({ datingWizardSteps: ref({ confirm: { state: true } }) }),
}))

import DatingWizardStepper from '../DatingWizardStepper.vue'

const mountStepper = (slots: Record<string, string> = {}) =>
  mount(DatingWizardStepper, {
    props: { modelValue: {} as any, datingPrefs: {} as any },
    slots,
    global: {
      stubs: { DatingSteps: true, BButton: { template: '<button><slot /></button>' } },
    },
  })

describe('DatingWizardStepper', () => {
  it('renders the parent-provided recap content', () => {
    const wrapper = mountStepper({ default: '<div class="recap" />' })
    expect(wrapper.find('fieldset .recap').exists()).toBe(true)
  })

  it('has no built-in recap text to flash while the parent is still loading', () => {
    const wrapper = mountStepper()
    expect(wrapper.find('fieldset').text()).toBe('')
  })
})
