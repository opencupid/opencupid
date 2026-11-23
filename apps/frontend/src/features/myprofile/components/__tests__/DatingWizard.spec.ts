import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

const vm = {
  formData: ref({}),
  datingPrefs: ref({}),
  updateProfile: vi.fn(),
  persistDatingPrefs: vi.fn(),
  updateScopes: vi.fn(),
}
vi.mock('../../composables/useMyProfileViewModel', () => ({ useMyProfileViewModel: () => vm }))
vi.mock('@/assets/images/app/cupid.svg', () => ({ default: { template: '<svg />' } }))

import DatingWizard from '../DatingWizard.vue'

const stubs = {
  BOverlay: { template: '<div class="overlay"><slot name="overlay" /></div>' },
  BButton: { template: '<button><slot /></button>' },
  DatingWizardStepper: {
    emits: ['completed', 'finished'],
    template:
      '<div class="stepper"><slot /><i class="complete" @click="$emit(\'completed\')" /><i class="finish" @click="$emit(\'finished\')" /></div>',
  },
  MatchPreview: { template: '<div class="match-preview" />' },
}

const mountWizard = () =>
  mount(DatingWizard, { global: { stubs, mocks: { $t: (k: string) => k } } })

describe('DatingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vm.updateProfile.mockResolvedValue({ success: true })
  })

  it('shows the intro text', () => {
    expect(mountWizard().find('.overlay').text()).toContain('onboarding.wizard.dating_intro_text')
  })

  it('saves on reaching the recap, then shows the match preview', async () => {
    const wrapper = mountWizard()
    expect(wrapper.find('.match-preview').exists()).toBe(false)
    await wrapper.find('.complete').trigger('click')
    await flushPromises()
    expect(vm.updateProfile).toHaveBeenCalled()
    expect(vm.persistDatingPrefs).toHaveBeenCalled()
    expect(vm.updateScopes).toHaveBeenCalledWith({ isDatingActive: true })
    expect(wrapper.find('.match-preview').exists()).toBe(true)
  })

  it('keeps the preview hidden when saving fails', async () => {
    vm.updateProfile.mockResolvedValue({ success: false })
    const wrapper = mountWizard()
    await wrapper.find('.complete').trigger('click')
    await flushPromises()
    expect(vm.updateScopes).not.toHaveBeenCalled()
    expect(wrapper.find('.match-preview').exists()).toBe(false)
  })

  it('emits finished on Finish without saving again', async () => {
    const wrapper = mountWizard()
    await wrapper.find('.finish').trigger('click')
    expect(wrapper.emitted('finished')).toHaveLength(1)
    expect(wrapper.emitted('close')).toBeUndefined()
    expect(vm.updateProfile).not.toHaveBeenCalled()
  })
})
