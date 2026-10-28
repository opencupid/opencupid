import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive } from 'vue'

const mockStore = reactive({
  profile: null as Record<string, unknown> | null,
  isLoading: false,
  error: null,
  datingPrefs: null,
  getProfilePreview: vi.fn(),
  fetchDatingPrefs: vi.fn(),
  updateProfileScopes: vi.fn(),
  updateOwnerProfile: vi.fn(),
  persistDatingPrefs: vi.fn(),
})

vi.mock('@/features/myprofile/stores/ownerProfileStore', () => ({
  useOwnerProfileStore: () => mockStore,
}))

vi.mock('@/store/i18nStore', () => ({
  useI18nStore: () => ({ currentLanguage: 'en' }),
}))

import { useMyProfileViewModel } from '../useMyProfileViewModel'

describe('useMyProfileViewModel', () => {
  beforeEach(() => {
    mockStore.getProfilePreview.mockResolvedValue({ success: true, data: { id: 'p1' } })
  })

  it.each([
    [true, 'dating'],
    [false, 'social'],
  ])(
    'initializes scope from an already-loaded profile (isDatingActive=%s → %s)',
    async (isDatingActive, scope) => {
      mockStore.profile = { id: 'p1', isDatingActive }

      const { viewState, profilePreview } = useMyProfileViewModel(false)
      await vi.waitFor(() => expect(profilePreview.value).not.toBeNull())

      expect(viewState.currentScope).toBe(scope)
      expect(profilePreview.value?.isDatingActive).toBe(isDatingActive)
    }
  )
})
