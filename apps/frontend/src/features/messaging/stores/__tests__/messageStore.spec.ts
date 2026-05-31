import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ConversationSummary, MessageDTO } from '@zod/messaging/messaging.dto'

const mockApi = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}))

const mockBus = vi.hoisted(() => ({
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: mockApi,
  safeApiCall: async <T>(fn: () => Promise<T>) => fn(),
}))

vi.mock('@/lib/bus', () => ({
  bus: mockBus,
}))

import { useMessageStore } from '../messageStore'

function makeConvo(conversationId: string, partnerName: string): ConversationSummary {
  return {
    id: `participant-${conversationId}`,
    profileId: 'profile-1',
    conversationId,
    lastReadAt: new Date('2024-01-01'),
    isMuted: false,
    isArchived: false,
    isDraft: false,
    canReply: false,
    isCallable: true,
    myIsCallable: true,
    isAdminInitiator: false,
    conversation: {
      id: conversationId,
      updatedAt: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
    },
    partnerProfile: {
      id: `partner-${conversationId}`,
      publicName: partnerName,
      profileImages: [],
    },
    lastMessage: null,
  }
}

describe('messageStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('handleIncomingMessage', () => {
    it('updates canReply to true when receiving a message (fixes My turn/Their turn bug)', async () => {
      const store = useMessageStore()

      // Setup: conversation exists in store with canReply = false (initiated by current user)
      const existingConvo: ConversationSummary = {
        id: 'participant-1',
        profileId: 'profile-1',
        conversationId: 'convo-1',
        lastReadAt: new Date('2024-01-01'),
        isMuted: false,
        isArchived: false,
        isDraft: false,
        canReply: false, // User initiated, waiting for reply
        isCallable: true,
        myIsCallable: true,
        isAdminInitiator: false,
        conversation: {
          id: 'convo-1',
          updatedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
        },
        partnerProfile: {
          id: 'partner-profile-1',
          publicName: 'Partner',
          profileImages: [],
        },
        lastMessage: {
          content: 'Initial message',
          messageType: 'text/html',
          createdAt: new Date('2024-01-01'),
          isMine: true, // User sent this
        },
      }
      store.conversations = [existingConvo]

      // Incoming message from partner
      const incomingMessage: MessageDTO = {
        id: 'msg-2',
        conversationId: 'convo-1',
        senderId: 'partner-profile-1',
        content: 'Reply from partner',
        messageType: 'text/html',
        createdAt: new Date('2024-01-02'),
        isMine: false,
        images: [],
        sender: {
          id: 'partner-profile-1',
          publicName: 'Partner',
          profileImages: [],
        },
      }

      // Act: handle incoming message
      await store.handleIncomingMessage(incomingMessage)

      // Assert: canReply should now be true (conversation accepted)
      expect(store.conversations[0]!.canReply).toBe(true)
      expect(store.conversations[0]!.lastMessage?.isMine).toBe(false)
      expect(store.conversations[0]!.lastMessage?.content).toBe('Reply from partner')
    })

    it('moves conversation to top of list when receiving message', async () => {
      const store = useMessageStore()

      const convo1: ConversationSummary = {
        id: 'participant-1',
        profileId: 'profile-1',
        conversationId: 'convo-1',
        lastReadAt: new Date('2024-01-01'),
        isMuted: false,
        isArchived: false,
        isDraft: false,
        canReply: true,
        isCallable: true,
        myIsCallable: true,
        isAdminInitiator: false,
        conversation: {
          id: 'convo-1',
          updatedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
        },
        partnerProfile: {
          id: 'partner-1',
          publicName: 'Partner 1',
          profileImages: [],
        },
        lastMessage: null,
      }

      const convo2: ConversationSummary = {
        id: 'participant-2',
        profileId: 'profile-1',
        conversationId: 'convo-2',
        lastReadAt: new Date('2024-01-02'),
        isMuted: false,
        isArchived: false,
        isDraft: false,
        canReply: true,
        isCallable: true,
        myIsCallable: true,
        isAdminInitiator: false,
        conversation: {
          id: 'convo-2',
          updatedAt: new Date('2024-01-02'),
          createdAt: new Date('2024-01-02'),
        },
        partnerProfile: {
          id: 'partner-2',
          publicName: 'Partner 2',
          profileImages: [],
        },
        lastMessage: null,
      }

      store.conversations = [convo1, convo2]

      const incomingMessage: MessageDTO = {
        id: 'msg-1',
        conversationId: 'convo-2',
        senderId: 'partner-2',
        content: 'New message',
        messageType: 'text/html',
        createdAt: new Date('2024-01-03'),
        isMine: false,
        images: [],
        sender: {
          id: 'partner-2',
          publicName: 'Partner 2',
          profileImages: [],
        },
      }

      await store.handleIncomingMessage(incomingMessage)

      // convo-2 should now be at the top
      expect(store.conversations[0]!.conversationId).toBe('convo-2')
      expect(store.conversations[1]!.conversationId).toBe('convo-1')
    })

    it('emits notification for non-active conversation when suppressMessageNotifications is false', async () => {
      const store = useMessageStore()
      store.suppressMessageNotifications = false

      const convo: ConversationSummary = {
        id: 'participant-1',
        profileId: 'profile-1',
        conversationId: 'convo-1',
        lastReadAt: new Date('2024-01-01'),
        isMuted: false,
        isArchived: false,
        isDraft: false,
        canReply: true,
        isCallable: true,
        myIsCallable: true,
        isAdminInitiator: false,
        conversation: {
          id: 'convo-1',
          updatedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
        },
        partnerProfile: {
          id: 'partner-1',
          publicName: 'Partner',
          profileImages: [],
        },
        lastMessage: null,
      }
      store.conversations = [convo]
      store.activeConversation = null

      const incomingMessage: MessageDTO = {
        id: 'msg-1',
        conversationId: 'convo-1',
        senderId: 'partner-1',
        content: 'Hello',
        messageType: 'text/html',
        createdAt: new Date('2024-01-02'),
        isMine: false,
        images: [],
        sender: {
          id: 'partner-1',
          publicName: 'Partner',
          profileImages: [],
        },
      }

      await store.handleIncomingMessage(incomingMessage)

      expect(mockBus.emit).toHaveBeenCalledWith('notification:new_message', incomingMessage)
    })

    it('does not emit notification when suppressMessageNotifications is true', async () => {
      const store = useMessageStore()
      store.suppressMessageNotifications = true

      const convo: ConversationSummary = {
        id: 'participant-1',
        profileId: 'profile-1',
        conversationId: 'convo-1',
        lastReadAt: new Date('2024-01-01'),
        isMuted: false,
        isArchived: false,
        isDraft: false,
        canReply: true,
        isCallable: true,
        myIsCallable: true,
        isAdminInitiator: false,
        conversation: {
          id: 'convo-1',
          updatedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
        },
        partnerProfile: {
          id: 'partner-1',
          publicName: 'Partner',
          profileImages: [],
        },
        lastMessage: null,
      }
      store.conversations = [convo]
      store.activeConversation = null

      const incomingMessage: MessageDTO = {
        id: 'msg-1',
        conversationId: 'convo-1',
        senderId: 'partner-1',
        content: 'Hello',
        messageType: 'text/html',
        createdAt: new Date('2024-01-02'),
        isMine: false,
        images: [],
        sender: {
          id: 'partner-1',
          publicName: 'Partner',
          profileImages: [],
        },
      }

      await store.handleIncomingMessage(incomingMessage)

      expect(mockBus.emit).not.toHaveBeenCalledWith('notification:new_message', incomingMessage)
    })
  })
})

describe('bumpConversation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('moves an existing conversation to the top of the list', () => {
    const store = useMessageStore()
    const convo1 = makeConvo('convo-1', 'Partner 1')
    const convo2 = makeConvo('convo-2', 'Partner 2')
    store.conversations = [convo1, convo2]

    const updatedConvo2: ConversationSummary = { ...convo2, canReply: true }
    store.bumpConversation(updatedConvo2)

    expect(store.conversations).toHaveLength(2)
    expect(store.conversations[0]!.conversationId).toBe('convo-2')
    expect(store.conversations[1]!.conversationId).toBe('convo-1')
  })

  it('adds a new conversation to the top if not already present', () => {
    const store = useMessageStore()
    const convo1 = makeConvo('convo-1', 'Partner 1')
    store.conversations = [convo1]

    const newConvo = makeConvo('convo-new', 'New Partner')
    store.bumpConversation(newConvo)

    expect(store.conversations).toHaveLength(2)
    expect(store.conversations[0]!.conversationId).toBe('convo-new')
  })
})

describe('appendMessageIfNew', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('appends a message that does not exist yet', () => {
    const store = useMessageStore()
    store.messages = [{ id: 'msg-1' } as MessageDTO]

    store.appendMessageIfNew({ id: 'msg-2' } as MessageDTO)

    expect(store.messages.map((m) => m.id)).toEqual(['msg-1', 'msg-2'])
  })

  it('does not append a duplicate message', () => {
    const store = useMessageStore()
    store.messages = [{ id: 'msg-1' } as MessageDTO]

    store.appendMessageIfNew({ id: 'msg-1' } as MessageDTO)

    expect(store.messages).toHaveLength(1)
  })
})

describe('sendMessage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('sends a text message and bumps conversation to top', async () => {
    const store = useMessageStore()
    const otherConvo = makeConvo('convo-other', 'Other')
    const convo = makeConvo('convo-1', 'Partner')
    store.conversations = [otherConvo, convo]
    store.activeConversation = convo

    mockApi.post.mockResolvedValue({
      data: {
        success: true,
        conversation: { ...convo, lastMessage: { id: 'msg-1', content: 'Hello' } },
        message: { id: 'msg-1', conversationId: 'convo-1', content: 'Hello' },
      },
    })

    const result = await store.sendMessage('partner-convo-1', 'Hello')

    expect(result).toEqual({ success: true, data: expect.objectContaining({ id: 'msg-1' }) })
    // convo-1 was at index 1, should now be bumped to index 0
    expect(store.conversations[0]!.conversationId).toBe('convo-1')
    expect(store.conversations[1]!.conversationId).toBe('convo-other')
    expect(store.messages.map((m) => m.id)).toContain('msg-1')
    expect(store.isSending).toBe(false)
  })

  it('returns StoreError when message is null in response', async () => {
    const store = useMessageStore()
    const convo = makeConvo('convo-1', 'Partner')

    mockApi.post.mockResolvedValue({
      data: {
        success: true,
        conversation: convo,
        message: null,
      },
    })

    const result = await store.sendMessage('partner-convo-1', 'Hello')

    expect(result).toMatchObject({ success: false })
  })
})

describe('sendVoiceMessage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('sends a voice message via FormData and bumps conversation', async () => {
    const store = useMessageStore()
    const convo = makeConvo('convo-1', 'Partner')
    store.conversations = [convo]
    store.activeConversation = convo

    mockApi.post.mockResolvedValue({
      data: {
        success: true,
        conversation: { ...convo, lastMessage: { id: 'voice-1' } },
        message: { id: 'voice-1', conversationId: 'convo-1', content: '' },
      },
    })

    const blob = new Blob(['audio'], { type: 'audio/webm' })
    const result = await store.sendVoiceMessage('partner-convo-1', blob, 5)

    expect(result).toEqual({ success: true, data: expect.objectContaining({ id: 'voice-1' }) })
    expect(mockApi.post).toHaveBeenCalledWith('/messages/voice', expect.any(FormData))
    expect(store.isSending).toBe(false)
  })
})

describe('setActiveConversationById', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('fetches conversations first when store is not initialized (cold-start deep-link)', async () => {
    const store = useMessageStore()
    const convo = makeConvo('convo-1', 'Alice')

    mockApi.get.mockResolvedValue({
      data: { success: true, conversations: [convo] },
    })

    expect(store.initialized).toBe(false)
    await store.setActiveConversationById('convo-1')

    expect(mockApi.get).toHaveBeenCalledWith('/messages/conversations')
    expect(store.activeConversation?.conversationId).toBe('convo-1')
  })

  it('does not fetch conversations again when already initialized', async () => {
    const store = useMessageStore()
    const convo = makeConvo('convo-1', 'Alice')
    store.conversations = [convo]
    store.initialized = true

    mockApi.get.mockResolvedValue({
      data: { success: true, messages: [], nextCursor: null, hasMore: false },
    })

    await store.setActiveConversationById('convo-1')

    expect(mockApi.get).not.toHaveBeenCalledWith('/messages/conversations')
    expect(store.activeConversation?.conversationId).toBe('convo-1')
  })

  it('clears activeConversation when id not found after fetch', async () => {
    const store = useMessageStore()

    mockApi.get.mockResolvedValue({
      data: { success: true, conversations: [] },
    })

    await store.setActiveConversationById('nonexistent')

    expect(store.activeConversation).toBeNull()
    expect(store.messages).toEqual([])
  })
})

describe('resetActiveConversation', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  // Regression: opening a draft right after viewing another thread used to
  // render the previous thread's messages because reset only nulled
  // activeConversation. All per-thread state now resets together.
  it('clears messages and pagination state along with activeConversation', () => {
    const store = useMessageStore()
    store.activeConversation = makeConvo('convo-1', 'Alice')
    store.messages = [{ id: 'm1' } as any]
    store.messageCursor = 'cursor-1'
    store.hasMoreMessages = true
    store.isLoadingMoreMessages = true

    store.resetActiveConversation()

    expect(store.activeConversation).toBeNull()
    expect(store.messages).toEqual([])
    expect(store.messageCursor).toBeNull()
    expect(store.hasMoreMessages).toBe(false)
    expect(store.isLoadingMoreMessages).toBe(false)
  })
})

describe('teardown', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('resets all state to initial values and unsubscribes from bus', () => {
    const store = useMessageStore()

    // Dirty the store
    store.conversations = [makeConvo('convo-1', 'Partner')]
    store.messages = [{ id: 'msg-1' } as MessageDTO]
    store.activeConversation = makeConvo('convo-1', 'Partner')
    store.hasUnreadMessages = true
    store.initialized = true
    store.suppressMessageNotifications = true
    store.isSending = true
    store.isLoading = true
    store.error = { success: false, message: 'err' }
    store.messageCursor = 'cursor'
    store.hasMoreMessages = true
    store.isLoadingMoreMessages = true

    store.teardown()

    // All state should be back to initial values
    expect(store.conversations).toEqual([])
    expect(store.messages).toEqual([])
    expect(store.activeConversation).toBeNull()
    expect(store.hasUnreadMessages).toBe(false)
    expect(store.initialized).toBe(false)
    expect(store.suppressMessageNotifications).toBe(false)
    expect(store.isSending).toBe(false)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.messageCursor).toBeNull()
    expect(store.hasMoreMessages).toBe(false)
    expect(store.isLoadingMoreMessages).toBe(false)

    // Bus listeners should be removed
    expect(mockBus.off).toHaveBeenCalledWith('ws:new_message', store.handleIncomingMessage)
    expect(mockBus.off).toHaveBeenCalledWith('profile:blocked', store.handleProfileBlocked)
  })
})

describe('profile:blocked listener', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('registers profile:blocked on initialize and unregisters on teardown', async () => {
    const store = useMessageStore()

    mockApi.get.mockResolvedValue({ data: { success: true, conversations: [] } })
    await store.initialize()

    expect(mockBus.on).toHaveBeenCalledWith('profile:blocked', store.handleProfileBlocked)

    store.teardown()

    expect(mockBus.off).toHaveBeenCalledWith('profile:blocked', store.handleProfileBlocked)
  })

  it('fetches conversations when profile:blocked fires', async () => {
    const store = useMessageStore()

    mockApi.get.mockResolvedValue({
      data: { success: true, conversations: [makeConvo('c1', 'Alice')] },
    })
    await store.handleProfileBlocked()

    expect(mockApi.get).toHaveBeenCalledWith('/messages/conversations')
    expect(store.conversations[0]!.conversationId).toBe('c1')
  })
})

describe('fetchMessagesForConversation pagination', () => {
  it('loads latest 10 messages and stores cursor metadata', async () => {
    const store = useMessageStore()
    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        messages: [{ id: 'm1' }, { id: 'm2' }],
        nextCursor: 'm1',
        hasMore: true,
      },
    })

    await store.fetchMessagesForConversation('convo-1')

    expect(mockApi.get).toHaveBeenCalledWith('/messages/convo-1', {
      params: { take: 10 },
    })
    expect(store.messages.map((m) => m.id)).toEqual(['m1', 'm2'])
    expect(store.messageCursor).toBe('m1')
    expect(store.hasMoreMessages).toBe(true)
  })

  it('prepends older messages when loading more', async () => {
    const store = useMessageStore()
    store.activeConversation = { conversationId: 'convo-1' } as ConversationSummary
    store.messages = [{ id: 'm3' }, { id: 'm4' }] as MessageDTO[]
    store.hasMoreMessages = true
    store.messageCursor = 'm3'

    mockApi.get.mockResolvedValue({
      data: {
        success: true,
        messages: [{ id: 'm1' }, { id: 'm2' }],
        nextCursor: null,
        hasMore: false,
      },
    })

    await store.fetchOlderMessages()

    expect(store.messages.map((m) => m.id)).toEqual(['m1', 'm2', 'm3', 'm4'])
    expect(store.hasMoreMessages).toBe(false)
  })
})

describe('resolveConversationByProfile', () => {
  it('returns persisted conversation summary when one exists', async () => {
    const store = useMessageStore()
    const persisted = makeConvo('c1', 'Partner')
    mockApi.get.mockResolvedValue({
      data: { success: true, conversation: persisted },
    })

    const res = await store.resolveConversationByProfile('p2')

    expect(mockApi.get).toHaveBeenCalledWith('/messages/conversations/by-profile/p2')
    expect(res.success).toBe(true)
    expect(res.success && res.data?.isDraft).toBe(false)
    expect(res.success && (res.data as ConversationSummary).conversationId).toBe('c1')
  })

  it('returns draft summary when no conversation exists yet', async () => {
    const store = useMessageStore()
    const draft = {
      isDraft: true as const,
      partnerProfile: {
        id: 'p2',
        publicName: 'Partner',
        profileImages: [],
      },
      canReply: true,
      isCallable: true,
      myIsCallable: true,
    }
    mockApi.get.mockResolvedValue({
      data: { success: true, conversation: draft },
    })

    const res = await store.resolveConversationByProfile('p2')

    expect(res.success).toBe(true)
    expect(res.success && res.data?.isDraft).toBe(true)
  })

  it('does NOT mutate this.conversations on success', async () => {
    const store = useMessageStore()
    store.conversations = []
    mockApi.get.mockResolvedValue({
      data: { success: true, conversation: makeConvo('c1', 'Partner') },
    })

    await store.resolveConversationByProfile('p2')

    // Persisted resolves are read-only — they don't mass-update the inbox list.
    // Drafts likewise must never enter the list (they're not real conversations).
    expect(store.conversations).toHaveLength(0)
  })

  it('returns store error when the API call fails', async () => {
    const store = useMessageStore()
    mockApi.get.mockRejectedValue(new Error('forbidden'))

    const res = await store.resolveConversationByProfile('p2')

    expect(res.success).toBe(false)
  })
})
