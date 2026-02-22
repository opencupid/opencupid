<script setup lang="ts">
import { ref, computed, watchEffect } from 'vue'

import { type PublicProfileWithContext } from '@zod/profile/profile.dto'
import { type ConversationSummary } from '@zod/messaging/messaging.dto'

import { useMessageStore } from '@/features/messaging/stores/messageStore'
import { usePublicProfileStore } from '@/features/publicprofile/stores/publicProfileStore'
import { useCallStore } from '@/features/videocall/stores/callStore'
import BlockProfileDialog from '@/features/publicprofile/components/BlockProfileDialog.vue'

import SendMessage from './SendMessageForm.vue'
import MessageList from './MessageList.vue'
import MessagingNav from './MessagingNav.vue'
import * as callsApi from '@/features/videocall/api/calls.api'

const profileStore = usePublicProfileStore()
const messageStore = useMessageStore()
const callStore = useCallStore()

const props = defineProps<{
  conversation: ConversationSummary | null
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'deselect:convo'): void
  (e: 'updated'): void
  (e: 'profile:select', profile: PublicProfileWithContext): void
}>()

const showModal = ref(false)
const conversationPartner = ref<PublicProfileWithContext | null>(null)

const canCall = computed(() => {
  if (!props.conversation) return false
  return props.conversation.canReply && props.conversation.isCallable
})

const myIsCallable = computed(() => {
  return props.conversation?.myIsCallable ?? true
})

watchEffect(async () => {
  if (props.conversation) {
    const res = await profileStore.getPublicProfile(props.conversation.partnerProfile.id)
    if (res.success) conversationPartner.value = res.data ?? null
    else conversationPartner.value = null
  } else {
    conversationPartner.value = null
  }
})

const handleBlockProfile = async () => {
  if (!conversationPartner.value) return
  const ok = await profileStore.blockProfile(conversationPartner.value.id)
  showModal.value = false
  if (ok) {
    emit('deselect:convo')
    emit('updated')
  }
}

function handleStartCall() {
  if (!props.conversation) return
  callStore.initiateCall(props.conversation.conversationId)
}

async function handleToggleCallable(event: Event) {
  if (!props.conversation) return
  const checkbox = event.target as HTMLInputElement
  const isCallable = checkbox.checked
  try {
    await callsApi.updateCallable(props.conversation.conversationId, isCallable)
  } catch {
    checkbox.checked = !isCallable
  }
}
</script>

<template>
  <div class="convo-detail shadow-lg h-100 position-relative d-flex flex-column">
    <MessagingNav
      class="messaging-nav w-100"
      v-if="conversationPartner"
      :recipient="conversationPartner"
      :allowCalls="myIsCallable"
      @deselect:convo="emit('deselect:convo')"
      @profile:select="emit('profile:select', conversationPartner)"
      @block:open="showModal = true"
      @callable:toggle="handleToggleCallable"
    />

    <div class="flex-grow-1 overflow-hidden d-flex flex-column">
      <MessageList
        :messages="messageStore.messages"
        :has-more="messageStore.hasMoreMessages"
        :is-loading-more="messageStore.isLoadingMoreMessages"
        @load-older="messageStore.fetchOlderMessages"
      />
    </div>

    <div class="send-message-wrapper d-flex flex-column align-items-center w-100 py-3 px-2">
      <SendMessage
        v-if="conversationPartner && conversation"
        :recipientProfile="conversationPartner"
        :conversationId="conversation.conversationId"
        :canCall="canCall"
        @call:start="handleStartCall"
      />
    </div>

    <BlockProfileDialog
      v-if="conversationPartner"
      :profile="conversationPartner"
      v-model="showModal"
      :loading="profileStore.isLoading"
      @block="handleBlockProfile"
    />
  </div>
</template>

<style scoped>
.convo-detail {
}
.messaging-nav {
  background-color: var(--bs-body-bg);
}
.send-message-wrapper {
  background-color: transparent;
}
</style>
