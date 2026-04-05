import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockOpenUser = vi.fn()
const mockClose = vi.fn()

vi.mock('@/features/shared/composables/useOffcanvasState', () => ({
  useOffcanvasState: () => ({
    openUser: mockOpenUser,
    close: mockClose,
    userPanel: { value: 'profile' },
    userConversationId: { value: undefined },
  }),
}))

vi.mock('@/features/app/components/OwnerDrawerOrchestrator.vue', () => ({
  default: { template: '<div />' },
}))

let mockRouteName: string | undefined = 'Browse'
let mockRouteParams: Record<string, string> = {}

vi.mock('vue-router', () => ({
  useRoute: () => ({ name: mockRouteName, params: mockRouteParams }),
}))

import AuthLayout from '../AuthLayout.vue'

describe('AuthLayout route.name watcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouteName = 'Browse'
    mockRouteParams = {}
  })

  const mountLayout = () =>
    mount(AuthLayout, {
      global: {
        stubs: {
          RouterView: { template: '<div />' },
          KeepAlive: { template: '<slot />' },
        },
      },
    })

  it('calls close() immediately when on Browse', () => {
    mountLayout()
    expect(mockClose).toHaveBeenCalledOnce()
    expect(mockOpenUser).not.toHaveBeenCalled()
  })

  it('calls openUser("profile") immediately when on Me', () => {
    mockRouteName = 'Me'
    mountLayout()
    expect(mockOpenUser).toHaveBeenCalledWith('profile')
    expect(mockClose).not.toHaveBeenCalled()
  })

  it('calls openUser("inbox") immediately when on Inbox', () => {
    mockRouteName = 'Inbox'
    mountLayout()
    expect(mockOpenUser).toHaveBeenCalledWith('inbox')
    expect(mockClose).not.toHaveBeenCalled()
  })

  it('calls openUser("inbox", conversationId) immediately when on Conversation', () => {
    mockRouteName = 'Conversation'
    mockRouteParams = { conversationId: 'conv-99' }
    mountLayout()
    expect(mockOpenUser).toHaveBeenCalledWith('inbox', 'conv-99')
    expect(mockClose).not.toHaveBeenCalled()
  })

  it('calls close() when on an unrelated route', () => {
    mockRouteName = 'PublicProfile'
    mountLayout()
    expect(mockClose).toHaveBeenCalledOnce()
  })
})
