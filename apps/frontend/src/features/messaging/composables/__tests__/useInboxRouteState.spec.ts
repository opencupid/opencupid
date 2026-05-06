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

  it('isActive is true on ConversationNew route', () => {
    mockRouteName.value = 'ConversationNew'
    const { isActive } = useInboxRouteState()
    expect(isActive.value).toBe(true)
  })

  it('isActive is false on non-inbox routes', () => {
    mockRouteName.value = 'Me'
    const { isActive } = useInboxRouteState()
    expect(isActive.value).toBe(false)
  })

  it('mode is "list" on Inbox', () => {
    mockRouteName.value = 'Inbox'
    const { mode } = useInboxRouteState()
    expect(mode.value).toBe('list')
  })

  it('mode is "detail" on Conversation', () => {
    mockRouteName.value = 'Conversation'
    const { mode } = useInboxRouteState()
    expect(mode.value).toBe('detail')
  })

  it('mode is "draft" on ConversationNew', () => {
    mockRouteName.value = 'ConversationNew'
    const { mode } = useInboxRouteState()
    expect(mode.value).toBe('draft')
  })

  it('mode is null on non-inbox routes', () => {
    mockRouteName.value = 'Me'
    const { mode } = useInboxRouteState()
    expect(mode.value).toBeNull()
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

  it('partnerProfileId returns param on ConversationNew route', () => {
    mockRouteName.value = 'ConversationNew'
    mockRouteParams.value = { profileId: 'prof-9' }
    const { partnerProfileId } = useInboxRouteState()
    expect(partnerProfileId.value).toBe('prof-9')
  })

  it('partnerProfileId is undefined on Conversation route', () => {
    mockRouteName.value = 'Conversation'
    mockRouteParams.value = { conversationId: 'conv-7' }
    const { partnerProfileId } = useInboxRouteState()
    expect(partnerProfileId.value).toBeUndefined()
  })
})
