import { defineStore } from 'pinia'

import { api, safeApiCall } from '@/lib/api'
import { bus } from '@/lib/bus'

import type {
  ConversationOrDraft,
  ConversationSummary,
  EditMessagePayload,
  MessageDTO,
  MessageInConversation,
  SendMessagePayload,
} from '@zod/messaging/messaging.dto'
import type {
  MessagesResponse,
  ConversationByProfileResponse,
  ConversationsResponse,
  ConversationResponse,
  MarkConversationReadResponse,
  SendMessageResponse,
  EditMessageResponse,
} from '@zod/apiResponse.dto'
import { storeError, type StoreError, type StoreResponse, storeSuccess } from '@/store/helpers'

type MessageStoreState = {
  conversations: ConversationSummary[]
  messages: MessageDTO[]
  activeConversation: ConversationSummary | null
  hasUnreadMessages: boolean
  // Bumped whenever an incoming message makes the inbox unread, so a server
  // snapshot requested before that message is not allowed to clear the flag.
  unreadRevision: number
  suppressMessageNotifications: boolean
  isSending: boolean
  initialized: boolean
  isLoading: boolean
  error: StoreError | null
  messageCursor: string | null
  hasMoreMessages: boolean
  isLoadingMoreMessages: boolean
  conversationCursor: string | null
  hasMoreConversations: boolean
  isLoadingMoreConversations: boolean
  // Message whose text is loaded into the composer for editing.
  editingMessageId: string | null
}

// Mirrors the backend edit rule: own text message with no attachments.
function isEditableMessage(message: MessageDTO): boolean {
  return (
    !!message.isMine &&
    message.messageType === 'text/plain' &&
    !message.attachment &&
    message.images.length === 0
  )
}

export const useMessageStore = defineStore('message', {
  state: (): MessageStoreState => ({
    conversations: [] as ConversationSummary[],
    messages: [] as MessageDTO[],
    activeConversation: null as ConversationSummary | null,
    hasUnreadMessages: false,
    unreadRevision: 0,
    initialized: false,
    suppressMessageNotifications: false,
    isSending: false,
    isLoading: false,
    error: null,
    messageCursor: null,
    hasMoreMessages: false,
    isLoadingMoreMessages: false,
    conversationCursor: null,
    hasMoreConversations: false,
    isLoadingMoreConversations: false,
    editingMessageId: null,
  }),

  getters: {
    // Only the latest message of the open conversation can be edited, and only
    // until anyone writes after it.
    editableMessage(state): MessageDTO | null {
      const last = state.messages[state.messages.length - 1]
      return last && isEditableMessage(last) ? last : null
    },
    // Null as soon as the message stops being editable (e.g. a reply arrived).
    editingMessage(): MessageDTO | null {
      const editable = this.editableMessage
      return editable && editable.id === this.editingMessageId ? editable : null
    },
  },

  actions: {
    async handleIncomingMessage(message: MessageDTO) {
      // Update conversation summary (and bump it to top)
      const known = this.conversations.find((c) => c.conversationId === message.conversationId)
      // When we receive a message, it means the conversation is now in ACCEPTED state
      // and we can reply (fixes bug where both "My turn" and "Their turn" badges show).
      // A conversation outside the loaded pages is fetched on its own, so the
      // pages already scrolled through stay in place.
      const convo: ConversationSummary | null = known
        ? { ...known, lastMessage: message, canReply: true }
        : await this.fetchConversation(message.conversationId)
      if (convo) {
        this.bumpConversation(convo)
        // Missed-call notices are broadcast to their sender as well.
        if (message.senderId !== convo.profileId) {
          this.hasUnreadMessages = true
          this.unreadRevision++
        }
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

    // Applies an edited message in place. Edits don't bump the conversation:
    // they are not new activity.
    handleMessageUpdated(message: MessageDTO) {
      const index = this.messages.findIndex((m) => m.id === message.id)
      if (index !== -1) {
        // Keep the viewer-relative isMine of the loaded copy: broadcasts omit it.
        this.messages[index] = { ...message, isMine: this.messages[index]!.isMine }
      }
      // The edited message is by definition the latest one, i.e. the preview.
      const isPreviewOf = (c: ConversationSummary) =>
        c.conversationId === message.conversationId &&
        !!c.lastMessage &&
        new Date(c.lastMessage.createdAt).getTime() === new Date(message.createdAt).getTime()
      this.conversations = this.conversations.map((c) =>
        isPreviewOf(c) ? { ...c, lastMessage: { ...c.lastMessage!, content: message.content } } : c
      )
    },

    startEditing() {
      this.editingMessageId = this.editableMessage?.id ?? null
    },

    cancelEditing() {
      this.editingMessageId = null
    },

    async editMessage(messageId: string, content: string): Promise<StoreResponse<MessageDTO>> {
      try {
        this.isSending = true
        this.error = null
        const res = await safeApiCall(() =>
          api.patch<EditMessageResponse>(`/messages/message/${messageId}`, {
            content,
          } satisfies EditMessagePayload)
        )
        this.handleMessageUpdated(res.data.message)
        return storeSuccess(res.data.message)
      } catch (error: any) {
        this.error = storeError(error)
        return this.error
      } finally {
        this.isSending = false
      }
    },

    bumpConversation(conversation: ConversationSummary) {
      this.conversations = [
        conversation,
        ...this.conversations.filter((c) => c.conversationId !== conversation.conversationId),
      ]
    },

    handleSendResponse(res: {
      data: { conversation: ConversationSummary; message: MessageDTO | null }
    }): StoreResponse<MessageDTO> | StoreError {
      const { conversation, message } = res.data
      if (!message) return storeError(new Error('Message not sent'))
      this.bumpConversation(conversation)
      if (this.activeConversation?.conversationId === conversation.conversationId) {
        this.appendMessageIfNew(message)
      }
      return storeSuccess(message)
    },

    // Update a conversation in the list. One outside the loaded pages is left
    // out: it will arrive in its sorted position when its page is fetched.
    updateConvo(convo: ConversationSummary) {
      const index = this.conversations.findIndex((c) => c.conversationId === convo.conversationId)
      if (index !== -1) {
        this.conversations[index] = convo
      }
    },

    // Applies the inbox-wide unread flag from a response whose request was sent
    // at `revision`.
    applyServerUnread(hasUnread: boolean, revision: number) {
      if (revision === this.unreadRevision) this.hasUnreadMessages = hasUnread
    },

    async fetchMessages(
      conversationId: string,
      options?: { take?: number; cursor?: string }
    ): Promise<StoreResponse<{ messages: MessageInConversation[] }>> {
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
    ): Promise<MessageInConversation[]> {
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

    async fetchOlderMessages(): Promise<MessageInConversation[]> {
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

    // Resolve the conversation between the viewer and a partner profile.
    // Returns either the persisted ConversationSummary or a synthesized
    // ConversationDraftSummary for matched pairs that haven't messaged yet.
    // Drafts are *not* added to `this.conversations` — they only enter the list
    // after the first message persists the conversation server-side.
    async resolveConversationByProfile(
      profileId: string
    ): Promise<StoreResponse<ConversationOrDraft>> {
      try {
        const res = await safeApiCall(() =>
          api.get<ConversationByProfileResponse>(`/messages/conversations/by-profile/${profileId}`)
        )
        if (!res.data.success) return storeError(res.data)
        return storeSuccess(res.data.conversation)
      } catch (error) {
        return storeError(error)
      }
    },

    // Fetches the first page, replacing whatever was loaded before.
    async fetchConversations(): Promise<ConversationSummary[]> {
      try {
        this.isLoading = true
        this.error = null
        const unreadRevision = this.unreadRevision
        const res = await safeApiCall(() =>
          api.get<ConversationsResponse>('/messages/conversations')
        )
        if (res.data.success) {
          this.conversations = res.data.conversations
          this.conversationCursor = res.data.nextCursor
          this.hasMoreConversations = res.data.hasMore
          this.applyServerUnread(res.data.hasUnread, unreadRevision)
          this.initialized = true
        }
      } catch (error: any) {
        this.error = storeError(error)
        this.conversations = []
        this.conversationCursor = null
        this.hasMoreConversations = false
      } finally {
        this.isLoading = false // Reset loading state
      }
      return this.conversations
    },

    async fetchMoreConversations(): Promise<void> {
      if (
        !this.hasMoreConversations ||
        !this.conversationCursor ||
        this.isLoading ||
        this.isLoadingMoreConversations
      ) {
        return
      }
      const cursor = this.conversationCursor
      const unreadRevision = this.unreadRevision
      try {
        this.isLoadingMoreConversations = true
        this.error = null
        const res = await safeApiCall(() =>
          api.get<ConversationsResponse>('/messages/conversations', { params: { cursor } })
        )
        // The list was refreshed or reset while this page was in flight: the
        // page no longer continues from where the list now ends.
        if (cursor !== this.conversationCursor) return
        if (res.data.success) {
          // A conversation bumped to the top since the previous page was
          // loaded can show up again further down.
          const loadedIds = new Set(this.conversations.map((c) => c.conversationId))
          this.conversations.push(
            ...res.data.conversations.filter((c) => !loadedIds.has(c.conversationId))
          )
          this.conversationCursor = res.data.nextCursor
          this.hasMoreConversations = res.data.hasMore
          this.applyServerUnread(res.data.hasUnread, unreadRevision)
        }
      } catch (error: any) {
        if (cursor === this.conversationCursor) this.error = storeError(error)
      } finally {
        this.isLoadingMoreConversations = false
      }
    },

    async fetchConversation(conversationId: string): Promise<ConversationSummary | null> {
      try {
        const res = await safeApiCall(() =>
          api.get<ConversationResponse>(`/messages/conversations/${conversationId}`)
        )
        return res.data.success ? res.data.conversation : null
      } catch (error: any) {
        this.error = storeError(error)
        return null
      }
    },

    async markAsRead(convoId: string) {
      const unreadRevision = this.unreadRevision
      try {
        const updateConvo = await safeApiCall(() =>
          api.post<MarkConversationReadResponse>(`/messages/conversations/${convoId}/mark-read`)
        )
        if (updateConvo.data.success) {
          const updatedConvo: ConversationSummary = updateConvo.data.conversation
          this.updateConvo(updatedConvo)
          this.applyServerUnread(updateConvo.data.hasUnread, unreadRevision)
        }
      } catch (error: any) {
        console.error('Failed to mark conversation as read:', error)
      }
    },

    async sendMessage(
      recipientProfileId: string,
      content: string,
      imageIds?: string[]
    ): Promise<StoreResponse<MessageDTO> | StoreError> {
      try {
        this.isSending = true
        this.error = null
        const res = await safeApiCall(() =>
          api.post<SendMessageResponse>('/messages/message', {
            profileId: recipientProfileId,
            content,
            ...(imageIds && imageIds.length > 0 ? { imageIds } : {}),
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
      this.editingMessageId = null
      if (this.activeConversation) {
        await this.fetchMessagesForConversation(this.activeConversation.conversationId)
      }
    },

    resetActiveConversation() {
      this.activeConversation = null
      this.messages = []
      this.messageCursor = null
      this.hasMoreMessages = false
      this.isLoadingMoreMessages = false
      this.editingMessageId = null
    },

    async handleProfileBlocked() {
      await this.fetchConversations()
    },

    async setActiveConversationById(conversationId: string) {
      if (!this.initialized) {
        await this.fetchConversations()
      }
      // The list only holds the pages loaded so far; a deep link can point past them.
      const convo =
        this.conversations.find((c) => c.conversationId === conversationId) ??
        (await this.fetchConversation(conversationId))
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
      bus.on('ws:message_updated', this.handleMessageUpdated)
      bus.on('profile:blocked', this.handleProfileBlocked)
    },

    teardown() {
      bus.off('ws:new_message', this.handleIncomingMessage)
      bus.off('ws:message_updated', this.handleMessageUpdated)
      bus.off('profile:blocked', this.handleProfileBlocked)
      this.$reset()
    },
  },
})

bus.on('auth:logout', () => {
  useMessageStore().teardown()
})
