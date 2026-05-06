import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const mockFetchProfile = vi.fn()
const mockRouterPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
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
    mockRouterPush.mockReset()
  })

  it('returns the fetched profile when fetchProfile succeeds', async () => {
    const profile = { id: 'prof-1', publicName: 'Alice' }
    mockFetchProfile.mockResolvedValue({ success: true, data: profile })

    const { handleProfileSelect } = useMessagingViewModel()

    const result = await handleProfileSelect('prof-1')

    expect(mockFetchProfile).toHaveBeenCalledWith('prof-1')
    expect(result).toEqual(profile)
  })

  it('returns null when fetchProfile fails', async () => {
    mockFetchProfile.mockResolvedValue({ success: false })

    const { handleProfileSelect } = useMessagingViewModel()
    const result = await handleProfileSelect('prof-x')

    expect(result).toBeNull()
  })
})

describe('useMessagingViewModel – handleMatchSelect', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFetchProfile.mockReset()
    mockRouterPush.mockReset()
  })

  it('navigates to ConversationNew route with the partner profileId', () => {
    const { handleMatchSelect } = useMessagingViewModel()

    handleMatchSelect('prof-7')

    expect(mockRouterPush).toHaveBeenCalledWith({
      name: 'ConversationNew',
      params: { profileId: 'prof-7' },
    })
    // Match click no longer eagerly fetches the profile — that happens in
    // useConversationDetailViewModel after the route transition.
    expect(mockFetchProfile).not.toHaveBeenCalled()
  })
})
