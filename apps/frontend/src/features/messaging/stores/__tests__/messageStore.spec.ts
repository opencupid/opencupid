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
        canReply: false, // User initiated, waiting for reply
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
        canReply: true,
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
        canReply: true,
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
  })

  describe('message pagination', () => {
    it('loads latest messages and tracks hasMore', async () => {
      const store = useMessageStore()

      const latestMessage: MessageDTO = {
        id: 'm-latest',
        conversationId: 'convo-1',
        senderId: 'p2',
        content: 'Latest',
        messageType: 'text/html',
        createdAt: new Date('2024-01-05'),
        isMine: false,
        sender: {
          id: 'p2',
          publicName: 'Partner',
          profileImages: [],
        },
      }

      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          messages: [latestMessage],
          hasMore: true,
        },
      })

      await store.fetchMessagesForConversation('convo-1')

      expect(mockApi.get).toHaveBeenCalledWith('/messages/convo-1', {
        params: { limit: 10 },
      })
      expect(store.messages).toEqual([latestMessage])
      expect(store.messagesHasMore).toBe(true)
    })

    it('prepends older messages when loading up', async () => {
      const store = useMessageStore()

      store.activeConversation = {
        id: 'participant-1',
        profileId: 'p1',
        conversationId: 'convo-1',
        lastReadAt: new Date('2024-01-01'),
        isMuted: false,
        isArchived: false,
        canReply: true,
        conversation: {
          id: 'convo-1',
          updatedAt: new Date('2024-01-01'),
          createdAt: new Date('2024-01-01'),
        },
        partnerProfile: {
          id: 'p2',
          publicName: 'Partner',
          profileImages: [],
        },
        lastMessage: null,
      }

      const existingMessage: MessageDTO = {
        id: 'm2',
        conversationId: 'convo-1',
        senderId: 'p1',
        content: 'Existing',
        messageType: 'text/html',
        createdAt: new Date('2024-01-02T00:00:00.000Z'),
        isMine: true,
        sender: {
          id: 'p1',
          publicName: 'Me',
          profileImages: [],
        },
      }

      const olderMessage: MessageDTO = {
        id: 'm1',
        conversationId: 'convo-1',
        senderId: 'p2',
        content: 'Older',
        messageType: 'text/html',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
        isMine: false,
        sender: {
          id: 'p2',
          publicName: 'Partner',
          profileImages: [],
        },
      }

      store.messages = [existingMessage]
      store.messagesHasMore = true

      mockApi.get.mockResolvedValue({
        data: {
          success: true,
          messages: [olderMessage],
          hasMore: false,
        },
      })

      await store.loadOlderMessages()

      expect(mockApi.get).toHaveBeenCalledWith('/messages/convo-1', {
        params: {
          limit: 10,
          before: '2024-01-02T00:00:00.000Z',
        },
      })
      expect(store.messages.map(m => m.id)).toEqual(['m1', 'm2'])
      expect(store.messagesHasMore).toBe(false)
    })
  })
})
