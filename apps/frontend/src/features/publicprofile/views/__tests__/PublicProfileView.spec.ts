import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { inject, defineComponent, ref, type Ref } from 'vue'

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}))
vi.mock('vue-toastification', () => ({
  useToast: () => ({ warning: vi.fn() }),
}))

const mockProfile = {
  id: '1',
  publicName: 'Test',
  location: { cityName: 'Berlin', country: 'DE' },
  isDatingActive: false,
  profileImages: [],
  tags: [],
  languages: [],
}

vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => ({
    profile: mockProfile,
  }),
}))

vi.mock('../../composables/usePublicProfile', () => ({
  usePublicProfile: () => ({
    fetchProfile: vi.fn().mockResolvedValue({}),
    refreshProfile: vi.fn(),
    blockProfile: vi.fn(),
    profile: ref({ ...mockProfile, isDatingActive: false }),
    isLoading: ref(false),
    error: ref(null),
  }),
}))

// Stub all child components to isolate the view
vi.mock('../../components/PublicProfile.vue', () => ({
  default: defineComponent({
    name: 'PublicProfileStub',
    setup() {
      const viewerProfile = inject<Ref<any>>('viewerProfile')
      return { viewerProfile }
    },
    template:
      '<div class="public-profile-stub" :data-has-viewer="!!viewerProfile" :data-viewer-id="viewerProfile?.id" />',
  }),
}))

vi.mock('@/features/shared/ui/MiddleColumn.vue', () => ({
  default: { template: '<div><slot /></div>' },
}))

import PublicProfileView from '../PublicProfileView.vue'

describe('PublicProfileView', () => {
  it('provides viewerProfile injection from owner profile store', async () => {
    const wrapper = mount(PublicProfileView, {
      props: { profileId: '123' },
    })
    await flushPromises()

    const stub = wrapper.find('.public-profile-stub')
    expect(stub.exists()).toBe(true)
    expect(stub.attributes('data-has-viewer')).toBe('true')
    expect(stub.attributes('data-viewer-id')).toBe('1')
  })
})
