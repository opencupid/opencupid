import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

const mockHasUnreadMessages = ref(false)
const mockNewMatchesCount = ref(0)
const mockReceivedLikes = ref<unknown[]>([])

vi.mock('@/features/messaging/stores/messageStore', () => ({
  useMessageStore: () => ({ hasUnreadMessages: mockHasUnreadMessages }),
}))

vi.mock('@/features/interaction/stores/useInteractionStore', () => ({
  useInteractionStore: () => ({
    newMatchesCount: mockNewMatchesCount,
    receivedLikes: mockReceivedLikes,
  }),
}))

import { useNotificationState } from '../useNotificationState'

describe('useNotificationState', () => {
  it('hasNotifications is false when no messages or matches', () => {
    mockHasUnreadMessages.value = false
    mockNewMatchesCount.value = 0
    mockReceivedLikes.value = []

    const { hasNotifications } = useNotificationState()
    expect(hasNotifications.value).toBe(false)
  })

  it('hasNotifications is true when there are unread messages', () => {
    mockHasUnreadMessages.value = true
    mockNewMatchesCount.value = 0
    mockReceivedLikes.value = []

    const { hasNotifications } = useNotificationState()
    expect(hasNotifications.value).toBe(true)
  })

  it('hasNotifications is true when there are new matches', () => {
    mockHasUnreadMessages.value = false
    mockNewMatchesCount.value = 2
    mockReceivedLikes.value = []

    const { hasNotifications } = useNotificationState()
    expect(hasNotifications.value).toBe(true)
  })

  it('hasNotifications is true when there are received likes', () => {
    mockHasUnreadMessages.value = false
    mockNewMatchesCount.value = 0
    mockReceivedLikes.value = [{ id: '1' }]

    const { hasNotifications } = useNotificationState()
    expect(hasNotifications.value).toBe(true)
  })
})
