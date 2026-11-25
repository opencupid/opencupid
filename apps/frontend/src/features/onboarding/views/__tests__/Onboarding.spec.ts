import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'

const { replace, resolve, loadRouteLocation, store } = vi.hoisted(() => ({
  replace: vi.fn(),
  resolve: vi.fn((to: unknown) => to),
  loadRouteLocation: vi.fn(),
  store: {
    profile: { isOnboarded: false },
    isLoading: false,
    createOwnerProfile: vi.fn(),
  },
}))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace, resolve }),
  loadRouteLocation,
}))
vi.mock('@/lib/bootstrap', () => ({ useBootstrap: () => ({ bootstrap: async () => {} }) }))
vi.mock('@/lib/umami', () => ({ tracker: { track: vi.fn() } }))
vi.mock('@/store/i18nStore', () => ({ useI18nStore: () => ({ getLanguage: () => 'en' }) }))
vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => store,
}))
vi.mock('@/features/messaging/stores/messageStore', () => ({
  useMessageStore: () => ({ fetchConversations: vi.fn() }),
}))
const stub = vi.hoisted(() => (name: string) => ({
  default: { name, template: '<div><slot /></div>' },
}))
vi.mock('@/features/onboarding/components/OnboardWizard.vue', () => ({
  default: { name: 'OnboardWizard', emits: ['finished'], template: '<div><slot /></div>' },
}))
vi.mock('@/features/onboarding/components/OnboardingComplete.vue', () => stub('OnboardingComplete'))
vi.mock('@/features/shared/ui/MiddleColumn.vue', () => stub('MiddleColumn'))
vi.mock('@/features/shared/ui/SpinnerComponent.vue', () => stub('SpinnerComponent'))
vi.mock('@/features/shared/ui/ErrorComponent.vue', () => stub('ErrorComponent'))

import Onboarding from '../Onboarding.vue'

function mountView() {
  return shallowMount(Onboarding, {
    global: { renderStubDefaultSlot: true },
  })
}

describe('Onboarding view', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.profile.isOnboarded = false
    store.createOwnerProfile.mockResolvedValue({ success: true })
    loadRouteLocation.mockResolvedValue(undefined)
  })

  it('leaves onboarding when the loaded profile is already onboarded', async () => {
    store.profile.isOnboarded = true
    mountView()
    await flushPromises()
    expect(replace).toHaveBeenCalledWith({ name: 'Me' })
  })

  it('loads the Browse route only once the wizard is finished', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(loadRouteLocation).not.toHaveBeenCalled()

    wrapper.findComponent({ name: 'OnboardWizard' }).vm.$emit('finished')
    await flushPromises()
    expect(loadRouteLocation).toHaveBeenCalledWith({ name: 'Browse' })
    expect(replace).not.toHaveBeenCalled()
  })

  it('completes onboarding even if loading the Browse route fails', async () => {
    loadRouteLocation.mockRejectedValue(new Error('chunk'))
    const wrapper = mountView()
    wrapper.findComponent({ name: 'OnboardWizard' }).vm.$emit('finished')
    await flushPromises()
    expect(store.createOwnerProfile).toHaveBeenCalled()
  })
})
