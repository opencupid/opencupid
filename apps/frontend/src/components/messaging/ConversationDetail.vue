<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'

import { useProfileStore } from '@/store/profileStore'
import { useMessageStore } from '@/store/messageStore'

import { type PublicProfile } from '@zod/profile/profile.dto'
import { type ConversationSummary } from '@zod/messaging/messaging.dto'

import SendMessage from './SendMessage.vue'
import MessageList from './MessageList.vue'
import MessagingNav from './MessagingNav.vue'

const profileStore = useProfileStore()
const messageStore = useMessageStore()

const props = defineProps<{
  conversation: ConversationSummary | null
}>()

const emit = defineEmits<{
  (e: 'deselect:convo'): void
  (e: 'profile:select', profile: PublicProfile): void
}>()

const showModal = ref(false)
const isLoading = ref(false)
const conversationPartner = ref<PublicProfile | null>(null)

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
    :ok-title="t('messaging.block_user_ok', { name: conversationPartner ? conversationPartner.publicName : '' })"
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
