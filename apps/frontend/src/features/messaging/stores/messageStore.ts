import { defineStore, type Store } from 'pinia'

import { api, safeApiCall } from '@/lib/api'
import { bus } from '@/lib/bus'

import type {
  ConversationSummary,
  MessageDTO,
  MessageInConversation,
  SendMessagePayload
} from '@zod/messaging/messaging.dto'
import type {
  MessagesResponse,
  ConversationsResponse,
  ConversationResponse,
  SendMessageResponse,
} from '@zod/apiResponse.dto'
import { storeError, type StoreError, type StoreResponse, storeSuccess } from '@/store/helpers'


type MessageStoreState = {
  conversations: ConversationSummary[],
  messages: MessageDTO[],
  activeConversation: ConversationSummary | null,
  hasUnreadMessages: boolean,
  hasMoreMessages: boolean,
  isLoadingOlder: boolean,
  isSending: boolean,
  isLoading: boolean,
  error: StoreError | null,
}

export const useMessageStore = defineStore('message', {
  state: (): MessageStoreState => ({
    conversations: [] as ConversationSummary[],
    messages: [] as MessageDTO[],
    activeConversation: null as ConversationSummary | null,
    hasUnreadMessages: false,
    hasMoreMessages: false,
    isLoadingOlder: false,
    isSending: false,
    isLoading: false,
    error: null,
  }),

  actions: {

    async handleIncomingMessage(message: MessageDTO) {

      // Update conversation summary (and bump it to top)
      const convoIndex = this.conversations.findIndex(c => c.conversationId === message.conversationId)

      if (convoIndex === -1) {
        await this.fetchConversations() // Fetch conversations if not found
      } else {
        const convo = this.conversations.splice(convoIndex, 1)[0]!
        // Update last message and unread count
        // When we receive a message, it means the conversation is now in ACCEPTED state
        // and we can reply (fixes bug where both "My turn" and "Their turn" badges show)
        const updatedConvo: ConversationSummary = {
          ...convo,
          lastMessage: message,
          canReply: true,
        }
        this.conversations.unshift(updatedConvo)
        this.updateUnreadFlag()
      }
      // If this is the active conversation, append to visible messages
      if (this.activeConversation?.conversationId === message.conversationId) {
        // Check if message already exists to prevent duplicates
        if (!this.messages.find(m => m.id === message.id)) {
          this.messages.push(message)
        }
      } else {
        // Emit notification for new message
        // this occurs here instead of the AppNotifier.vue handling it directly
        // because we only want to send popup notifications 
        // *if* the conversation it's in is not already open
        // (this is to avoid popup spam when the user is in the messaging view)
        bus.emit('notification:new_message', message)
      }
    },

    // Update a conversation in the list
    updateConvo(convo: ConversationSummary) {
      const index = this.conversations.findIndex(c => c.conversationId === convo.conversationId)
      if (index !== -1) {
        this.conversations[index] = convo
      } else {
        this.conversations.unshift(convo)
      }
    },

    // Check last read timestamp against last message and update unread flag
    updateUnreadFlag() {
      this.hasUnreadMessages = this.conversations
        .filter(c => c.lastMessage?.isMine !== true)
        .some(c => {
          const lastMessage = c.lastMessage?.createdAt || new Date(0) // Fallback to epoch if no last message
          return c.lastReadAt ? c.lastReadAt < lastMessage : true
        })
    },

    async fetchMessagesForConversation(conversationId: string): Promise<MessageInConversation[]> {
      try {
        this.isLoading = true
        this.error = null
        this.hasMoreMessages = false
        const res = await safeApiCall(() => api.get<MessagesResponse>(`/messages/${conversationId}`))
        if (res.data.success) {
          this.messages = res.data.messages
          this.hasMoreMessages = res.data.hasMore
          return res.data.messages
        }
      } catch (error: any) {
        this.error = storeError(error)
        this.messages = []
      } finally {
        this.isLoading = false
      }
      return []
    },

    async fetchOlderMessages(): Promise<MessageDTO[]> {
      if (!this.activeConversation || !this.hasMoreMessages || this.isLoadingOlder) return []
      const oldestMessage = this.messages[0]
      if (!oldestMessage) return []

      try {
        this.isLoadingOlder = true
        const res = await safeApiCall(() =>
          api.get<MessagesResponse>(
            `/messages/${this.activeConversation!.conversationId}`,
            { params: { before: new Date(oldestMessage.createdAt as unknown as string).toISOString() } }
          )
        )
        if (res.data.success) {
          this.messages = [...res.data.messages, ...this.messages]
          this.hasMoreMessages = res.data.hasMore
          return res.data.messages
        }
      } catch (error: any) {
        console.error('Failed to fetch older messages:', error)
      } finally {
        this.isLoadingOlder = false
      }
      return []
    },

    async fetchConversations(): Promise<ConversationSummary[]> {
      try {
        this.isLoading = true
        this.error = null
        const res = await safeApiCall(() => api.get<ConversationsResponse>('/messages/conversations'))
        if (res.data.success) {
          this.conversations = res.data.conversations
          this.updateUnreadFlag()
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
        const updateConvo = await safeApiCall(() => api.post<ConversationResponse>(`/messages/conversations/${convoId}/mark-read`))
        if (updateConvo.data.success) {
          const updatedConvo: ConversationSummary = updateConvo.data.conversation
          this.updateConvo(updatedConvo)
          this.updateUnreadFlag()
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
        const payload: SendMessagePayload = {
          profileId: recipientProfileId,
          content,
        }
        this.isSending = true
        this.error = null
        const res = await safeApiCall(() => api.post<SendMessageResponse>(`/messages/message`, payload))
        const { conversation, message } = res.data
        if (!message)
          return storeError(new Error('Message not sent'))
        // Move conversation to top, remove any old instance
        this.conversations = [
          conversation,
          ...this.conversations.filter(c => c.conversationId !== conversation.conversationId),
        ]
        if (this.activeConversation?.conversationId === conversation.conversationId) {
          // Check if message already exists to prevent duplicates
          if (!this.messages.find(m => m.id === message.id)) {
            this.messages.push(message)
          }
        }
        return storeSuccess(message)
      } catch (error: any) {
        this.error = storeError(error)
        return this.error
      } finally {
        this.isSending = false // Reset sending state
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

        const { conversation, message } = res.data
        if (!message)
          return storeError(new Error('Voice message not sent'))

        // Move conversation to top, remove any old instance
        this.conversations = [
          conversation,
          ...this.conversations.filter(c => c.conversationId !== conversation.conversationId),
        ]
        if (this.activeConversation?.conversationId === conversation.conversationId) {
          this.messages.push(message)
        }
        return storeSuccess(message)
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

    async setActiveConversationById(conversationId: string) {
      const convo = this.conversations.find(c => c.conversationId === conversationId)
      if (convo) {
        await this.setActiveConversation(convo)
      } else {
        console.warn('Conversation not found:', conversationId)
        this.activeConversation = null
        this.messages = []
      }
    },


    async initialize() {
      await this.fetchConversations()
      bus.on('ws:new_message', this.handleIncomingMessage)
    },

    teardown() {
      bus.off('ws:new_message', this.handleIncomingMessage)
      this.conversations = []
      this.messages = []
      this.activeConversation = null
      this.hasUnreadMessages = false
      this.hasMoreMessages = false
      this.isLoadingOlder = false
      this.isSending = false
      this.isLoading = false
      this.error = null
    }

  },
})

bus.on('auth:logout', () => {
  useMessageStore().teardown()
})
