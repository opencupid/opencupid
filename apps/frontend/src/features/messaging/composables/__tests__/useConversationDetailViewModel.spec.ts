import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h, ref } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'

import type { ConversationDraftSummary, ConversationSummary } from '@zod/messaging/messaging.dto'

const mockRouteName = ref<string>('Inbox')
const mockRouteParams = ref<Record<string, string>>({})

const mockRouterPush = vi.fn()
const mockRouterReplace = vi.fn()

vi.mock('vue-router', () => ({
  useRoute: () => ({
    get name() {
      return mockRouteName.value
    },
    get params() {
      return mockRouteParams.value
    },
  }),
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
}))

const mockMessageStore = {
  isLoading: false,
  conversations: [] as ConversationSummary[],
  activeConversation: null as ConversationSummary | null,
  setActiveConversationById: vi.fn(),
  setActiveConversation: vi.fn(),
  resetActiveConversation: vi.fn(),
  resolveConversationByProfile: vi.fn(),
  markAsRead: vi.fn(),
}

vi.mock('@/features/messaging/stores/messageStore', () => ({
  useMessageStore: () => mockMessageStore,
}))

const mockProfileStore = {
  isLoading: false,
  getPublicProfile: vi.fn(),
  blockProfile: vi.fn(),
}

vi.mock('@/features/publicprofile/stores/publicProfileStore', () => ({
  usePublicProfileStore: () => mockProfileStore,
}))

const mockCallStore = { initiateCall: vi.fn() }
vi.mock('@/features/videocall/stores/callStore', () => ({
  useCallStore: () => mockCallStore,
}))

vi.mock('@/features/videocall/api/calls.api', () => ({
  updateCallable: vi.fn(),
}))

import { useConversationDetailViewModel } from '../useConversationDetailViewModel'

type Vm = ReturnType<typeof useConversationDetailViewModel>

let activeWrapper: VueWrapper | null = null

function mountVm(): Vm {
  let vm!: Vm
  const Host = defineComponent({
    setup() {
      vm = useConversationDetailViewModel()
      return () => h('div')
    },
  })
  activeWrapper = mount(Host)
  return vm
}

function makePersistedSummary(
  conversationId: string,
  partnerId = 'partner-1'
): ConversationSummary {
  return {
    id: `cp-${conversationId}`,
    profileId: 'me',
    conversationId,
    lastReadAt: new Date('2024-01-01'),
    isMuted: false,
    isArchived: false,
    isDraft: false,
    canReply: true,
    isCallable: true,
    myIsCallable: true,
    isAdminInitiator: false,
    conversation: {
      id: conversationId,
      updatedAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    },
    partnerProfile: {
      id: partnerId,
      publicName: 'Partner',
      profileImages: [],
    },
    lastMessage: null,
  }
}

function makeDraftSummary(partnerId = 'partner-1'): ConversationDraftSummary {
  return {
    isDraft: true,
    partnerProfile: {
      id: partnerId,
      publicName: 'Partner',
      profileImages: [],
    },
    canReply: true,
    isCallable: true,
    myIsCallable: true,
  }
}

afterEach(() => {
  if (activeWrapper) {
    activeWrapper.unmount()
    activeWrapper = null
  }
})

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockMessageStore.activeConversation = null
  mockMessageStore.conversations = []
  mockMessageStore.setActiveConversationById.mockResolvedValue({ success: true, data: {} })
  // Like the real router, a replace switches the route the view model watches.
  mockRouterReplace.mockImplementation(({ name, params }) => {
    mockRouteName.value = name
    mockRouteParams.value = params
  })
  mockMessageStore.resolveConversationByProfile.mockResolvedValue({ success: true, data: null })
  mockProfileStore.getPublicProfile.mockResolvedValue({ success: false })
  mockProfileStore.blockProfile.mockResolvedValue({ success: true })
})

describe('useConversationDetailViewModel — detail mode', () => {
  it('loads the conversation by id and fetches the partner profile', async () => {
    mockRouteName.value = 'Conversation'
    mockRouteParams.value = { conversationId: 'c1' }

    const persisted = makePersistedSummary('c1', 'p1')
    mockMessageStore.activeConversation = persisted
    const partner = { id: 'p1', publicName: 'Partner' }
    mockProfileStore.getPublicProfile.mockResolvedValue({ success: true, data: partner })

    const vm = mountVm()
    // Flush watchers (immediate: true triggers synchronously, but the async
    // body needs the microtask queue to drain).
    await vi.waitFor(() => {
      expect(mockMessageStore.setActiveConversationById).toHaveBeenCalledWith('c1')
    })
    await vi.waitFor(() => expect(mockProfileStore.getPublicProfile).toHaveBeenCalledWith('p1'))
    expect(vm.isDraft.value).toBe(false)
    expect(vm.partner.value).toEqual(partner)
    expect(vm.loadError.value).toBeNull()
  })

  it('reports not_found when the conversation does not exist', async () => {
    mockRouteName.value = 'Conversation'
    mockRouteParams.value = { conversationId: 'gone' }
    mockMessageStore.setActiveConversationById.mockResolvedValue({
      success: false,
      status: 404,
      message: 'Conversation not found',
    })

    const vm = mountVm()
    await vi.waitFor(() => expect(vm.loadError.value).toBe('not_found'))
  })

  it('reports failed, not not_found, when the request itself fails', async () => {
    mockRouteName.value = 'Conversation'
    mockRouteParams.value = { conversationId: 'c1' }
    mockMessageStore.setActiveConversationById.mockResolvedValue({
      success: false,
      status: 500,
      message: 'Request failed',
    })

    const vm = mountVm()
    await vi.waitFor(() => expect(vm.loadError.value).toBe('failed'))
  })

  it('does not mark a conversation read once the user has left it', async () => {
    vi.useFakeTimers()
    try {
      mockRouteName.value = 'Conversation'
      mockRouteParams.value = { conversationId: 'c1' }
      mountVm()
      await vi.waitFor(() =>
        expect(mockMessageStore.setActiveConversationById).toHaveBeenCalledWith('c1')
      )
      await flushPromises()

      mockRouteName.value = 'Inbox'
      await flushPromises()
      vi.advanceTimersByTime(3000)

      expect(mockMessageStore.markAsRead).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('useConversationDetailViewModel — load errors in draft mode', () => {
  it('reports not_found when the profile cannot be messaged', async () => {
    mockRouteName.value = 'ConversationNew'
    mockRouteParams.value = { profileId: 'me' }
    mockMessageStore.resolveConversationByProfile.mockResolvedValue({
      success: false,
      status: 400,
      message: 'Cannot start a conversation with yourself',
    })

    const vm = mountVm()
    await vi.waitFor(() => expect(vm.loadError.value).toBe('not_found'))
    expect(vm.conversation.value).toBeNull()
  })
  it('ignores a failure that arrives after navigating to another conversation', async () => {
    let failOld!: (v: unknown) => void
    mockRouteName.value = 'ConversationNew'
    mockRouteParams.value = { profileId: 'gone' }
    mockMessageStore.resolveConversationByProfile.mockReturnValueOnce(
      new Promise((resolve) => (failOld = resolve))
    )

    const vm = mountVm()
    await vi.waitFor(() =>
      expect(mockMessageStore.resolveConversationByProfile).toHaveBeenCalledWith('gone')
    )

    // Navigate to a saved conversation while the old lookup is still pending.
    mockMessageStore.activeConversation = makePersistedSummary('c1', 'p1')
    mockRouteName.value = 'Conversation'
    mockRouteParams.value = { conversationId: 'c1' }
    await vi.waitFor(() =>
      expect(mockMessageStore.setActiveConversationById).toHaveBeenCalledWith('c1')
    )

    failOld({ success: false, status: 404, message: 'Profile not found' })
    await flushPromises()

    expect(vm.loadError.value).toBeNull()
    expect(mockRouterReplace).not.toHaveBeenCalled()
  })
})

describe('useConversationDetailViewModel — draft mode', () => {
  it('resolves by profileId and holds the draft summary locally', async () => {
    mockRouteName.value = 'ConversationNew'
    mockRouteParams.value = { profileId: 'p2' }

    const draft = makeDraftSummary('p2')
    mockMessageStore.resolveConversationByProfile.mockResolvedValue({
      success: true,
      data: draft,
    })
    const partner = { id: 'p2', publicName: 'Partner' }
    mockProfileStore.getPublicProfile.mockResolvedValue({ success: true, data: partner })

    const vm = mountVm()

    await vi.waitFor(() =>
      expect(mockMessageStore.resolveConversationByProfile).toHaveBeenCalledWith('p2')
    )
    await vi.waitFor(() => expect(vm.isDraft.value).toBe(true))
    expect(vm.persistedConversation.value).toBeNull()
    // Draft must NOT enter active conversation — store stays strictly persisted-only.
    expect(mockMessageStore.setActiveConversation).not.toHaveBeenCalled()
  })

  it('exposes myIsCallable from the draft summary (not the persisted-only fallback)', async () => {
    mockRouteName.value = 'ConversationNew'
    mockRouteParams.value = { profileId: 'p2' }

    const draft = { ...makeDraftSummary('p2'), myIsCallable: false }
    mockMessageStore.resolveConversationByProfile.mockResolvedValue({
      success: true,
      data: draft,
    })

    const vm = mountVm()
    await vi.waitFor(() => expect(vm.isDraft.value).toBe(true))
    expect(vm.myIsCallable.value).toBe(false)
  })

  it('redirects to the canonical Conversation route when an existing conversation is resolved', async () => {
    mockRouteName.value = 'ConversationNew'
    mockRouteParams.value = { profileId: 'p3' }

    const persisted = makePersistedSummary('c-existing', 'p3')
    mockMessageStore.resolveConversationByProfile.mockResolvedValue({
      success: true,
      data: persisted,
    })

    mountVm()

    await vi.waitFor(() =>
      expect(mockRouterReplace).toHaveBeenCalledWith({
        name: 'Conversation',
        params: { conversationId: 'c-existing' },
      })
    )
    // The detail route loads the conversation, once.
    await vi.waitFor(() =>
      expect(mockMessageStore.setActiveConversationById).toHaveBeenCalledWith('c-existing')
    )
    expect(mockMessageStore.setActiveConversationById).toHaveBeenCalledTimes(1)
    expect(mockMessageStore.setActiveConversation).not.toHaveBeenCalled()
  })
})

describe('useConversationDetailViewModel — onMessageSent draft swap', () => {
  it('swaps active conversation and replaces route once persisted summary appears', async () => {
    mockRouteName.value = 'ConversationNew'
    mockRouteParams.value = { profileId: 'p4' }
    const draft = makeDraftSummary('p4')
    mockMessageStore.resolveConversationByProfile.mockResolvedValue({
      success: true,
      data: draft,
    })

    const vm = mountVm()
    await vi.waitFor(() => expect(vm.isDraft.value).toBe(true))

    // Simulate the store having received the persisted summary from the send response.
    const persisted = makePersistedSummary('c-new', 'p4')
    mockMessageStore.conversations = [persisted]

    vm.onMessageSent()

    expect(mockRouterReplace).toHaveBeenCalledWith({
      name: 'Conversation',
      params: { conversationId: 'c-new' },
    })
    await vi.waitFor(() => expect(vm.isDraft.value).toBe(false))
    expect(mockMessageStore.setActiveConversationById).toHaveBeenCalledTimes(1)
    expect(mockMessageStore.setActiveConversationById).toHaveBeenCalledWith('c-new')
    expect(mockMessageStore.setActiveConversation).not.toHaveBeenCalled()
  })

  it('does nothing when not in draft mode', async () => {
    mockRouteName.value = 'Conversation'
    mockRouteParams.value = { conversationId: 'c1' }
    mockMessageStore.activeConversation = makePersistedSummary('c1')

    const vm = mountVm()
    vm.onMessageSent()
    expect(mockRouterReplace).not.toHaveBeenCalled()
  })
})

describe('useConversationDetailViewModel — unmount cleanup', () => {
  // Regression: clicking "Back" from ConversationDetail switches the route to
  // /inbox, which synchronously unmounts <ConversationDetail> via v-else-if in
  // InboxPanel. A watcher-based reset never gets to flush, so the cleanup must
  // run during unmount itself. Without this, the previously open conversation
  // stays highlighted as `active` in the list.
  it('resets activeConversation when the host component unmounts', async () => {
    mockRouteName.value = 'Conversation'
    mockRouteParams.value = { conversationId: 'c1' }
    mockMessageStore.activeConversation = makePersistedSummary('c1')

    const Host = defineComponent({
      setup() {
        useConversationDetailViewModel()
        return () => h('div')
      },
    })

    const wrapper = mount(Host)
    await vi.waitFor(() =>
      expect(mockMessageStore.setActiveConversationById).toHaveBeenCalledWith('c1')
    )

    wrapper.unmount()

    expect(mockMessageStore.resetActiveConversation).toHaveBeenCalled()
  })
})
