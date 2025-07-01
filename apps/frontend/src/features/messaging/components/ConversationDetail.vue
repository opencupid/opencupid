<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

import { type PublicProfileWithContext } from '@zod/profile/profile.dto'
import { type ConversationSummary } from '@zod/messaging/messaging.dto'

import { useMessageStore } from '@/features/messaging/stores/messageStore'
import { usePublicProfileStore } from '@/features/publicprofile/stores/publicProfileStore'
import BlockProfileDialog from '@/features/publicprofile/components/BlockProfileDialog.vue'

import SendMessage from './SendMessageForm.vue'
import MessageList from './MessageList.vue'
import MessagingNav from './MessagingNav.vue'

const profileStore = usePublicProfileStore()
const messageStore = useMessageStore()

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
</script>

<template>
  <div class="convo-detail shadow-lg h-100 position-relative d-flex flex-column">
    <MessagingNav
      class="messaging-nav w-100"
      v-if="conversationPartner"
      :recipient="conversationPartner"
      @deselect:convo="emit('deselect:convo')"
      @profile:select="emit('profile:select', conversationPartner)"
      @modal:open="showModal = true"
    />

    <div class="flex-grow-1 overflow-hidden d-flex flex-column">
      <!-- <BPlaceholderWrapper :loading="loading" class="mb-3">
      <template #loading>
        <div class="h-10-0 bg-danger"></div>
        <BPlaceholderCard
          class="w-100 h-100"
          :loading="loading"
          :text="t('messaging.loading_conversation')"
          :text-size="'sm'"/>
        </template> 
    </BPlaceholderWrapper> -->
      <MessageList :messages="messageStore.messages" />
    </div>

    <div class="send-message-wrapper d-flex flex-column align-items-center w-100 py-3 px-2">
      <SendMessage
        v-if="conversationPartner && conversation"
        :recipientProfile="conversationPartner"
        :conversationId="conversation.conversationId"
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
  /* bottom: 4rem; */
  /* margin-bottom: 1rem; */
  background-color: var(--bs-body-bg);
  /* border-top: 1px solid var(--bs-border-color); */
}
</style>
