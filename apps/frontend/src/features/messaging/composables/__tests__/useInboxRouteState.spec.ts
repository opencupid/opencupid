import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

const mockRouteName = ref<string>('Browse')
const mockRouteParams = ref<Record<string, string>>({})

vi.mock('vue-router', () => ({
  useRoute: () => ({
    get name() {
      return mockRouteName.value
    },
    get params() {
      return mockRouteParams.value
    },
  }),
}))

import { useInboxRouteState } from '../useInboxRouteState'

describe('useInboxRouteState', () => {
  it('isActive is true on Inbox route', () => {
    mockRouteName.value = 'Inbox'
    const { isActive } = useInboxRouteState()
    expect(isActive.value).toBe(true)
  })

  it('isActive is true on Conversation route', () => {
    mockRouteName.value = 'Conversation'
    const { isActive } = useInboxRouteState()
    expect(isActive.value).toBe(true)
  })

  it('isActive is false on non-inbox routes', () => {
    mockRouteName.value = 'Me'
    const { isActive } = useInboxRouteState()
    expect(isActive.value).toBe(false)
  })

  it('conversationId returns param on Conversation route', () => {
    mockRouteName.value = 'Conversation'
    mockRouteParams.value = { conversationId: 'conv-7' }
    const { conversationId } = useInboxRouteState()
    expect(conversationId.value).toBe('conv-7')
  })

  it('conversationId is undefined on Inbox route', () => {
    mockRouteName.value = 'Inbox'
    mockRouteParams.value = {}
    const { conversationId } = useInboxRouteState()
    expect(conversationId.value).toBeUndefined()
  })
})
