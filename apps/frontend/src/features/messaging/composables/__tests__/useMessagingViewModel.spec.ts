import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockFetchProfile = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/lib/bootstrap', () => ({
  useBootstrap: () => ({ bootstrap: vi.fn() }),
}))

vi.mock('@/features/messaging/stores/messageStore', () => ({
  useMessageStore: () => ({
    initialized: true,
    suppressMessageNotifications: false,
    conversations: [],
    activeConversation: null,
    isLoading: false,
    fetchConversations: vi.fn(),
    markAsRead: vi.fn(),
  }),
}))

vi.mock('@/features/interaction/composables/useInteractionsViewModel', () => ({
  useInteractionsViewModel: () => ({
    isInitialized: { value: true },
    haveMatches: { value: false },
    haveReceivedLikes: { value: false },
    matches: { value: [] },
  }),
}))

vi.mock('@/features/publicprofile/composables/usePublicProfile', () => ({
  usePublicProfile: () => ({ fetchProfile: mockFetchProfile }),
}))

import { useMessagingViewModel } from '../useMessagingViewModel'

describe('useMessagingViewModel – handleProfileSelect', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFetchProfile.mockReset()
  })

  it('sets viewingProfile when fetchProfile succeeds', async () => {
    const profile = { id: 'prof-1', publicName: 'Alice' }
    mockFetchProfile.mockResolvedValue({ success: true, data: profile })

    const { handleProfileSelect, viewingProfile } = useMessagingViewModel()
    expect(viewingProfile.value).toBeNull()

    await handleProfileSelect('prof-1')

    expect(mockFetchProfile).toHaveBeenCalledWith('prof-1')
    expect(viewingProfile.value).toEqual(profile)
  })

  it('leaves viewingProfile null when fetchProfile fails', async () => {
    mockFetchProfile.mockResolvedValue({ success: false })

    const { handleProfileSelect, viewingProfile } = useMessagingViewModel()
    await handleProfileSelect('prof-x')

    expect(viewingProfile.value).toBeNull()
  })
})
