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
      expect(store.messages.map(m => m.id)).toEqual(['m1', 'm2'])
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

      expect(store.messages.map(m => m.id)).toEqual(['m1', 'm2', 'm3', 'm4'])
      expect(store.hasMoreMessages).toBe(false)
    })
  })

