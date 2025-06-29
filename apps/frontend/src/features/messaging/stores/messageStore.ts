import { defineStore } from 'pinia'

import { api } from '@/lib/api'
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
} from '@shared/dto/apiResponse.dto'
import { storeError, type StoreError, type StoreResponse, storeSuccess } from '@/store/helpers'


type MessageStoreState = {
  profileId: string | null,
  conversations: ConversationSummary[],
  messages: MessageDTO[],
  activeConversation: ConversationSummary | null,
  hasUnreadMessages: boolean,
  isSending: boolean,
}

export const useMessageStore = defineStore('message', {
  state: (): MessageStoreState => ({
    profileId: null as string | null,
    conversations: [] as ConversationSummary[],
    messages: [] as MessageDTO[],
    activeConversation: null as ConversationSummary | null,
    hasUnreadMessages: false,
    isSending: false,
  }),

  actions: {

    async handleIncomingMessage(message: MessageDTO) {
      // console.log('New message received:', message, message.senderId, this.profileId)
      // Update conversation summary (and bump it to top)
      const convoIndex = this.conversations.findIndex(c => c.conversationId === message.conversationId)

      if (convoIndex === -1) {
        await this.fetchConversations() // Fetch conversations if not found
      } else {
        const [convo] = this.conversations.splice(convoIndex, 1)
        // Update last message and unread count
        const updatedConvo: ConversationSummary = {
          ...convo,
          lastMessage: message,
        }
        this.conversations.unshift(updatedConvo)
        this.updateUnreadFlag()
      }
      // If this is the active conversation, append to visible messages
      if (this.activeConversation?.conversationId === message.conversationId) {
        this.messages.push(message)
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
        console.log('Fetching messages for conversation:', conversationId)
        const res = await api.get<MessagesResponse>(`/messages/${conversationId}`)
        console.log('Fetched messages:', res.data)
        if (res.data.success) {
          this.messages = res.data.messages
          return res.data.messages
        }
      } catch (error: any) {
        console.error('Failed to fetch messages:', error)
        this.messages = []
      }
      return []
    },

    async fetchConversations(): Promise<ConversationSummary[]> {
      try {
        const res = await api.get<ConversationsResponse>('/messages/conversations')
        if (res.data.success) {
          this.conversations = res.data.conversations
          this.updateUnreadFlag()
        }
      } catch (error: any) {
        console.error('Failed to fetch conversations:', error)
        this.conversations = []
      }
      return this.conversations
    },

    async markAsRead(convoId: string) {
      try {
        const updateConvo = await api.post<ConversationResponse>(`/messages/conversations/${convoId}/mark-read`)
        if (updateConvo.data.success) {
          const updatedConvo: ConversationSummary = updateConvo.data.conversation
          this.updateConvo(updatedConvo)
          this.updateUnreadFlag()
        }
      } catch (error: any) {
        console.error('Failed to mark conversation as read:', error)
      }
      // await this.fetchUnreadCount()
    },

    // async sendOrInitiate(recipientId: string, content: string) {
    //   if (conversationId) {
    //     // If conversationId is provided, use it to send the message
    //     const sentMessage = await this.sendMessage(conversationId, content)
    //   } else {
    //     console.log('No conversationId provided, starting a new conversation...')
    //     // If no conversationId, create a new conversation and send the message
    //     await this.initiateConversation(recipientId, content)
    //   }
    // },

    async sendMessage(
      recipientProfileId: string,
      content: string
    ): Promise<StoreResponse<MessageDTO> | StoreError> {
      try {
        const payload: SendMessagePayload = { profileId: recipientProfileId, content }
        this.isSending = true // Set sending state
        const res = await api.post<SendMessageResponse>(`/messages/message`, payload)
        const { conversation, message } = res.data
        if (!message)
          return storeError(new Error('Message not sent'))
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
        return storeError(error)
      } finally {
        this.isSending = false // Reset sending state
      }
    },

    async setActiveConversation(convo: ConversationSummary | null) {
      this.activeConversation = convo
      if (this.activeConversation) {
        await this.fetchMessagesForConversation(this.activeConversation.conversationId)
      }
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


    async initialize(profileId: string) {
      this.profileId = profileId
      await this.fetchConversations()
      bus.on('ws:new_message', this.handleIncomingMessage)
    },

    teardown() {
      bus.off('ws:new_message', this.handleIncomingMessage)
      this.profileId = null
      this.conversations = []
      this.messages = []
      this.activeConversation = null
      this.hasUnreadMessages = false
    }

  },
})

bus.on('auth:login', async ({ token, userInfo }) => {
  await useMessageStore().initialize(userInfo.profileId)
})

bus.on('auth:logout', () => {
  useMessageStore().teardown()
})
