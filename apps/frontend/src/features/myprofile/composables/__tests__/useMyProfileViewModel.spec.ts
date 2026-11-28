import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope, nextTick, reactive } from 'vue'

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

import { useMyProfileViewModel as createViewModel } from '../useMyProfileViewModel'

// Each view model watches the shared mock store; stop it after its test so it
// cannot react to the next test's changes.
let scope = effectScope()
const useMyProfileViewModel = (isEditMode: boolean) => scope.run(() => createViewModel(isEditMode))!

describe('useMyProfileViewModel', () => {
  afterEach(() => {
    scope.stop()
    scope = effectScope()
  })

  beforeEach(() => {
    mockStore.getProfilePreview.mockReset()
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

  it('fetches the preview for the current scope and again when it changes', async () => {
    mockStore.profile = { id: 'p1', isDatingActive: true }
    const { viewState } = useMyProfileViewModel(false)
    await nextTick()
    expect(mockStore.getProfilePreview).toHaveBeenLastCalledWith('p1', 'en', 'dating')

    viewState.currentScope = 'social'
    await nextTick()
    expect(mockStore.getProfilePreview).toHaveBeenLastCalledWith('p1', 'en', 'social')
  })

  it('keeps the latest scope when an earlier preview request resolves last', async () => {
    mockStore.profile = { id: 'p1', isDatingActive: false }
    let resolveFirst!: (v: unknown) => void
    mockStore.getProfilePreview
      .mockReturnValueOnce(new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce({ success: true, data: { id: 'p1', fetched: 'dating' } })

    const { viewState, profilePreview } = useMyProfileViewModel(false)
    viewState.currentScope = 'dating'
    await vi.waitFor(() => expect((profilePreview.value as any)?.fetched).toBe('dating'))

    resolveFirst({ success: true, data: { id: 'p1', fetched: 'social' } })
    await Promise.resolve()
    await nextTick()
    expect((profilePreview.value as any)?.fetched).toBe('dating')
  })

  it("never shows the previous scope's preview when the refetch fails", async () => {
    mockStore.profile = { id: 'p1', isDatingActive: true }
    mockStore.getProfilePreview.mockImplementation(async (_id, _locale, scope) =>
      scope === 'dating'
        ? { success: true, data: { id: 'p1', fetched: 'dating' } }
        : { success: false }
    )

    const { viewState, profilePreview } = useMyProfileViewModel(false)
    await vi.waitFor(() => expect((profilePreview.value as any)?.fetched).toBe('dating'))

    viewState.currentScope = 'social'
    expect(profilePreview.value).toBeNull()
    await vi.waitFor(() =>
      expect(mockStore.getProfilePreview).toHaveBeenLastCalledWith('p1', 'en', 'social')
    )
    await Promise.resolve()
    await nextTick()
    expect(profilePreview.value).toBeNull()
  })
})
