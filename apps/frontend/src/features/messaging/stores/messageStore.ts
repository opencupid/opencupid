import { defineStore } from 'pinia'

import { api, safeApiCall } from '@/lib/api'
import { bus } from '@/lib/bus'

import type {
  ConversationPatch,
  ConversationSummary,
  MessageDTO,
  SendMessagePayload,
} from '@zod/messaging/messaging.dto'
import type {
  MessagesResponse,
  ConversationsResponse,
  MarkConversationReadResponse,
  SendMessageResponse,
} from '@zod/apiResponse.dto'
import { storeError, type StoreError, type StoreResponse, storeSuccess } from '@/store/helpers'

type MessageStoreState = {
  conversations: ConversationSummary[]
  messages: MessageDTO[]
  activeConversation: ConversationSummary | null
  hasUnreadMessages: boolean
  suppressMessageNotifications: boolean
  isSending: boolean
  initialized: boolean
  isLoading: boolean
  error: StoreError | null
  messageCursor: string | null
  hasMoreMessages: boolean
  isLoadingMoreMessages: boolean
}

export const useMessageStore = defineStore('message', {
  state: (): MessageStoreState => ({
    conversations: [] as ConversationSummary[],
    messages: [] as MessageDTO[],
    activeConversation: null as ConversationSummary | null,
    hasUnreadMessages: false,
    initialized: false,
    suppressMessageNotifications: false,
    isSending: false,
    isLoading: false,
    error: null,
    messageCursor: null,
    hasMoreMessages: false,
    isLoadingMoreMessages: false,
  }),

  actions: {
    async handleIncomingMessage(message: MessageDTO) {
      // Update conversation summary (and bump it to top)
      const convoIndex = this.conversations.findIndex(
        (c) => c.conversationId === message.conversationId
      )

      if (convoIndex === -1) {
        await this.fetchConversations() // Fetch conversations if not found
      } else {
        const convo = this.conversations[convoIndex]!
        // Update last message and unread count
        // When we receive a message, it means the conversation is now in ACCEPTED state
        // and we can reply (fixes bug where both "My turn" and "Their turn" badges show)
        const updatedConvo: ConversationSummary = {
          ...convo,
          lastMessage: {
            content: message.content,
            messageType: message.messageType,
            createdAt: message.createdAt,
            isMine: message.isMine,
          },
          canReply: true,
        }
        this.bumpConversation(updatedConvo)
        this.updateUnreadFlag()
      }
      // If this is the active conversation, append to visible messages
      if (this.activeConversation?.conversationId === message.conversationId) {
        this.appendMessageIfNew(message)
      } else if (!this.suppressMessageNotifications) {
        bus.emit('notification:new_message', message)
      }
    },

    appendMessageIfNew(message: MessageDTO) {
      if (!this.messages.find((m) => m.id === message.id)) {
        this.messages.push(message)
      }
    },

    bumpConversation(conversation: ConversationSummary) {
      this.conversations = [
        conversation,
        ...this.conversations.filter((c) => c.conversationId !== conversation.conversationId),
      ]
    },

    // Upsert a conversation summary into the list, bumping to top.
    upsertConversation(conversation: ConversationSummary) {
      this.bumpConversation(conversation)
    },

    // Apply a reply delta to an existing conversation entry. The server
    // already holds the canonical updatedAt; we reuse it for inbox ordering.
    applyReplyToConversation(message: MessageDTO, patch: ConversationPatch) {
      const idx = this.conversations.findIndex((c) => c.conversationId === patch.conversationId)
      // Race: convo dropped from the list while the send was in flight.
      // Ignore — no fallback fetch (see "Out of scope" in the design doc).
      if (idx === -1) return
      const existing = this.conversations[idx]!
      const updated: ConversationSummary = {
        ...existing,
        conversation: { ...existing.conversation, updatedAt: patch.updatedAt },
        lastMessage: {
          content: message.content,
          messageType: message.messageType,
          createdAt: message.createdAt,
          isMine: message.isMine,
        },
      }
      this.bumpConversation(updated)
      this.updateUnreadFlag()
      if (this.activeConversation?.conversationId === patch.conversationId) {
        this.appendMessageIfNew(message)
      }
    },

    handleSendResponse(res: { data: SendMessageResponse }): StoreResponse<MessageDTO> {
      const body = res.data
      if (body.outcome === 'reply') {
        this.applyReplyToConversation(body.message, body.conversationPatch)
      } else {
        this.upsertConversation(body.conversation)
        if (this.activeConversation?.conversationId === body.conversation.conversationId) {
          this.appendMessageIfNew(body.message)
        }
      }
      return storeSuccess(body.message)
    },

    // Update a conversation in the list
    updateConvo(convo: ConversationSummary) {
      const index = this.conversations.findIndex((c) => c.conversationId === convo.conversationId)
      if (index !== -1) {
        this.conversations[index] = convo
      } else {
        this.conversations.unshift(convo)
      }
    },

    // Check last read timestamp against last message and update unread flag
    updateUnreadFlag() {
      this.hasUnreadMessages = this.conversations
        .filter((c) => c.lastMessage?.isMine !== true)
        .some((c) => {
          const lastMessage = c.lastMessage?.createdAt || new Date(0) // Fallback to epoch if no last message
          return c.lastReadAt ? c.lastReadAt < lastMessage : true
        })
    },

    async fetchMessages(
      conversationId: string,
      options?: { take?: number; cursor?: string }
    ): Promise<StoreResponse<{ messages: MessageDTO[] }>> {
      try {
        const res = await safeApiCall(() =>
          api.get<MessagesResponse>(`/messages/${conversationId}`, {
            params: {
              take: options?.take ?? 10,
              ...(options?.cursor ? { cursor: options.cursor } : {}),
            },
          })
        )
        if (res.data.success) {
          return storeSuccess({ messages: res.data.messages })
        }
        return storeError(new Error('Failed to fetch messages'))
      } catch (error: any) {
        return storeError(error, 'Failed to fetch messages')
      }
    },

    async fetchMessagesForConversation(
      conversationId: string,
      options?: { cursor?: string; append?: boolean }
    ): Promise<MessageDTO[]> {
      try {
        const isLoadingOlder = Boolean(options?.append)
        if (isLoadingOlder) {
          this.isLoadingMoreMessages = true
        } else {
          this.isLoading = true
          this.messages = []
          this.messageCursor = null
          this.hasMoreMessages = false
        }

        this.error = null
        const res = await safeApiCall(() =>
          api.get<MessagesResponse>(`/messages/${conversationId}`, {
            params: {
              take: 10,
              ...(options?.cursor ? { cursor: options.cursor } : {}),
            },
          })
        )

        if (res.data.success) {
          this.messageCursor = res.data.nextCursor
          this.hasMoreMessages = res.data.hasMore

          if (isLoadingOlder) {
            const existingIds = new Set(this.messages.map((message) => message.id))
            const olderMessages = res.data.messages.filter(
              (message) => !existingIds.has(message.id)
            )
            this.messages = [...olderMessages, ...this.messages]
          } else {
            this.messages = res.data.messages
          }

          return res.data.messages
        }
      } catch (error: any) {
        this.error = storeError(error)
        if (!options?.append) {
          this.messages = []
          this.messageCursor = null
          this.hasMoreMessages = false
        }
      } finally {
        this.isLoading = false
        this.isLoadingMoreMessages = false
      }
      return []
    },

    async fetchOlderMessages(): Promise<MessageDTO[]> {
      if (
        !this.activeConversation ||
        !this.hasMoreMessages ||
        !this.messageCursor ||
        this.isLoadingMoreMessages
      ) {
        return []
      }

      return this.fetchMessagesForConversation(this.activeConversation.conversationId, {
        cursor: this.messageCursor,
        append: true,
      })
    },

    async fetchConversations(): Promise<ConversationSummary[]> {
      try {
        this.isLoading = true
        this.error = null
        const res = await safeApiCall(() =>
          api.get<ConversationsResponse>('/messages/conversations')
        )
        if (res.data.success) {
          this.conversations = res.data.conversations
          this.updateUnreadFlag()
          this.initialized = true
        }
      } catch (error: any) {
        this.error = storeError(error)
        this.conversations = []
      } finally {
        this.isLoading = false // Reset loading state
      }
      return this.conversations
    },

    async markAsRead(convoId: string) {
      try {
        const res = await safeApiCall(() =>
          api.post<MarkConversationReadResponse>(`/messages/conversations/${convoId}/mark-read`)
        )
        if (res.data.success) {
          const idx = this.conversations.findIndex(
            (c) => c.conversationId === res.data.conversationId
          )
          if (idx !== -1) {
            const existing = this.conversations[idx]!
            this.conversations[idx] = { ...existing, lastReadAt: res.data.lastReadAt }
            this.updateUnreadFlag()
          }
        }
      } catch (error: any) {
        console.error('Failed to mark conversation as read:', error)
      }
    },

    async sendMessage(
      recipientProfileId: string,
      content: string
    ): Promise<StoreResponse<MessageDTO> | StoreError> {
      try {
        this.isSending = true
        this.error = null
        const res = await safeApiCall(() =>
          api.post<SendMessageResponse>('/messages/message', {
            profileId: recipientProfileId,
            content,
          } satisfies SendMessagePayload)
        )
        return this.handleSendResponse(res)
      } catch (error: any) {
        this.error = storeError(error)
        return this.error
      } finally {
        this.isSending = false
      }
    },

    async sendVoiceMessage(
      recipientProfileId: string,
      audioBlob: Blob,
      duration: number
    ): Promise<StoreResponse<MessageDTO> | StoreError> {
      try {
        this.isSending = true
        this.error = null

        // Create FormData for multipart upload
        // Use the blob's actual MIME type to derive the extension (e.g. audio/mp4 → .mp4)
        const ext = audioBlob.type.split('/')[1]?.split(';')[0] ?? 'webm'
        const formData = new FormData()
        formData.append('file', audioBlob, `voice-message.${ext}`)
        formData.append('profileId', recipientProfileId)
        formData.append('content', '') // Empty content for voice messages
        formData.append('duration', duration.toString())

        const res = await safeApiCall(() =>
          api.post<SendMessageResponse>('/messages/voice', formData)
        )
        return this.handleSendResponse(res)
      } catch (error: any) {
        this.error = storeError(error)
        return this.error
      } finally {
        this.isSending = false
      }
    },

    async setActiveConversation(convo: ConversationSummary | null) {
      this.activeConversation = convo
      if (this.activeConversation) {
        await this.fetchMessagesForConversation(this.activeConversation.conversationId)
      }
    },

    resetActiveConversation() {
      this.activeConversation = null
    },

    async handleProfileBlocked() {
      await this.fetchConversations()
    },

    async setActiveConversationById(conversationId: string) {
      if (!this.initialized) {
        await this.fetchConversations()
      }
      const convo = this.conversations.find((c) => c.conversationId === conversationId)
      if (convo) {
        await this.setActiveConversation(convo)
      } else {
        this.activeConversation = null
        this.messages = []
      }
    },

    async initialize() {
      if (!this.initialized) {
        await this.fetchConversations()
      }
      bus.on('ws:new_message', this.handleIncomingMessage)
      bus.on('profile:blocked', this.handleProfileBlocked)
    },

    teardown() {
      bus.off('ws:new_message', this.handleIncomingMessage)
      bus.off('profile:blocked', this.handleProfileBlocked)
      this.$reset()
    },
  },
})

bus.on('auth:logout', () => {
  useMessageStore().teardown()
})
