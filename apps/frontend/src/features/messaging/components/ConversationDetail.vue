<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

import { type PublicProfileWithContext } from '@zod/profile/profile.dto'
import { type ConversationSummary } from '@zod/messaging/messaging.dto'

import { useMessageStore } from '@/features/messaging/stores/messageStore'
import { usePublicProfileStore } from '@/features/publicprofile/stores/publicProfileStore'

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
  (e: 'profile:select', profile: PublicProfileWithContext): void
}>()

const showModal = ref(false)
const isLoading = ref(false)
const conversationPartner = ref<PublicProfileWithContext | null>(null)

const { t } = useI18n()

watchEffect(async () => {
  if (props.conversation) {
    isLoading.value = true
    const res = await profileStore.getPublicProfile(props.conversation.partnerProfile.id)
    if (res.success) conversationPartner.value = res.data ?? null
    else conversationPartner.value = null
    isLoading.value = false
  } else {
    conversationPartner.value = null
  }
})
</script>

<template>
  <MessagingNav
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

  <div class="d-flex align-items-center w-100 py-2 px-2">
    <SendMessage
      v-if="conversationPartner && conversation"
      :recipientProfile="conversationPartner"
      :conversationId="conversation.conversationId"
    />
  </div>

  <BModal
    v-model="showModal"
    title=""
    size="md"
    :backdrop="'static'"
    centered
    button-size="sm"
    :focus="false"
    :no-close-on-backdrop="true"
    :no-header="true"
    :ok-title="
      t('messaging.block_user_ok', {
        name: conversationPartner ? conversationPartner.publicName : '',
      })
    "
    :cancel-title="t('messaging.nevermind')"
    initial-animation
    body-class="d-flex flex-row align-items-center justify-content-center overflow-hidden"
    :keyboard="false"
  >
    <div class="w-100">
      <h4>{{ t('messaging.block_report_unmatch') }}</h4>
    </div>
  </BModal>
</template>
