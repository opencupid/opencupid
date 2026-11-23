import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

vi.mock('../../composables/useMyProfileViewModel', () => ({
  useMyProfileViewModel: () => ({
    formData: ref({}),
    datingPrefs: ref({}),
    updateProfile: vi.fn(),
    persistDatingPrefs: vi.fn(),
    updateScopes: vi.fn(),
  }),
}))
vi.mock('@/assets/images/app/cupid.svg', () => ({ default: { template: '<svg />' } }))

import DatingWizard from '../DatingWizard.vue'

const stubs = {
  BOverlay: { template: '<div class="overlay"><slot name="overlay" /></div>' },
  BButton: { template: '<button><slot /></button>' },
  DatingWizardStepper: { template: '<div class="stepper"><slot /></div>' },
  MatchPreview: { template: '<div class="match-preview" />' },
}

describe('DatingWizard', () => {
  it('shows the intro text and the match preview on the recap step', () => {
    const wrapper = mount(DatingWizard, {
      global: { stubs, mocks: { $t: (k: string) => k } },
    })
    expect(wrapper.find('.overlay').text()).toContain('onboarding.wizard.dating_intro_text')
    expect(wrapper.find('.stepper .match-preview').exists()).toBe(true)
  })
})
