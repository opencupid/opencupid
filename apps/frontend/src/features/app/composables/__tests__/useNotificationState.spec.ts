import { describe, it, expect, vi } from 'vitest'
import { reactive } from 'vue'

const mockMessageStore = reactive({ hasUnreadMessages: false })
const mockInteractionStore = reactive({ newMatchesCount: 0, receivedLikes: [] as unknown[] })

vi.mock('@/features/messaging/stores/messageStore', () => ({
  useMessageStore: () => mockMessageStore,
}))

vi.mock('@/features/interaction/stores/useInteractionStore', () => ({
  useInteractionStore: () => mockInteractionStore,
}))

import { useNotificationState } from '../useNotificationState'

describe('useNotificationState', () => {
  it('hasNotifications is false when no messages or matches', () => {
    mockMessageStore.hasUnreadMessages = false
    mockInteractionStore.newMatchesCount = 0
    mockInteractionStore.receivedLikes = []

    const { hasNotifications } = useNotificationState()
    expect(hasNotifications.value).toBe(false)
  })

  it('hasNotifications is true when there are unread messages', () => {
    mockMessageStore.hasUnreadMessages = true
    mockInteractionStore.newMatchesCount = 0
    mockInteractionStore.receivedLikes = []

    const { hasNotifications } = useNotificationState()
    expect(hasNotifications.value).toBe(true)
  })

  it('hasNotifications is true when there are new matches', () => {
    mockMessageStore.hasUnreadMessages = false
    mockInteractionStore.newMatchesCount = 2
    mockInteractionStore.receivedLikes = []

    const { hasNotifications } = useNotificationState()
    expect(hasNotifications.value).toBe(true)
  })

  it('hasNotifications is true when there are received likes', () => {
    mockMessageStore.hasUnreadMessages = false
    mockInteractionStore.newMatchesCount = 0
    mockInteractionStore.receivedLikes = [{ id: '1' }]

    const { hasNotifications } = useNotificationState()
    expect(hasNotifications.value).toBe(true)
  })
})
